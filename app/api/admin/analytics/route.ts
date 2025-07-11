import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequestSecure } from "@/lib/auth/api-auth";
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function GET(request: NextRequest) {
  // Log analytics access attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
    severity: SecuritySeverity.WARNING,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: '/api/admin/analytics',
    method: 'GET',
    details: {
      operation: 'analytics_access',
      stage: 'attempt'
    }
  }, request);

  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestSecure(['Admin', 'Staff']);
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: '/api/admin/analytics',
        method: 'GET',
        details: {
          operation: 'analytics_access',
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, supabase } = authResult;

    // Get optional query parameters for filtering
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const clientId = searchParams.get('clientId');

    // Use the authenticated supabase client (no need for admin client)
    // The api-auth already ensures the user has Admin/Staff role
    
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
    const { data: analyticsData, error: rpcError } = await supabase
      .rpc('get_analytics_dashboard_data', {
        p_date_from: dateFrom || undefined,
        p_date_to: dateTo || undefined,
        p_client_id: clientId || null
      });

    if (rpcError) {
      console.error('Error fetching analytics via RPC:', rpcError);
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }

    // Log successful analytics access
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.WARNING,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: '/api/admin/analytics',
      method: 'GET',
      details: {
        operation: 'analytics_access',
        filters: {
          dateFrom,
          dateTo,
          clientId
        },
        stage: 'success'
      }
    }, request);

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