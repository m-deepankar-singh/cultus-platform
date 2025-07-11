// Main exports for security logging system
export * from './types';
export * from './security-logger';
export * from './security-monitor';
export * from './config';

// Re-export commonly used instances and functions
export { securityLogger, logSecurityEvent } from './security-logger';
export { securityMonitor } from './security-monitor';
export { 
  getSecurityConfig, 
  isSecurityLoggingEnabled, 
  isSensitiveEndpoint,
  isSensitiveFileOperation,
  isSensitiveAdminAction,
  getAlertThreshold,
  isAfterBusinessHours
} from './config';