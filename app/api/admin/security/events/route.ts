import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { securityMonitor } from '@/lib/security/security-monitor';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function GET(request: NextRequest) {
  // Log security events access
  securityLogger.logEvent({
    eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.ADMIN_OPERATIONS,
    endpoint: '/api/admin/security/events',
    method: 'GET',
    details: {
      operation: 'security_events_access',
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
        endpoint: '/api/admin/security/events',
        method: 'GET',
        details: {
          operation: 'security_events_access',
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    // Filter parameters
    const filters = {
      search: searchParams.get('search'),
      eventType: searchParams.get('eventType') as SecurityEventType,
      severity: searchParams.get('severity') as SecuritySeverity,
      category: searchParams.get('category') as SecurityCategory,
      userId: searchParams.get('userId'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      ipAddress: searchParams.get('ipAddress'),
      endpoint: searchParams.get('endpoint'),
    };

    // Get all events from the monitor
    let events = securityMonitor.getEventsByTimeWindow(86400); // Last 24 hours by default
    
    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      events = events.filter(event => 
        event.eventType.toLowerCase().includes(searchTerm) ||
        event.details.toString().toLowerCase().includes(searchTerm) ||
        event.endpoint?.toLowerCase().includes(searchTerm) ||
        event.ipAddress.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.eventType) {
      events = events.filter(event => event.eventType === filters.eventType);
    }

    if (filters.severity) {
      events = events.filter(event => event.severity === filters.severity);
    }

    if (filters.category) {
      events = events.filter(event => event.category === filters.category);
    }

    if (filters.userId) {
      events = events.filter(event => event.userId === filters.userId);
    }

    if (filters.ipAddress) {
      events = events.filter(event => event.ipAddress?.includes(filters.ipAddress!));
    }

    if (filters.endpoint) {
      events = events.filter(event => event.endpoint?.includes(filters.endpoint!));
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      events = events.filter(event => new Date(event.timestamp) >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      events = events.filter(event => new Date(event.timestamp) <= dateTo);
    }

    // Sort events by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const total = events.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEvents = events.slice(startIndex, endIndex);

    // Log successful access
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.ADMIN_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: '/api/admin/security/events',
      method: 'GET',
      details: {
        operation: 'security_events_access',
        filters: Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, any>),
        pagination: { page, pageSize, total, totalPages },
        stage: 'success'
      }
    }, request);

    return NextResponse.json({
      events: paginatedEvents,
      total,
      page,
      pageSize,
      totalPages,
      filters
    });

  } catch (error) {
    securityLogger.logEvent({
      eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.ADMIN_OPERATIONS,
      endpoint: '/api/admin/security/events',
      method: 'GET',
      details: {
        operation: 'security_events_access',
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'failed'
      }
    }, request);

    console.error('Error fetching security events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    );
  }
}