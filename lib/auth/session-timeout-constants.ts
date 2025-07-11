/**
 * Session timeout constants and configuration
 */

export const SESSION_TIMEOUT_CONFIG = {
  // 48 hours in milliseconds
  TIMEOUT_DURATION: 48 * 60 * 60 * 1000,
  
  // Warning threshold - show warning 15 minutes before timeout
  WARNING_THRESHOLD: 15 * 60 * 1000,
  
  // Local storage key for last activity timestamp
  LAST_ACTIVITY_KEY: 'session_last_activity',
  
  // Grace period for network delays (5 minutes)
  GRACE_PERIOD: 5 * 60 * 1000,
} as const;

export const SESSION_TIMEOUT_EVENTS = {
  SESSION_EXPIRED: 'session_expired',
  SESSION_WARNING: 'session_warning',
  SESSION_REFRESHED: 'session_refreshed',
} as const;