import { SecurityEventType } from './error-handler';

// Audit log event types
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  TOKEN_REFRESH = 'token_refresh',
  
  // Authorization events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  ROLE_ESCALATION_ATTEMPT = 'role_escalation_attempt',
  UNAUTHORIZED_ENDPOINT_ACCESS = 'unauthorized_endpoint_access',
  
  // Data access events
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  BULK_DATA_EXPORT = 'bulk_data_export',
  
  // Security events
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKOUT = 'account_lockout',
  
  // Administrative events
  USER_CREATED = 'user_created',
  USER_DELETED = 'user_deleted',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_DEACTIVATED = 'user_deactivated',
  
  // System events
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_CHANGED = 'configuration_changed',
  MAINTENANCE_MODE = 'maintenance_mode',
}

// Risk levels for audit events
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Audit log entry structure
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  riskLevel: RiskLevel;
  userId?: string;
  userRole?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  clientId?: string;
  targetUserId?: string;
  targetResource?: string;
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Security metrics for monitoring
export interface SecurityMetrics {
  loginAttempts: number;
  failedLogins: number;
  successfulLogins: number;
  rateLimitViolations: number;
  suspiciousActivities: number;
  accountLockouts: number;
  dataAccessEvents: number;
  highRiskEvents: number;
  criticalEvents: number;
}

/**
 * Centralized audit logging system for security events
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private logBuffer: AuditLogEntry[] = [];
  private metrics: SecurityMetrics = {
    loginAttempts: 0,
    failedLogins: 0,
    successfulLogins: 0,
    rateLimitViolations: 0,
    suspiciousActivities: 0,
    accountLockouts: 0,
    dataAccessEvents: 0,
    highRiskEvents: 0,
    criticalEvents: 0,
  };

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private determineRiskLevel(eventType: AuditEventType): RiskLevel {
    switch (eventType) {
      case AuditEventType.LOGIN_SUCCESS:
      case AuditEventType.LOGOUT:
      case AuditEventType.TOKEN_REFRESH:
      case AuditEventType.DATA_ACCESS:
        return RiskLevel.LOW;
      
      case AuditEventType.LOGIN_FAILURE:
      case AuditEventType.ACCESS_DENIED:
      case AuditEventType.DATA_MODIFICATION:
      case AuditEventType.USER_CREATED:
      case AuditEventType.USER_ROLE_CHANGED:
        return RiskLevel.MEDIUM;
      
      case AuditEventType.BRUTE_FORCE_ATTEMPT:
      case AuditEventType.RATE_LIMIT_EXCEEDED:
      case AuditEventType.ROLE_ESCALATION_ATTEMPT:
      case AuditEventType.UNAUTHORIZED_ENDPOINT_ACCESS:
      case AuditEventType.DATA_DELETION:
      case AuditEventType.BULK_DATA_EXPORT:
      case AuditEventType.USER_DELETED:
      case AuditEventType.USER_DEACTIVATED:
        return RiskLevel.HIGH;
      
      case AuditEventType.SUSPICIOUS_ACTIVITY:
      case AuditEventType.ACCOUNT_LOCKOUT:
      case AuditEventType.SYSTEM_ERROR:
      case AuditEventType.CONFIGURATION_CHANGED:
        return RiskLevel.CRITICAL;
      
      default:
        return RiskLevel.MEDIUM;
    }
  }

  private updateMetrics(eventType: AuditEventType, riskLevel: RiskLevel): void {
    switch (eventType) {
      case AuditEventType.LOGIN_SUCCESS:
        this.metrics.loginAttempts++;
        this.metrics.successfulLogins++;
        break;
      case AuditEventType.LOGIN_FAILURE:
        this.metrics.loginAttempts++;
        this.metrics.failedLogins++;
        break;
      case AuditEventType.RATE_LIMIT_EXCEEDED:
        this.metrics.rateLimitViolations++;
        break;
      case AuditEventType.SUSPICIOUS_ACTIVITY:
        this.metrics.suspiciousActivities++;
        break;
      case AuditEventType.ACCOUNT_LOCKOUT:
        this.metrics.accountLockouts++;
        break;
      case AuditEventType.DATA_ACCESS:
      case AuditEventType.DATA_MODIFICATION:
      case AuditEventType.DATA_DELETION:
      case AuditEventType.BULK_DATA_EXPORT:
        this.metrics.dataAccessEvents++;
        break;
    }

    switch (riskLevel) {
      case RiskLevel.HIGH:
        this.metrics.highRiskEvents++;
        break;
      case RiskLevel.CRITICAL:
        this.metrics.criticalEvents++;
        break;
    }
  }

  /**
   * Log a security audit event
   */
  public logEvent(
    eventType: AuditEventType,
    context: {
      userId?: string;
      userRole?: string;
      sessionId?: string;
      ip: string;
      userAgent: string;
      endpoint: string;
      method: string;
      statusCode?: number;
      clientId?: string;
      targetUserId?: string;
      targetResource?: string;
      details: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const riskLevel = this.determineRiskLevel(eventType);
    const logEntry: AuditLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      eventType,
      riskLevel,
      ...context,
    };

    // Update metrics
    this.updateMetrics(eventType, riskLevel);

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Log to console with structured format
    this.logToConsole(logEntry);

    // In production, this would also:
    // - Send to SIEM system
    // - Store in audit database
    // - Send alerts for high/critical events
    // - Trigger automated responses

    // Maintain buffer size
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }
  }

  private logToConsole(entry: AuditLogEntry): void {
    const logLevel = entry.riskLevel === RiskLevel.CRITICAL || entry.riskLevel === RiskLevel.HIGH ? 'error' : 'info';
    const logMessage = `[AUDIT_LOG] ${entry.eventType.toUpperCase()} - ${entry.riskLevel.toUpperCase()}`;
    
    console[logLevel](logMessage, JSON.stringify(entry, null, 2));
  }

  /**
   * Get current security metrics
   */
  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent audit logs
   */
  public getRecentLogs(count: number = 50): AuditLogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Get logs by event type
   */
  public getLogsByEventType(eventType: AuditEventType): AuditLogEntry[] {
    return this.logBuffer.filter(log => log.eventType === eventType);
  }

  /**
   * Get logs by risk level
   */
  public getLogsByRiskLevel(riskLevel: RiskLevel): AuditLogEntry[] {
    return this.logBuffer.filter(log => log.riskLevel === riskLevel);
  }

  /**
   * Get logs for a specific user
   */
  public getLogsByUserId(userId: string): AuditLogEntry[] {
    return this.logBuffer.filter(log => log.userId === userId || log.targetUserId === userId);
  }

  /**
   * Get logs for a specific IP address
   */
  public getLogsByIp(ip: string): AuditLogEntry[] {
    return this.logBuffer.filter(log => log.ip === ip);
  }

  /**
   * Check for suspicious patterns
   */
  public detectSuspiciousActivity(userId?: string, ip?: string): boolean {
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();
    
    const recentLogs = this.logBuffer.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return (now - logTime) <= timeWindow;
    });

    let suspiciousEvents = 0;
    
    for (const log of recentLogs) {
      // Check for matching user or IP
      if (userId && log.userId !== userId) continue;
      if (ip && log.ip !== ip) continue;
      
      // Count high-risk events
      if (log.riskLevel === RiskLevel.HIGH || log.riskLevel === RiskLevel.CRITICAL) {
        suspiciousEvents++;
      }
      
      // Count failed login attempts
      if (log.eventType === AuditEventType.LOGIN_FAILURE) {
        suspiciousEvents++;
      }
      
      // Count rate limit violations
      if (log.eventType === AuditEventType.RATE_LIMIT_EXCEEDED) {
        suspiciousEvents++;
      }
    }
    
    return suspiciousEvents >= 5; // Threshold for suspicious activity
  }

  /**
   * Reset metrics (for testing or periodic resets)
   */
  public resetMetrics(): void {
    this.metrics = {
      loginAttempts: 0,
      failedLogins: 0,
      successfulLogins: 0,
      rateLimitViolations: 0,
      suspiciousActivities: 0,
      accountLockouts: 0,
      dataAccessEvents: 0,
      highRiskEvents: 0,
      criticalEvents: 0,
    };
  }
}

