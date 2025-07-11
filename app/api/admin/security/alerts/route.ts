import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { securityMonitor } from '@/lib/security/security-monitor';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function GET(request: NextRequest) {
  // Log security alerts access
  securityLogger.logEvent({
    eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: '/api/admin/security/alerts',
    method: 'GET',
    details: {
      operation: 'security_alerts_access',
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
        endpoint: '/api/admin/security/alerts',
        method: 'GET',
        details: {
          operation: 'security_alerts_access',
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get active alerts from security monitor
    const alerts = securityMonitor.getActiveAlerts();

    // Transform alerts to include status and additional fields
    const enhancedAlerts = alerts.map(alert => ({
      ...alert,
      status: 'active' as const,
      acknowledgedBy: undefined,
      acknowledgedAt: undefined,
      resolvedBy: undefined,
      resolvedAt: undefined,
      notes: undefined
    }));

    // Log successful access
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: '/api/admin/security/alerts',
      method: 'GET',
      details: {
        operation: 'security_alerts_access',
        alertCount: enhancedAlerts.length,
        stage: 'success'
      }
    }, request);

    return NextResponse.json({
      alerts: enhancedAlerts,
      total: enhancedAlerts.length
    });

  } catch (error) {
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.ADMIN_OPERATIONS,
      endpoint: '/api/admin/security/alerts',
      method: 'GET',
      details: {
        operation: 'security_alerts_access',
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'failed'
      }
    }, request);

    console.error('Error fetching security alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    );
  }
}