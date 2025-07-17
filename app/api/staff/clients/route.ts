import { NextResponse, NextRequest } from 'next/server';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';

/**
 * GET /api/staff/clients
 * 
 * Retrieves a list of clients assigned to the staff member with dashboard data
 * Accessible only by users with 'Staff' or 'Admin' roles
 * Supports filtering by search query and active status
 * 
 * OPTIMIZED: Single RPC call replaces multiple N+1 queries
 */
export async function GET(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestUltraFast(['Staff', 'Admin'], request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    // Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const isActiveFilter = searchParams.get('isActive');

    // 🚀 OPTIMIZED: Single RPC call replaces multiple N+1 queries
    // This replaces:
    // 1. Basic clients query
    // 2. N x student count queries (one per client)
    // 3. N x product assignment queries (one per client) 
    // 4. N x recent activity queries (one per client)
    // Total: 1 + 3N database calls → 1 database call (90%+ reduction)
    
    const { data: clientsData, error: rpcError } = await supabase
      .rpc('get_staff_client_dashboard_data', {
        p_staff_id: user.id
      });

    if (rpcError) {
      console.error('Error fetching staff clients via RPC:', rpcError);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    let filteredClients = clientsData || [];
    
    // Apply client-side filtering (consider moving to RPC for better performance)
    if (searchQuery) {
      filteredClients = filteredClients.filter((client: any) => 
        client.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (isActiveFilter !== null) {
      const isActive = isActiveFilter.toLowerCase() === 'true';
      filteredClients = filteredClients.filter((client: any) => client.is_active === isActive);
    }

    // Transform to match expected response format
    const transformedClients = filteredClients.map((client: any) => ({
      id: client.id,
      name: client.name,
      contact_email: client.contact_email,
      is_active: client.is_active,
      created_at: client.created_at,
      logo_url: client.logo_url,
      // Enhanced dashboard data from RPC
      total_students: client.total_students,
      active_students: client.active_students,
      assigned_products: client.assigned_products,
      recent_activity: client.recent_activity
    }));

    return NextResponse.json(transformedClients, { status: 200 });

  } catch (error) {
    console.error('GET /api/staff/clients Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 