// Export convenience functions
export const auditLogger = AuditLogger.getInstance();

// Helper functions for common audit events
export const logAuthEvent = (
  eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILURE | AuditEventType.LOGOUT,
  context: {
    userId?: string;
    userRole?: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    details: Record<string, unknown>;
  }
) => {
  auditLogger.logEvent(eventType, {
    ...context,
    method: 'POST',
  });
};

export const logAccessEvent = (
  eventType: AuditEventType.ACCESS_GRANTED | AuditEventType.ACCESS_DENIED,
  context: {
    userId?: string;
    userRole?: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    method: string;
    statusCode: number;
    targetResource?: string;
    details: Record<string, unknown>;
  }
) => {
  auditLogger.logEvent(eventType, context);
};

export const logDataEvent = (
  eventType: AuditEventType.DATA_ACCESS | AuditEventType.DATA_MODIFICATION | AuditEventType.DATA_DELETION,
  context: {
    userId: string;
    userRole: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    method: string;
    targetResource: string;
    details: Record<string, unknown>;
  }
) => {
  auditLogger.logEvent(eventType, context);
};

export const logSecurityEvent = (
  eventType: AuditEventType.BRUTE_FORCE_ATTEMPT | AuditEventType.RATE_LIMIT_EXCEEDED | AuditEventType.SUSPICIOUS_ACTIVITY,
  context: {
    userId?: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    method: string;
    details: Record<string, unknown>;
  }
) => {
  auditLogger.logEvent(eventType, context);
};