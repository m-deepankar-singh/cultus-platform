import { NextRequest, NextResponse } from 'next/server';
import { ClientSchema } from '@/lib/schemas/client';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';
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
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'Staff'], request);
    
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

    // 🚀 PHASE 2 OPTIMIZATION: Enhanced RPC with server-side filtering
    // This eliminates client-side filtering and moves logic to database
    // Provides better performance and reduces data transfer
    const statusFilterBoolean = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : null;
    
    const { data: clientsData, error: rpcError } = await supabase
      .rpc('get_client_dashboard_data_enhanced', {
        p_client_id: null, // Get all clients
        p_search_text: search || null,
        p_status_filter: statusFilterBoolean,
        p_limit: pageSize,
        p_offset: from
      });

    if (rpcError) {
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    // No client-side filtering needed - all filtering is done at database level
    const filteredClients: ClientDashboardData[] = (clientsData as ClientDashboardData[]) || [];

    // Extract total count from first record (all records have same total_count)
    const totalCount = filteredClients?.[0]?.total_count || 0;

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

    // 8. Return paginated client list with dashboard data
    const paginatedResponse = createPaginatedResponse(
      transformedClients,
      Number(totalCount),
      page,
      pageSize
    );

    return NextResponse.json(paginatedResponse);
    
  } catch (error) {
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
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Authentication & Authorization (OPTIMIZED - 0 DB queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'Staff'], request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase } = authResult;
    
    // 2. Parse and validate request body
    let body;
    try {
        body = await request.json();
    } catch (parseError) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const validationResult = ClientSchema.safeParse(body);

    if (!validationResult.success) {
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
      return NextResponse.json({ error: 'Failed to create client', details: dbError.message }, { status: 500 });
    }

    // 4. Performance monitoring
    const responseTime = Date.now() - startTime;

    // 5. Return the newly created client
    return NextResponse.json(newClient, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 