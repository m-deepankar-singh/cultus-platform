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

// Type for RPC response
interface ClientDashboardData {
  id: string;
  name: string;
  contact_email: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_students: number;
  active_students: number;
  assigned_products: any[]; // JSON array of products
  recent_activity: any[]; // JSON array of activities
  total_count: number;
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
 * 🚀 PHASE 1: RPC consolidation (eliminates multiple separate queries)
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

    // 🚀 PHASE 1 OPTIMIZATION: Single RPC call replaces multiple queries
    // This replaces:
    // 1. clients count query
    // 2. clients data query with join to products
    // 3. client_product_assignments subquery
    // Total: 3 database calls → 1 database call (67% reduction)
    const { data: clientsData, error: rpcError } = await supabase
      .rpc('get_client_dashboard_data', {
        p_client_id: null, // Get all clients
        p_limit: pageSize,
        p_offset: from
      });

    if (rpcError) {
      console.error('Error fetching clients via RPC:', rpcError);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    // Extract total count from first record (all records have same total_count)
    const totalCount = clientsData?.[0]?.total_count || 0;

    // Apply client-side filtering if needed (until we enhance the RPC)
    let filteredClients: ClientDashboardData[] = (clientsData as ClientDashboardData[]) || [];
    
    if (search) {
      filteredClients = filteredClients.filter((client: ClientDashboardData) => 
        client.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filteredClients = filteredClients.filter((client: ClientDashboardData) => client.is_active === isActive);
    }

    // Transform the data to match expected structure
    const transformedClients = filteredClients.map((client: ClientDashboardData) => ({
      id: client.id,
      name: client.name,
      contact_email: client.contact_email,
      is_active: client.is_active,
      created_at: client.created_at,
      logo_url: client.logo_url,
      products: client.assigned_products || [],
      total_students: client.total_students,
      active_students: client.active_students,
      recent_activity: client.recent_activity
    }));

    // 7. Performance monitoring
    const responseTime = Date.now() - startTime;
    console.log(`[PHASE 1 OPTIMIZED] GET /api/admin/clients completed in ${responseTime}ms (Single RPC call)`);

    // 8. Return paginated client list with dashboard data
    const paginatedResponse = createPaginatedResponse(
      transformedClients,
      Number(totalCount),
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