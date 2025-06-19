import { NextRequest, NextResponse } from 'next/server';
import { ClientSchema } from '@/lib/schemas/client';
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';

// Types for the response data structure
interface ClientProductAssignment {
  product_id: string;
  products: {
    id: string;
    name: string;
    type: string;
    description: string | null;
  } | null;
}

interface ClientWithAssignments {
  id: string;
  name: string;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  logo_url: string | null;
  client_product_assignments?: ClientProductAssignment[];
}

/**
 * GET /api/admin/clients
 * 
 * Retrieves a list of all clients with their assigned products
 * Accessible only by users with 'Admin' or 'Staff' roles
 * Supports pagination with page and pageSize parameters
 * 
 * OPTIMIZATIONS APPLIED:
 * ✅ JWT-based authentication (eliminates 1 DB query per request)
 * ✅ Specific column selection (reduces data transfer)
 * ✅ Joined product data (prevents N+1 query problem)
 * ✅ Performance monitoring
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authentication & Authorization (OPTIMIZED - 0 DB queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase } = authResult;

    // 2. Get pagination and filter parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status');

    // 3. Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // 4. First get total count with filters
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

    // 5. Fetch paginated clients with products (OPTIMIZED - prevents N+1 queries)
    let query = supabase
      .from('clients')
      .select(SELECTORS.CLIENT.LIST_WITH_PRODUCTS); // Includes products via join
      
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

    // 6. Transform the data to extract products from the nested structure
    const transformedClients = (clients as ClientWithAssignments[])?.map((client: ClientWithAssignments) => ({
      ...client,
      products: client.client_product_assignments?.map((assignment: ClientProductAssignment) => assignment.products).filter(Boolean) || []
    })) || [];

    // 7. Performance monitoring
    const responseTime = Date.now() - startTime;
    console.log(`[OPTIMIZED] GET /api/admin/clients completed in ${responseTime}ms (JWT auth + joined products - N+1 prevented)`);

    // 8. Return paginated client list with products
    const paginatedResponse = createPaginatedResponse(
      transformedClients,
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

/**
 * POST /api/admin/clients
 * 
 * Creates a new client
 * Accessible only by users with 'Admin' role
 * 
 * OPTIMIZATIONS APPLIED:
 * ✅ JWT-based authentication (eliminates 1 DB query per request)
 * ✅ Specific column selection for response
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // 1. Authentication & Authorization (OPTIMIZED - 0 DB queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase } = authResult;
    
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

    // 3. Insert client into database (OPTIMIZED - specific column selection)
    const { data: newClient, error: dbError } = await supabase
      .from('clients')
      .insert(clientData)
      .select(SELECTORS.CLIENT.DETAIL) // Instead of select()
      .single();

    if (dbError) {
      console.error('Supabase DB Error (Insert):', dbError);
      return NextResponse.json({ error: 'Failed to create client', details: dbError.message }, { status: 500 });
    }

    // 4. Performance monitoring
    const responseTime = Date.now() - startTime;
    console.log(`[OPTIMIZED] POST /api/admin/clients completed in ${responseTime}ms (JWT auth)`);

    // 5. Return the newly created client
    return NextResponse.json(newClient, { status: 201 });

  } catch (error) {
    console.error('POST /api/admin/clients Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 