import { NextRequest } from 'next/server';
import { SecurityEvent, SecurityEventType, SecuritySeverity, SecurityCategory } from './types';
import { securityMonitor } from './security-monitor';

export class SecurityLogger {
  private static instance: SecurityLogger;
  private correlationStore: Map<string, string> = new Map();

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  private generateEventId(): string {
    return `sec_evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIp(request?: NextRequest): string {
    if (!request) return 'unknown';
    
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const remoteAddress = request.headers.get('x-vercel-forwarded-for');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (real) {
      return real.trim();
    }
    if (remoteAddress) {
      return remoteAddress.trim();
    }
    
    return 'unknown';
  }

  private extractUserContext(request?: NextRequest): {
    userId?: string;
    sessionId?: string;
    clientId?: string;
    userRole?: string;
  } {
    if (!request) return {};

    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) return {};

      // This would be expanded to properly decode JWT and extract user context
      // For now, we'll return empty object as the actual implementation
      // would need to integrate with the existing auth system
      return {};
    } catch (error) {
      return {};
    }
  }

  logEvent(event: Partial<SecurityEvent>, request?: NextRequest): void {
    const timestamp = new Date().toISOString();
    const eventId = this.generateEventId();
    const correlationId = event.correlationId || this.generateCorrelationId();
    const userContext = this.extractUserContext(request);
    
    const completeEvent: SecurityEvent = {
      eventId,
      timestamp,
      eventType: event.eventType || SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: event.severity || SecuritySeverity.INFO,
      category: event.category || SecurityCategory.SECURITY_INCIDENT,
      ipAddress: this.getClientIp(request),
      userAgent: request?.headers.get('user-agent') || undefined,
      endpoint: event.endpoint || request?.url,
      method: event.method || request?.method,
      details: event.details || {},
      correlationId,
      metadata: {
        ...event.metadata,
        environment: process.env.NODE_ENV || 'development',
        timestamp: Date.now()
      },
      ...userContext,
      ...event
    };

    this.outputEvent(completeEvent);
    
    // Feed the event to the security monitor for analysis
    securityMonitor.addEvent(completeEvent);
  }

  private outputEvent(event: SecurityEvent): void {
    if (process.env.NODE_ENV === 'development') {
      // Development: Human-readable console output
      console.log('🔒 Security Event:', {
        type: event.eventType,
        severity: event.severity,
        category: event.category,
        endpoint: event.endpoint,
        user: event.userId || 'anonymous',
        ip: event.ipAddress,
        details: event.details,
        timestamp: event.timestamp
      });
    } else {
      // Production: Structured JSON logging
      console.log(JSON.stringify(event));
    }
  }

  logAuthEvent(
    type: SecurityEventType,
    details: Record<string, any>,
    request?: NextRequest
  ): void {
    this.logEvent({
      eventType: type,
      severity: type === SecurityEventType.AUTH_FAILURE ? SecuritySeverity.WARNING : SecuritySeverity.INFO,
      category: SecurityCategory.AUTHENTICATION,
      details
    }, request);
  }

  logAccessEvent(
    endpoint: string,
    method: string,
    success: boolean,
    details: Record<string, any>,
    request?: NextRequest
  ): void {
    this.logEvent({
      eventType: success ? SecurityEventType.AUTH_SUCCESS : SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: success ? SecuritySeverity.INFO : SecuritySeverity.WARNING,
      category: SecurityCategory.AUTHORIZATION,
      endpoint,
      method,
      details: {
        ...details,
        accessGranted: success
      }
    }, request);
  }

  logFileEvent(
    operation: string,
    filename: string,
    success: boolean,
    details: Record<string, any>,
    request?: NextRequest
  ): void {
    this.logEvent({
      eventType: SecurityEventType.FILE_UPLOAD,
      severity: success ? SecuritySeverity.INFO : SecuritySeverity.WARNING,
      category: SecurityCategory.FILE_OPERATIONS,
      details: {
        operation,
        filename,
        success,
        ...details
      }
    }, request);
  }

  logAdminEvent(
    action: string,
    target: string,
    details: Record<string, any>,
    request?: NextRequest
  ): void {
    this.logEvent({
      eventType: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.WARNING,
      category: SecurityCategory.ADMIN_OPERATIONS,
      details: {
        action,
        target,
        ...details
      }
    }, request);
  }

  logSuspiciousActivity(
    description: string,
    details: Record<string, any>,
    request?: NextRequest
  ): void {
    this.logEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.SECURITY_INCIDENT,
      details: {
        description,
        ...details
      }
    }, request);
  }

  logRateLimitEvent(
    identifier: string,
    endpoint: string,
    allowed: boolean,
    remaining: number,
    limit: number,
    request?: NextRequest
  ): void {
    this.logEvent({
      eventType: allowed ? SecurityEventType.RATE_LIMIT_CHECK : SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: allowed ? SecuritySeverity.INFO : SecuritySeverity.WARNING,
      category: SecurityCategory.RATE_LIMITING,
      endpoint,
      details: {
        identifier,
        allowed,
        remaining,
        limit,
        utilizationPercentage: ((limit - remaining) / limit) * 100
      }
    }, request);
  }

  logConfigurationAccess(
    configType: string,
    details: Record<string, any>,
    request?: NextRequest
  ): void {
    this.logEvent({
      eventType: SecurityEventType.CONFIGURATION_ACCESS,
      severity: SecuritySeverity.WARNING,
      category: SecurityCategory.CONFIGURATION,
      details: {
        configType,
        ...details
      }
    }, request);
  }
}

export const securityLogger = SecurityLogger.getInstance();

export const logSecurityEvent = (event: Partial<SecurityEvent>, request?: NextRequest) => 
  securityLogger.logEvent(event, request);