import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Keep this for the instance
import { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
import { ProductIdSchema, UpdateProductSchema } from '@/lib/schemas/product';
// Note: File deletion functionality temporarily disabled during S3 migration
import { z } from 'zod'; // Added z import
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Handler for fetching details of a specific product
export async function GET(
  request: Request, 
  { params }: { params: { productId: string } }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    // Validate Route Parameter
    const validationResult = ProductIdSchema.safeParse({ productId: paramsObj.productId });

    if (!validationResult.success) {
        console.error('Validation error (productId):', validationResult.error.flatten());
        return NextResponse.json({ error: 'Invalid Product ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { productId } = validationResult.data;

    // Fetch Product Details (including related modules)
    const { data: product, error: dbError } = await supabase
      .from('products')
      .select('*, modules(*)') // Fetch product columns and all columns from related modules
      .eq('id', productId)
      .single();

    // Handle Response & Errors
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
      console.log(`Old product image exists but deletion temporarily disabled: ${existingProduct.image_url}`);
      // TODO: Implement S3 file deletion in future phase
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
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    // Validate Route Parameter
    const paramValidation = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!paramValidation.success) {
      console.error('Validation error (productId):', paramValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid Product ID format', details: paramValidation.error.flatten() }, { status: 400 });
    }
    const { productId } = paramValidation.data;

    // Parse & Validate Request Body
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
      return NextResponse.json({ error: 'No data provided for update' }, { status: 400 });
    }

    // Handle the update using shared function
    const updatedProduct = await handleProductUpdate(productId, updateData, supabase);
    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error: any) {
    console.error(`Unexpected error in PUT /api/admin/products/[productId]:`, error);
    
    // Handle custom status codes from handleProductUpdate
    if (error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    // Handle database errors
    if (error.message) {
      return NextResponse.json({ error: 'Failed to update product', details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// Handler for partial updates
export async function PATCH(
  request: Request, 
  { params }: { params: { productId: string } }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    // Validate Route Parameter
    const paramValidation = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!paramValidation.success) {
      console.error('Validation error (productId):', paramValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid Product ID format', details: paramValidation.error.flatten() }, { status: 400 });
    }
    const { productId } = paramValidation.data;

    // Parse & Validate Request Body for partial update
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const bodyValidation = UpdateProductSchema.partial().safeParse(body);
    if (!bodyValidation.success) {
      console.error('Validation error (body):', bodyValidation.error.flatten());
      return NextResponse.json({ error: 'Invalid input', details: bodyValidation.error.flatten() }, { status: 400 });
    }
    const updateData = bodyValidation.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No data provided for update' }, { status: 400 });
    }

    // Handle the update using shared function
    const updatedProduct = await handleProductUpdate(productId, updateData, supabase);
    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error: any) {
    console.error(`Unexpected error in PATCH /api/admin/products/[productId]:`, error);
    
    // Handle custom status codes from handleProductUpdate
    if (error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    // Handle database errors
    if (error.message) {
      return NextResponse.json({ error: 'Failed to update product', details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// Handler for deleting a product
export async function DELETE(
  request: Request, // Keep request parameter for consistency, even if unused
  { params }: { params: { productId: string } }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const paramsObj = await params;

    // Validate Route Parameter
    const validationResult = ProductIdSchema.safeParse({ productId: paramsObj.productId });
    if (!validationResult.success) {
      console.error('Validation error (productId):', validationResult.error.flatten());
      return NextResponse.json({ error: 'Invalid Product ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { productId } = validationResult.data;

    // Check if product exists and get image_url before deletion
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, image_url')
      .eq('id', productId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: `Product with ID ${productId} not found` }, { status: 404 });
      }
      console.error('Error fetching product for deletion:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch product', details: fetchError.message }, { status: 500 });
    }

    // Note: Image file deletion temporarily disabled during S3 migration
    if (product.image_url) {
      console.log(`Product has image but deletion temporarily disabled: ${product.image_url}`);
      // TODO: Implement S3 file deletion in future phase
    }

    // Delete the product from database
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Error deleting product:', deleteError);
      return NextResponse.json({ error: 'Failed to delete product', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: `Product with ID ${productId} deleted successfully` }, { status: 200 });

  } catch (error) {
    console.error(`Unexpected error in DELETE /api/admin/products/[productId]:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 