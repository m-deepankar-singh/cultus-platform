import { SecurityEventType } from './types';

export const SECURITY_CONFIG = {
  enabledInDevelopment: true,
  enabledInProduction: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
  bufferSize: 1000,
  retentionDays: 90,
  
  // Alert thresholds (events per 5-minute window)
  alertThresholds: {
    [SecurityEventType.AUTH_FAILURE]: 5,
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: 10,
    [SecurityEventType.UNAUTHORIZED_ACCESS]: 3,
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: 1,
    [SecurityEventType.PRIVILEGE_ESCALATION]: 1,
    [SecurityEventType.CONFIGURATION_ACCESS]: 5,
    [SecurityEventType.ADMIN_ACTION]: 15,
    [SecurityEventType.BULK_OPERATION]: 5
  },

  // Endpoints that require enhanced security logging
  sensitiveEndpoints: [
    '/api/admin/*',
    '/api/auth/*',
    '/api/*/upload*',
    '/api/r2/*',
    '/api/admin/analytics/*',
    '/api/admin/clients/*',
    '/api/admin/users/*',
    '/api/admin/bulk/*'
  ],

  // File operations that require security logging
  sensitiveFileOperations: [
    'upload',
    'download',
    'delete',
    'move',
    'copy',
    'access'
  ],

  // Admin actions that require enhanced logging
  sensitiveAdminActions: [
    'user_creation',
    'user_deletion',
    'role_assignment',
    'bulk_upload',
    'bulk_update',
    'bulk_delete',
    'configuration_change',
    'client_creation',
    'client_deletion',
    'analytics_access'
  ],

  // Patterns that indicate suspicious activity
  suspiciousPatterns: {
    // Multiple failed logins from same IP within time window
    multipleFailedLogins: {
      threshold: 3,
      timeWindowMinutes: 5
    },
    
    // High volume of admin actions from single user
    highVolumeAdminActions: {
      threshold: 10,
      timeWindowMinutes: 5
    },
    
    // Unusual file access patterns
    unusualFileAccess: {
      threshold: 20,
      timeWindowMinutes: 10
    },
    
    // Configuration access outside business hours
    afterHoursConfigAccess: {
      businessHoursStart: 8, // 8 AM
      businessHoursEnd: 18,  // 6 PM
      timezone: 'UTC'
    }
  },

  // Performance settings
  performance: {
    maxEventProcessingTimeMs: 5,
    bufferFlushIntervalMs: 30000, // 30 seconds
    alertProcessingIntervalMs: 60000, // 1 minute
    metricsCalculationIntervalMs: 300000 // 5 minutes
  },

  // Development vs Production settings
  development: {
    verboseLogging: true,
    logToConsole: true,
    logToFile: false,
    enableRealTimeAlerts: true
  },

  production: {
    verboseLogging: false,
    logToConsole: true,
    logToFile: true,
    enableRealTimeAlerts: true,
    structuredLogging: true
  }
} as const;

export type SecurityConfig = typeof SECURITY_CONFIG;

export const getSecurityConfig = (): SecurityConfig => {
  return SECURITY_CONFIG;
};

export const isSecurityLoggingEnabled = (): boolean => {
  return process.env.NODE_ENV === 'production' 
    ? SECURITY_CONFIG.enabledInProduction 
    : SECURITY_CONFIG.enabledInDevelopment;
};

export const isSensitiveEndpoint = (endpoint: string): boolean => {
  return SECURITY_CONFIG.sensitiveEndpoints.some(pattern => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(endpoint);
  });
};

export const isSensitiveFileOperation = (operation: string): boolean => {
  return SECURITY_CONFIG.sensitiveFileOperations.includes(operation.toLowerCase() as any);
};

export const isSensitiveAdminAction = (action: string): boolean => {
  return SECURITY_CONFIG.sensitiveAdminActions.includes(action.toLowerCase() as any);
};

export const getAlertThreshold = (eventType: SecurityEventType): number => {
  return (SECURITY_CONFIG.alertThresholds as any)[eventType] || 5;
};

export const isAfterBusinessHours = (timestamp: Date = new Date()): boolean => {
  const hour = timestamp.getUTCHours();
  const { businessHoursStart, businessHoursEnd } = SECURITY_CONFIG.suspiciousPatterns.afterHoursConfigAccess;
  
  return hour < businessHoursStart || hour >= businessHoursEnd;
};