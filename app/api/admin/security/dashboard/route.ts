import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';
import { securityMonitor } from '@/lib/security/security-monitor';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function GET(request: NextRequest) {
  // Log security dashboard access
  securityLogger.logEvent({
    eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: '/api/admin/security/dashboard',
    method: 'GET',
    details: {
      operation: 'security_dashboard_access',
      stage: 'attempt'
    }
  }, request);

  try {
    // Authenticate admin user
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: '/api/admin/security/dashboard',
        method: 'GET',
        details: {
          operation: 'security_dashboard_access',
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeWindowParam = searchParams.get('timeWindow') || '1h';
    
    // Convert time window to seconds
    const timeWindowMap: Record<string, number> = {
      '1h': 3600,
      '24h': 86400,
      '7d': 604800,
      '30d': 2592000
    };
    
    const timeWindowSeconds = timeWindowMap[timeWindowParam] || 3600;

    // Get security metrics
    const metrics = securityMonitor.getSecurityMetrics(timeWindowSeconds);
    
    // Get recent events (last 20 events)
    const recentEvents = securityMonitor.getRecentEvents(20);
    
    // Get active alerts
    const alerts = securityMonitor.checkForAnomalies();

    // Log successful access
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: '/api/admin/security/dashboard',
      method: 'GET',
      details: {
        operation: 'security_dashboard_access',
        timeWindow: timeWindowParam,
        metricsReturned: {
          totalEvents: metrics.totalEvents,
          alertsCount: alerts.length
        },
        stage: 'success'
      }
    }, request);

    return NextResponse.json({
      metrics,
      recentEvents,
      alerts,
      timeWindow: timeWindowParam
    });

  } catch (error) {
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.ADMIN_OPERATIONS,
      endpoint: '/api/admin/security/dashboard',
      method: 'GET',
      details: {
        operation: 'security_dashboard_access',
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'failed'
      }
    }, request);

    console.error('Error fetching security dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security dashboard data' },
      { status: 500 }
    );
  }
}