import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Adjust path if needed
import { ProductSchema } from '@/lib/schemas/product'; // Import ProductSchema
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user's profile to check their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
        console.error('Error fetching user profile or profile not found:', profileError);
        // If the user is authenticated but has no profile, treat as unauthorized or error
        return NextResponse.json({ error: 'Forbidden: Could not verify user role' }, { status: 403 });
    }

    // Authorize based on role - allow Admin and Staff
    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
        console.warn(`User ${user.id} with role ${profile.role} attempted to access products route.`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and is an Admin or Staff, proceed ---

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    // 3. Build Supabase Query for Count
    let countQuery = supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    // Apply search filter to count query
    if (searchQuery) {
      countQuery = countQuery.ilike('name', `%${searchQuery}%`);
    }

    // Execute count query
    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Database error counting products:', countError);
      return NextResponse.json({ error: 'Failed to count products', details: countError.message }, { status: 500 });
    }

    // If no products found, return empty response
    if (count === 0) {
      return NextResponse.json(createPaginatedResponse([], 0, page, pageSize), { status: 200 });
    }

    // 4. Build Supabase Query for Data
    let dataQuery = supabase
      .from('products')
      .select('*');

    // Apply search filter to data query
    if (searchQuery) {
      dataQuery = dataQuery.ilike('name', `%${searchQuery}%`);
    }

    // Calculate pagination range
    const { from, to } = calculatePaginationRange(page, pageSize);

    // Execute data query with pagination
    const { data: products, error: dataError } = await dataQuery
      .order('name', { ascending: true })
      .range(from, to);

    if (dataError) {
      console.error('Database error fetching products:', dataError);
      return NextResponse.json({ error: 'Failed to fetch products', details: dataError.message }, { status: 500 });
    }

    // 5. Return paginated response
    return NextResponse.json(createPaginatedResponse(products || [], count || 0, page, pageSize), { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/products:', error);
    // Generic error for unexpected issues
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// Handler for creating a new product
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authentication & Authorization (Allow Admin and Staff)
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

    // 2. Parse & Validate Request Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const validationResult = ProductSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.flatten());
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }

    const productData = validationResult.data;

    console.log('Attempting to create product with data:', {
      ...productData,
      image_url: productData.image_url || 'No image_url provided'
    });

    // 3. Insert Product into Database
    const { data: newProduct, error: dbError } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single(); // Assuming you want to return the created product

    if (dbError) {
      console.error('Database error creating product:', dbError);
      // Consider more specific error codes based on dbError.code if needed
      return NextResponse.json({ error: 'Failed to create product', details: dbError.message }, { status: 500 });
    }

    // 4. Handle Response
    if (!newProduct) { // Should not happen if dbError is null, but good practice to check
        console.error('Product creation failed silently after insert.');
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    console.log('Product created successfully:', {
      id: newProduct.id,
      name: newProduct.name,
      image_url: newProduct.image_url || 'No image_url saved'
    });

    return NextResponse.json(newProduct, { status: 201 }); // 201 Created status

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/products:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 