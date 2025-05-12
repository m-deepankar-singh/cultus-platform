import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assuming this path is correct, adjust if needed
import { ClientSchema } from '@/lib/schemas/client'; // Import the Zod schema
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';

/**
 * GET /api/admin/clients
 * 
 * Retrieves a list of all clients
 * Accessible only by users with 'Admin' or 'Staff' roles
 * Supports pagination with page and pageSize parameters
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const { user, profile, role, error: authError } = await getUserSessionAndRole();

    if (authError || !user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow Admins and Staff to access client list
    if (!role || !["Admin", "Staff"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Get pagination and filter parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status');

    // 3. Get Supabase client
    const supabase = await createClient();

    // 4. Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // 5. First get total count with filters
    let countQuery = supabase
      .from('clients')
      .select('id', { count: 'exact', head: true });

    // Apply search filter if provided
    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }

    // Apply status filter if provided
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      countQuery = countQuery.eq('is_active', isActive);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting clients:', countError);
      return NextResponse.json({ error: "Failed to count clients" }, { status: 500 });
    }

    // 6. Fetch paginated clients
    let query = supabase
      .from('clients')
      .select('id, name, is_active, created_at, logo_url');
      
    // Apply search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // Apply status filter if provided
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      query = query.eq('is_active', isActive);
    }

    // Add ordering and pagination
    const { data: clients, error: clientsError } = await query
      .order('name', { ascending: true })
      .range(from, to);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
    }

    // 7. Return paginated client list
    const paginatedResponse = createPaginatedResponse(
      clients || [],
      count || 0,
      page,
      pageSize
    );

    return NextResponse.json(paginatedResponse);
    
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/clients:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Get user session and role (Admin check)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'Admin') {
        // Log details for non-admin attempts if desired, but keep error generic
        console.error('Forbidden POST attempt or profile issue:', profileError || 'Profile not found or not Admin');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // --- User is authenticated and is an Admin, proceed with POST ---

    // 2. Parse and validate request body
    let body;
    try {
        body = await request.json();
    } catch (parseError) {
        console.error('JSON Parsing Error:', parseError);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const validationResult = ClientSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.errors);
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }

    const clientData = validationResult.data;

    // 3. Insert client into database
    const { data: newClient, error: dbError } = await supabase
      .from('clients')
      .insert(clientData)
      .select() // Select the newly created record
      .single(); // Expecting a single record back

    if (dbError) {
      console.error('Supabase DB Error (Insert):', dbError);
      // Consider more specific error checking (e.g., unique constraint violation)
      return NextResponse.json({ error: 'Failed to create client', details: dbError.message }, { status: 500 });
    }

    // 4. Return the newly created client
    return NextResponse.json(newClient, { status: 201 }); // 201 Created status

  } catch (error) {
    console.error('POST /api/admin/clients Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 