import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function POST(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  const { alertId } = params;

  // Log alert acknowledgment attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.ADMIN_ACTION,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: `/api/admin/security/alerts/${alertId}/acknowledge`,
    method: 'POST',
    details: {
      operation: 'alert_acknowledge',
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
        endpoint: `/api/admin/security/alerts/${alertId}/acknowledge`,
        method: 'POST',
        details: {
          operation: 'alert_acknowledge',
          alertId,
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // In a real implementation, this would update the alert status in a database
    // For now, we'll just log the acknowledgment
    securityLogger.logEvent({
      eventType: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: `/api/admin/security/alerts/${alertId}/acknowledge`,
      method: 'POST',
      details: {
        operation: 'alert_acknowledge',
        alertId,
        acknowledgedBy: authResult.user.id,
        acknowledgedAt: new Date().toISOString(),
        stage: 'success'
      }
    }, request);

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alertId,
      acknowledgedBy: authResult.user.id,
      acknowledgedAt: new Date().toISOString()
    });

  } catch (error) {
    securityLogger.logEvent({
      eventType: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.ADMIN_OPERATIONS,
      endpoint: `/api/admin/security/alerts/${alertId}/acknowledge`,
      method: 'POST',
      details: {
        operation: 'alert_acknowledge',
        alertId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'failed'
      }
    }, request);

    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}