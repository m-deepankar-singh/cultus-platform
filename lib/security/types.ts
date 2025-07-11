export interface SecurityEvent {
  eventId: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  category: SecurityCategory;
  userId?: string;
  sessionId?: string;
  clientId?: string;
  userRole?: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  details: Record<string, any>;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export enum SecurityEventType {
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_FAILURE = 'AUTH_FAILURE',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REFRESHED = 'SESSION_REFRESHED',
  ROLE_VALIDATION_FAILED = 'ROLE_VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_CHECK = 'RATE_LIMIT_CHECK',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_ACCESS = 'FILE_ACCESS',
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_ACCESS_FAILURE = 'DATA_ACCESS_FAILURE',
  ADMIN_ACTION = 'ADMIN_ACTION',
  BULK_OPERATION = 'BULK_OPERATION',
  CONFIGURATION_ACCESS = 'CONFIGURATION_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  // Student-specific events
  STUDENT_API_ACCESS = 'STUDENT_API_ACCESS',
  STUDENT_AUTH_SUCCESS = 'STUDENT_AUTH_SUCCESS',
  STUDENT_AUTH_FAILURE = 'STUDENT_AUTH_FAILURE',
  STUDENT_SUBMISSION = 'STUDENT_SUBMISSION',
  STUDENT_PROGRESS = 'STUDENT_PROGRESS'
}

export enum SecuritySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

export enum SecurityCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATA_ACCESS = 'DATA_ACCESS',
  FILE_OPERATIONS = 'FILE_OPERATIONS',
  ADMIN_OPERATIONS = 'ADMIN_OPERATIONS',
  RATE_LIMITING = 'RATE_LIMITING',
  CONFIGURATION = 'CONFIGURATION',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  STUDENT_ACTIVITY = 'STUDENT_ACTIVITY'
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  alertType: SecurityAlertType;
  severity: SecuritySeverity;
  description: string;
  relatedEvents: string[];
  actionRequired: boolean;
  metadata: Record<string, any>;
}

export enum SecurityAlertType {
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  RATE_LIMIT_ABUSE = 'RATE_LIMIT_ABUSE',
  SUSPICIOUS_FILE_ACCESS = 'SUSPICIOUS_FILE_ACCESS',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  UNUSUAL_ADMIN_ACTIVITY = 'UNUSUAL_ADMIN_ACTIVITY',
  CONFIGURATION_TAMPERING = 'CONFIGURATION_TAMPERING'
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  uniqueUsers: number;
  suspiciousActivityCount: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  alertsGenerated: number;
  timeWindow: number;
}