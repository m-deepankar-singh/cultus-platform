// app/api/viewer/reports/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { ViewerReportQuerySchema } from '@/lib/schemas/progress';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

// Define the expected structure of the data returned by the function
// based on the aggregated_module_progress_report_item type in SQL
type AggregatedProgressReportItem = {
  client_id: string | null;
  client_name: string | null;
  product_id: string | null;
  product_title: string | null;
  module_id: string | null;
  module_title: string | null;
  module_type: 'Course' | 'Assessment' | null;
  total_assigned_students: number | null;
  students_not_started: number | null;
  students_in_progress: number | null;
  students_completed: number | null;
  average_score: number | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Log sensitive data access attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.DATA_ACCESS,
    endpoint: '/api/viewer/reports',
    method: 'GET',
    details: {
      operation: 'viewer_reports_access',
      queryParams: Object.fromEntries(searchParams.entries()),
      stage: 'attempt'
    }
  }, request);

  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestSecure(['viewer', 'admin']);
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: '/api/viewer/reports',
        method: 'GET',
        details: {
          operation: 'viewer_reports_access',
          error: authResult.error,
          stage: 'auth_failed'
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // 2. Query Parameter Validation
    let validatedQuery: z.infer<typeof ViewerReportQuerySchema>;
    try {
      validatedQuery = ViewerReportQuerySchema.parse({
        clientId: searchParams.get('clientId') || undefined,
        productId: searchParams.get('productId') || undefined,
      });
      securityLogger.logEvent({
        eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
        severity: SecuritySeverity.INFO,
        category: SecurityCategory.DATA_ACCESS,
        userId: user.id,
        userRole: claims.user_role,
        endpoint: '/api/viewer/reports',
        method: 'GET',
        details: {
          operation: 'viewer_reports_access',
          validatedQuery,
          stage: 'validation_success'
        }
      }, request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors }, { status: 400 });
      }
      securityLogger.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.DATA_ACCESS,
        userId: user.id,
        userRole: claims.user_role,
        endpoint: '/api/viewer/reports',
        method: 'GET',
        details: {
          operation: 'viewer_reports_access',
          error: error instanceof Error ? error.message : 'Unknown validation error',
          stage: 'validation_failed'
        }
      }, request);
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    // 3. Call Database Function
    
    const { data, error: rpcError } = await supabase.rpc(
      'get_aggregated_progress_report',
      {
        p_client_id: validatedQuery.clientId,
        p_product_id: validatedQuery.productId,
      }
    );

    if (rpcError) {
      securityLogger.logEvent({
        eventType: SecurityEventType.DATA_ACCESS_FAILURE,
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.DATA_ACCESS,
        userId: user.id,
        userRole: claims.user_role,
        endpoint: '/api/viewer/reports',
        method: 'GET',
        details: {
          operation: 'viewer_reports_access',
          error: rpcError.message,
          stage: 'database_error'
        }
      }, request);
      return NextResponse.json(
        { error: `Database error: ${rpcError.message}` },
        { status: 500 }
      );
    }

    // Type assertion: Assume the RPC call returns the correct structure
    const reportData = data as AggregatedProgressReportItem[];

    // Log successful data access
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.DATA_ACCESS,
      userId: user.id,
      userRole: claims.user_role,
      endpoint: '/api/viewer/reports',
      method: 'GET',
      details: {
        operation: 'viewer_reports_access',
        recordCount: reportData.length,
        queryParams: validatedQuery,
        stage: 'success'
      }
    }, request);

    // 4. Return Response
    return NextResponse.json(reportData, { status: 200 });

  } catch (error) {
    securityLogger.logEvent({
      eventType: SecurityEventType.SYSTEM_ERROR,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.DATA_ACCESS,
      endpoint: '/api/viewer/reports',
      method: 'GET',
      details: {
        operation: 'viewer_reports_access',
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'unexpected_error'
      }
    }, request);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Add dynamic = 'force-dynamic' to ensure the route is dynamic
// and re-evaluated on each request, avoiding potential caching issues.
export const dynamic = 'force-dynamic';
