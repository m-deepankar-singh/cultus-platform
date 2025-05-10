import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Keep this for the instance
import { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
import { ProductIdSchema, UpdateProductSchema } from '@/lib/schemas/product';
import { removeFileByUrl } from '@/lib/supabase/upload-helpers';
import { z } from 'zod'; // Added z import

// Handler for fetching details of a specific product
export async function GET(
  request: Request, 
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = await createClient(); // supabase is SupabaseClient here
    const paramsObj = await params;

    // 1. Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Forbidden: Could not verify user role' }, { status: 403 });
    }

    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and is an Admin or Staff, proceed ---

    // 2. Validate Route Parameter
    const validationResult = ProductIdSchema.safeParse({ productId: paramsObj.productId });

    if (!validationResult.success) {
        console.error('Validation error (productId):', validationResult.error.flatten());
        return NextResponse.json({ error: 'Invalid Product ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { productId } = validationResult.data;

    // 3. Fetch Product Details (including related modules)
    const { data: product, error: dbError } = await supabase
      .from('products')
      .select('*, modules(*)') // Fetch product columns and all columns from related modules
      .eq('id', productId)
      .single();

    // 4. Handle Response & Errors
    if (dbError) {
        // Handle specific "not found" error (PGRST116)
        if (dbError.code === 'PGRST116') {
            return NextResponse.json({ error: `Product with ID ${productId} not found` }, { status: 404 });
        }
        // Handle other database errors
        console.error(`Database error fetching product ${productId}:`, dbError);
        return NextResponse.json({ error: 'Failed to fetch product details', details: dbError.message }, { status: 500 });
    }

    // Should have product if dbError is null and not PGRST116
    if (!product) {
        // This case might be redundant due to PGRST116 handling, but acts as a safeguard
        return NextResponse.json({ error: `Product with ID ${productId} not found` }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error) {
    console.error(`Unexpected error in GET /api/admin/products/[productId]:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// Shared function to handle product update logic (for PUT and PATCH)
async function handleProductUpdate(
  productId: string,
  updateData: Partial<z.infer<typeof UpdateProductSchema>>,
  supabase: SupabaseClient // Changed type to SupabaseClient directly
) {
  // If image_url is being updated (either to a new URL or to null)
  if (updateData.image_url !== undefined) {
    const { data: existingProduct, error: fetchError } = await supabase // supabase is already awaited
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing product for image removal:', fetchError);
      // Decide if this should be a fatal error for the update
    }

    // If existing product had an image_url and it's different from the new one (or new one is null)
    if (existingProduct?.image_url && existingProduct.image_url !== updateData.image_url) {
      console.log(`Attempting to remove old product image: ${existingProduct.image_url}`);
      await removeFileByUrl(existingProduct.image_url).catch(err => {
        console.warn("Failed to remove old product image file:", err);
      });
    }
  }
  console.log('Updating product in DB with data:', {
    ...updateData,
    image_url: updateData.image_url === null 
      ? 'null (removing image)' 
      : typeof updateData.image_url === 'string' 
        ? `URL: ${updateData.image_url.substring(0, 30)}...` 
        : 'No change/not provided'
  });

  const { data: updatedProduct, error: dbError } = await supabase // supabase is already awaited
    .from('products')
    .update(updateData) // image_url will be part of updateData if provided
    .eq('id', productId)
    .select()
    .single();

  if (dbError) {
    throw dbError; // Let the calling handler format the response
  }
  if (!updatedProduct) {
    // This implies the product was not found or RLS prevented update
    const notFoundError = new Error(`Product with ID ${productId} not found or update failed`);
    (notFoundError as any).status = 404;
    throw notFoundError;
  }
  console.log('Product updated successfully in DB:', {
    id: updatedProduct.id,
    name: updatedProduct.name,
    image_url: updatedProduct.image_url
      ? `URL: ${updatedProduct.image_url.substring(0, 30)}...`
      : 'No image URL saved'
  });
  return updatedProduct;
}

// Handler for updating an existing product
export async function PUT(
  request: Request, 
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = await createClient(); // supabase is SupabaseClient here
    const paramsObj = await params;

    // 1. Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Forbidden: Could not verify user role' }, { status: 403 });
    }

    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and is an Admin or Staff, proceed ---

    // 2. Validate Route Parameter
    const paramValidation = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!paramValidation.success) {
      console.error('Validation error (productId):', paramValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid Product ID format', details: paramValidation.error.flatten() }, { status: 400 });
    }
    const { productId } = paramValidation.data;

    // 3. Parse & Validate Request Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const bodyValidation = UpdateProductSchema.safeParse(body);
    if (!bodyValidation.success) {
      console.error('Validation error (body):', bodyValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid input', details: bodyValidation.error.flatten() }, { status: 400 });
    }
    const updateData = bodyValidation.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    const updatedProduct = await handleProductUpdate(productId, updateData, supabase);
    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error: any) {
    console.error(`Unexpected error in PUT /api/admin/products/[productId]:`, error);
    const status = error.status || 500;
    const message = error.message || 'An unexpected error occurred';
    return NextResponse.json({ error: message, details: error.details || null }, { status });
  }
}

// Handler for partially updating an existing product (PATCH)
export async function PATCH(
  request: Request, 
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = await createClient(); // supabase is SupabaseClient here
    const paramsObj = await params;

    // 1. Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Forbidden: Could not verify user role' }, { status: 403 });
    }

    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and is an Admin or Staff, proceed ---

    // 2. Validate Route Parameter
    const paramValidation = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!paramValidation.success) {
      console.error('Validation error (productId):', paramValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid Product ID format', details: paramValidation.error.flatten() }, { status: 400 });
    }
    const { productId } = paramValidation.data;

    // 3. Parse & Validate Request Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Use the same UpdateProductSchema since it's already set up to handle partial updates
    const bodyValidation = UpdateProductSchema.safeParse(body);
    if (!bodyValidation.success) {
      console.error('Validation error (body):', bodyValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid input', details: bodyValidation.error.flatten() }, { status: 400 });
    }
    const updateData = bodyValidation.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    const updatedProduct = await handleProductUpdate(productId, updateData, supabase);
    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error: any) {
    console.error(`Unexpected error in PATCH /api/admin/products/[productId]:`, error);
    const status = error.status || 500;
    const message = error.message || 'An unexpected error occurred';
    return NextResponse.json({ error: message, details: error.details || null }, { status });
  }
}

// Handler for deleting a product
export async function DELETE(
  request: Request, // Keep request parameter for consistency, even if unused
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = await createClient();
    const paramsObj = await params;

    // 1. Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Forbidden: Could not verify user role' }, { status: 403 });
    }

    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and is an Admin or Staff, proceed ---

    // 2. Validate Route Parameter
    const paramValidation = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!paramValidation.success) {
      console.error('Validation error (productId):', paramValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid Product ID format', details: paramValidation.error.flatten() }, { status: 400 });
    }
    const { productId } = paramValidation.data;

    // Before deleting the product, fetch its image_url to remove it from storage
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching product for image removal before delete:', fetchError);
      // Potentially return an error if fetching fails, as we might not be able to clean up the image
      return NextResponse.json({ error: 'Failed to prepare product for deletion', details: fetchError.message }, { status: 500 });
    }

    // 3. Perform Deletion
    // Note: Dependencies (modules, client_product_assignments, etc.) should ideally be handled
    // by database constraints (e.g., ON DELETE CASCADE or SET NULL). 
    // This handler attempts to delete the product directly.
    // Use createAdminClient() if bypassing RLS is necessary for cleanup, but 
    // standard server client should work if RLS allows admin deletes.
    const { error: dbError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    // 4. Handle Response & Errors
    if (dbError) {
      console.error(`Database error deleting product ${productId}:`, dbError);
      // Check for foreign key constraint violation (code 23503)
      if (dbError.code === '23503') {
        return NextResponse.json({ error: 'Cannot delete product because it has related data (e.g., modules, assignments)', details: dbError.message }, { status: 409 }); // 409 Conflict
      }
      // Other database errors
      return NextResponse.json({ error: 'Failed to delete product', details: dbError.message }, { status: 500 });
    }

    // If deletion was successful and an image_url existed, remove it from storage
    if (existingProduct?.image_url) {
      console.log(`Attempting to remove product image after deletion: ${existingProduct.image_url}`);
      await removeFileByUrl(existingProduct.image_url).catch(err => {
        console.warn("Failed to remove product image file after deletion:", err);
        // Non-fatal, product is already deleted from DB.
      });
    }

    // If dbError is null, the delete was successful (or the row didn't exist, 
    // which is fine for a DELETE operation - idempotency). 
    // Supabase delete doesn't typically return data or confirm existence.
    
    return new NextResponse(null, { status: 204 }); // 204 No Content

  } catch (error) {
    console.error(`Unexpected error in DELETE /api/admin/products/[productId]:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 