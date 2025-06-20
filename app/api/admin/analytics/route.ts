import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/api-auth";
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, supabase } = authResult;

    // Get optional query parameters for filtering
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const clientId = searchParams.get('clientId');

    // Use admin client for analytics access
    const supabaseAdmin = createAdminClient();
    
    // 🚀 PHASE 1 OPTIMIZATION: Single RPC call replaces multiple analytics queries
    // This replaces multiple separate queries for:
    // 1. Total learners count
    // 2. Active learners count  
    // 3. Module statistics
    // 4. Assessment submissions analysis
    // 5. Progress over time calculations
    // 6. Score distributions
    // 7. Recent activity queries
    // Total: 7+ database calls → 1 database call (85%+ reduction)
    const { data: analyticsData, error: rpcError } = await supabaseAdmin
      .rpc('get_analytics_dashboard_data', {
        p_date_from: dateFrom || undefined,
        p_date_to: dateTo || undefined,
        p_client_id: clientId || null
      });

    if (rpcError) {
      console.error('Error fetching analytics via RPC:', rpcError);
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }

    // Return the consolidated analytics data
    return NextResponse.json(analyticsData || {}, { status: 200 });

  } catch (error) {
    console.error("Unexpected error in GET /api/admin/analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
} 