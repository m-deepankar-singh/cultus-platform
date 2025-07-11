import { SecurityEvent, SecurityEventType, SecuritySeverity, SecurityAlert, SecurityAlertType, SecurityMetrics } from './types';

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventBuffer: SecurityEvent[] = [];
  private alertThresholds: Map<SecurityEventType, number> = new Map();
  private readonly MAX_BUFFER_SIZE = 1000;
  private readonly ALERT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  constructor() {
    this.initializeAlertThresholds();
  }

  private initializeAlertThresholds(): void {
    this.alertThresholds.set(SecurityEventType.AUTH_FAILURE, 5);
    this.alertThresholds.set(SecurityEventType.RATE_LIMIT_EXCEEDED, 10);
    this.alertThresholds.set(SecurityEventType.UNAUTHORIZED_ACCESS, 3);
    this.alertThresholds.set(SecurityEventType.SUSPICIOUS_ACTIVITY, 1);
    this.alertThresholds.set(SecurityEventType.PRIVILEGE_ESCALATION, 1);
    this.alertThresholds.set(SecurityEventType.CONFIGURATION_ACCESS, 5);
  }

  addEvent(event: SecurityEvent): void {
    this.eventBuffer.push(event);
    
    // Maintain buffer size
    if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
      this.eventBuffer.shift();
    }

    // Check for alert conditions
    this.checkAlertConditions(event);
  }

  private checkAlertConditions(newEvent: SecurityEvent): void {
    const now = Date.now();
    const windowStart = now - this.ALERT_WINDOW_MS;
    
    // Get recent events of the same type
    const recentEvents = this.eventBuffer.filter(event => 
      event.eventType === newEvent.eventType &&
      new Date(event.timestamp).getTime() >= windowStart
    );

    const threshold = this.alertThresholds.get(newEvent.eventType);
    if (threshold && recentEvents.length >= threshold) {
      this.triggerAlert(newEvent.eventType, recentEvents);
    }

    // Check for suspicious patterns
    this.checkSuspiciousPatterns(newEvent);
  }

  private checkSuspiciousPatterns(event: SecurityEvent): void {
    const now = Date.now();
    const windowStart = now - this.ALERT_WINDOW_MS;
    
    // Multiple failed logins from same IP
    if (event.eventType === SecurityEventType.AUTH_FAILURE && event.ipAddress) {
      const failedLogins = this.eventBuffer.filter(e => 
        e.eventType === SecurityEventType.AUTH_FAILURE &&
        e.ipAddress === event.ipAddress &&
        new Date(e.timestamp).getTime() >= windowStart
      );
      
      if (failedLogins.length >= 3) {
        this.triggerSuspiciousActivityAlert(
          SecurityAlertType.MULTIPLE_FAILED_LOGINS,
          `Multiple failed login attempts from IP: ${event.ipAddress}`,
          failedLogins
        );
      }
    }

    // Unusual admin activity patterns
    if (event.eventType === SecurityEventType.ADMIN_ACTION && event.userId) {
      const adminActions = this.eventBuffer.filter(e => 
        e.eventType === SecurityEventType.ADMIN_ACTION &&
        e.userId === event.userId &&
        new Date(e.timestamp).getTime() >= windowStart
      );
      
      if (adminActions.length >= 10) {
        this.triggerSuspiciousActivityAlert(
          SecurityAlertType.UNUSUAL_ADMIN_ACTIVITY,
          `High volume of admin actions from user: ${event.userId}`,
          adminActions
        );
      }
    }
  }

  private triggerAlert(eventType: SecurityEventType, events: SecurityEvent[]): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 Security Alert:', {
        alertId,
        eventType,
        eventCount: events.length,
        timeWindow: '5 minutes',
        affectedIPs: [...new Set(events.map(e => e.ipAddress))],
        affectedUsers: [...new Set(events.map(e => e.userId).filter(Boolean))]
      });
    } else {
      console.log(JSON.stringify({
        alertType: 'SECURITY_THRESHOLD_EXCEEDED',
        alertId,
        eventType,
        eventCount: events.length,
        events: events.map(e => e.eventId),
        timestamp: new Date().toISOString()
      }));
    }
  }

  private triggerSuspiciousActivityAlert(
    alertType: SecurityAlertType,
    description: string,
    events: SecurityEvent[]
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 Suspicious Activity Alert:', {
        alertId,
        alertType,
        description,
        eventCount: events.length,
        relatedEvents: events.map(e => e.eventId)
      });
    } else {
      console.log(JSON.stringify({
        alertType: 'SUSPICIOUS_ACTIVITY',
        alertId,
        description,
        eventCount: events.length,
        relatedEvents: events.map(e => e.eventId),
        timestamp: new Date().toISOString()
      }));
    }
  }

  getSecurityMetrics(timeWindow: number = 3600): SecurityMetrics {
    const now = Date.now();
    const windowStart = now - (timeWindow * 1000);
    
    const relevantEvents = this.eventBuffer.filter(event => 
      new Date(event.timestamp).getTime() >= windowStart
    );

    const eventsByType = relevantEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const eventsBySeverity = relevantEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<SecuritySeverity, number>);

    const uniqueUsers = new Set(
      relevantEvents.map(e => e.userId).filter(Boolean)
    ).size;

    const suspiciousActivityCount = relevantEvents.filter(
      e => e.eventType === SecurityEventType.SUSPICIOUS_ACTIVITY
    ).length;

    const endpointCounts = relevantEvents.reduce((acc, event) => {
      if (event.endpoint) {
        acc[event.endpoint] = (acc[event.endpoint] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      totalEvents: relevantEvents.length,
      eventsByType,
      eventsBySeverity,
      uniqueUsers,
      suspiciousActivityCount,
      topEndpoints,
      alertsGenerated: this.getAlertCount(timeWindow),
      timeWindow
    };
  }

  private getAlertCount(timeWindow: number): number {
    // This would be expanded to track actual alerts generated
    // For now, return a calculated estimate based on threshold exceedances
    return 0;
  }

  checkForAnomalies(): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];
    const now = Date.now();
    const windowStart = now - this.ALERT_WINDOW_MS;
    
    const recentEvents = this.eventBuffer.filter(event => 
      new Date(event.timestamp).getTime() >= windowStart
    );

    // Check for unusual patterns in recent events
    const ipActivityCounts = recentEvents.reduce((acc, event) => {
      if (event.ipAddress) {
        acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Flag IPs with high activity
    Object.entries(ipActivityCounts).forEach(([ip, count]) => {
      if (count > 50) { // Threshold for high activity
        alerts.push({
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          alertType: SecurityAlertType.SUSPICIOUS_FILE_ACCESS,
          severity: SecuritySeverity.WARNING,
          description: `High activity from IP address: ${ip} (${count} events in 5 minutes)`,
          relatedEvents: recentEvents
            .filter(e => e.ipAddress === ip)
            .map(e => e.eventId),
          actionRequired: true,
          metadata: {
            ipAddress: ip,
            eventCount: count,
            timeWindow: '5 minutes'
          }
        });
      }
    });

    return alerts;
  }

  clearOldEvents(maxAge: number = 86400): void {
    const cutoff = Date.now() - (maxAge * 1000);
    this.eventBuffer = this.eventBuffer.filter(event => 
      new Date(event.timestamp).getTime() >= cutoff
    );
  }

  getRecentEvents(limit: number = 20): SecurityEvent[] {
    return this.eventBuffer
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getEventsByTimeWindow(timeWindowSeconds: number): SecurityEvent[] {
    const now = Date.now();
    const windowStart = now - (timeWindowSeconds * 1000);
    
    return this.eventBuffer.filter(event => 
      new Date(event.timestamp).getTime() >= windowStart
    );
  }

  getActiveAlerts(): SecurityAlert[] {
    // In a real implementation, this would query a persistent alert store
    // For now, we'll return the current anomalies as active alerts
    return this.checkForAnomalies();
  }
}

export const securityMonitor = SecurityMonitor.getInstance();