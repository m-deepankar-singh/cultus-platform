import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params;

  // Log alert resolution attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.ADMIN_ACTION,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: `/api/admin/security/alerts/${alertId}/resolve`,
    method: 'POST',
    details: {
      operation: 'alert_resolve',
      alertId,
      stage: 'attempt'
    }
  }, request);

  try {
    // Authenticate admin user
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: `/api/admin/security/alerts/${alertId}/resolve`,
        method: 'POST',
        details: {
          operation: 'alert_resolve',
          alertId,
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse request body for notes
    let notes: string | undefined;
    try {
      const body = await request.json();
      notes = body.notes;
    } catch {
      // Body parsing failed, continue without notes
    }

    // In a real implementation, this would update the alert status in a database
    // For now, we'll just log the resolution
    securityLogger.logEvent({
      eventType: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: `/api/admin/security/alerts/${alertId}/resolve`,
      method: 'POST',
      details: {
        operation: 'alert_resolve',
        alertId,
        resolvedBy: authResult.user.id,
        resolvedAt: new Date().toISOString(),
        notes: notes || undefined,
        stage: 'success'
      }
    }, request);

    return NextResponse.json({
      success: true,
      message: 'Alert resolved successfully',
      alertId,
      resolvedBy: authResult.user.id,
      resolvedAt: new Date().toISOString(),
      notes
    });

  } catch (error) {
    securityLogger.logEvent({
      eventType: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.ADMIN_OPERATIONS,
      endpoint: `/api/admin/security/alerts/${alertId}/resolve`,
      method: 'POST',
      details: {
        operation: 'alert_resolve',
        alertId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'failed'
      }
    }, request);

    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}