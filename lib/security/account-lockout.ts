import { auditLogger, AuditEventType, logSecurityEvent } from './audit-logger';

// Account lockout configuration
export interface LockoutConfig {
  maxAttempts: number;
  lockoutDuration: number; // in milliseconds
  progressiveDelay: boolean;
  escalationThreshold: number;
  cooldownPeriod: number; // in milliseconds
}

// Default lockout configurations for different contexts
export const LOCKOUT_CONFIGS = {
  LOGIN: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
    escalationThreshold: 3, // After 3 lockouts, increase duration
    cooldownPeriod: 60 * 60 * 1000, // 1 hour cooldown
  },
  API_ACCESS: {
    maxAttempts: 10,
    lockoutDuration: 5 * 60 * 1000, // 5 minutes
    progressiveDelay: true,
    escalationThreshold: 5,
    cooldownPeriod: 30 * 60 * 1000, // 30 minutes cooldown
  },
  ADMIN_PANEL: {
    maxAttempts: 3,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    progressiveDelay: true,
    escalationThreshold: 2,
    cooldownPeriod: 2 * 60 * 60 * 1000, // 2 hours cooldown
  },
} as const;

// Account attempt tracking
export interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockoutCount: number;
  lastLockout?: number;
  isLocked: boolean;
  lockoutExpiry?: number;
}

// Context for lockout events
export interface LockoutContext {
  identifier: string; // email, IP, or user ID
  type: 'email' | 'ip' | 'user';
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Advanced account lockout mechanism with progressive penalties
 */
export class AccountLockoutManager {
  private static instance: AccountLockoutManager;
  private attemptTracking: Map<string, AttemptRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval to remove old records
    this.startCleanupInterval();
  }

  public static getInstance(): AccountLockoutManager {
    if (!AccountLockoutManager.instance) {
      AccountLockoutManager.instance = new AccountLockoutManager();
    }
    return AccountLockoutManager.instance;
  }

  private startCleanupInterval(): void {
    // Clean up old records every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords();
    }, 30 * 60 * 1000);
  }

  private cleanupOldRecords(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, record] of this.attemptTracking.entries()) {
      // Remove records older than 24 hours that are not locked
      if (!record.isLocked && (now - record.lastAttempt) > maxAge) {
        this.attemptTracking.delete(key);
      }
    }
  }

  private generateKey(context: LockoutContext): string {
    return `${context.type}:${context.identifier}`;
  }

  private calculateLockoutDuration(
    config: LockoutConfig,
    lockoutCount: number
  ): number {
    if (!config.progressiveDelay) {
      return config.lockoutDuration;
    }

    // Progressive delay: multiply by lockout count, but cap at 24 hours
    const multiplier = Math.min(lockoutCount, 10);
    const duration = config.lockoutDuration * multiplier;
    const maxDuration = 24 * 60 * 60 * 1000; // 24 hours max
    
    return Math.min(duration, maxDuration);
  }

  private shouldEscalate(record: AttemptRecord, config: LockoutConfig): boolean {
    return record.lockoutCount >= config.escalationThreshold;
  }

  /**
   * Record a failed attempt
   */
  public recordAttempt(context: LockoutContext, config: LockoutConfig): AttemptRecord {
    const key = this.generateKey(context);
    const now = Date.now();
    
    let record = this.attemptTracking.get(key);
    
    if (!record) {
      record = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        lockoutCount: 0,
        isLocked: false,
      };
    }

    // If lockout has expired, reset the record
    if (record.isLocked && record.lockoutExpiry && now > record.lockoutExpiry) {
      record.isLocked = false;
      record.lockoutExpiry = undefined;
      record.count = 0;
    }

    // Increment attempt count
    record.count++;
    record.lastAttempt = now;

    // Check if we should lock the account
    if (!record.isLocked && record.count >= config.maxAttempts) {
      record.isLocked = true;
      record.lockoutCount++;
      record.lastLockout = now;
      
      const lockoutDuration = this.calculateLockoutDuration(config, record.lockoutCount);
      record.lockoutExpiry = now + lockoutDuration;

      // Log the lockout event
      auditLogger.logEvent(AuditEventType.ACCOUNT_LOCKOUT, {
        userId: context.type === 'user' ? context.identifier : undefined,
        ip: context.ip,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        method: context.method,
        details: {
          lockoutType: context.type,
          identifier: context.identifier,
          attemptCount: record.count,
          lockoutCount: record.lockoutCount,
          lockoutDuration: lockoutDuration,
          escalated: this.shouldEscalate(record, config),
        },
        metadata: context.additionalData,
      });

      // Log brute force attempt
      logSecurityEvent(AuditEventType.BRUTE_FORCE_ATTEMPT, {
        userId: context.type === 'user' ? context.identifier : undefined,
        ip: context.ip,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        method: context.method,
        details: {
          lockoutType: context.type,
          identifier: context.identifier,
          attemptCount: record.count,
          lockoutTriggered: true,
        },
      });
    }

    // Update the tracking record
    this.attemptTracking.set(key, record);
    
    return record;
  }

  /**
   * Check if an account/IP is currently locked
   */
  public isLocked(context: LockoutContext): boolean {
    const key = this.generateKey(context);
    const record = this.attemptTracking.get(key);
    
    if (!record || !record.isLocked) {
      return false;
    }

    // Check if lockout has expired
    if (record.lockoutExpiry && Date.now() > record.lockoutExpiry) {
      record.isLocked = false;
      record.lockoutExpiry = undefined;
      record.count = 0; // Reset attempts after successful unlock
      this.attemptTracking.set(key, record);
      return false;
    }

    return true;
  }

  /**
   * Get lockout information for an account/IP
   */
  public getLockoutInfo(context: LockoutContext): AttemptRecord | null {
    const key = this.generateKey(context);
    const record = this.attemptTracking.get(key);
    
    if (!record) {
      return null;
    }

    // Check if lockout has expired
    if (record.isLocked && record.lockoutExpiry && Date.now() > record.lockoutExpiry) {
      record.isLocked = false;
      record.lockoutExpiry = undefined;
      record.count = 0;
      this.attemptTracking.set(key, record);
    }

    return { ...record };
  }

  /**
   * Get remaining lockout time in milliseconds
   */
  public getRemainingLockoutTime(context: LockoutContext): number {
    const record = this.getLockoutInfo(context);
    
    if (!record || !record.isLocked || !record.lockoutExpiry) {
      return 0;
    }

    const remaining = record.lockoutExpiry - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Reset attempts for an account/IP (admin override)
   */
  public resetAttempts(context: LockoutContext): void {
    const key = this.generateKey(context);
    this.attemptTracking.delete(key);
    
    // Log admin override
    auditLogger.logEvent(AuditEventType.CONFIGURATION_CHANGED, {
      ip: context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint,
      method: context.method,
      details: {
        action: 'reset_lockout',
        lockoutType: context.type,
        identifier: context.identifier,
      },
    });
  }

  /**
   * Clear a specific lockout (admin override)
   */
  public clearLockout(context: LockoutContext): void {
    const key = this.generateKey(context);
    const record = this.attemptTracking.get(key);
    
    if (record && record.isLocked) {
      record.isLocked = false;
      record.lockoutExpiry = undefined;
      this.attemptTracking.set(key, record);
      
      // Log admin override
      auditLogger.logEvent(AuditEventType.CONFIGURATION_CHANGED, {
        ip: context.ip,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        method: context.method,
        details: {
          action: 'clear_lockout',
          lockoutType: context.type,
          identifier: context.identifier,
        },
      });
    }
  }

  /**
   * Get all currently locked accounts/IPs
   */
  public getLockedAccounts(): Array<{
    key: string;
    type: string;
    identifier: string;
    record: AttemptRecord;
  }> {
    const locked: Array<{
      key: string;
      type: string;
      identifier: string;
      record: AttemptRecord;
    }> = [];
    
    for (const [key, record] of this.attemptTracking.entries()) {
      if (record.isLocked && record.lockoutExpiry && Date.now() < record.lockoutExpiry) {
        const [type, identifier] = key.split(':');
        locked.push({
          key,
          type,
          identifier,
          record: { ...record },
        });
      }
    }
    
    return locked;
  }

  /**
   * Get statistics about lockout activity
   */
  public getStatistics(): {
    totalTracked: number;
    currentlyLocked: number;
    totalLockouts: number;
    averageAttemptsBeforeLockout: number;
  } {
    const totalTracked = this.attemptTracking.size;
    let currentlyLocked = 0;
    let totalLockouts = 0;
    let totalAttempts = 0;
    
    for (const record of this.attemptTracking.values()) {
      if (record.isLocked && record.lockoutExpiry && Date.now() < record.lockoutExpiry) {
        currentlyLocked++;
      }
      totalLockouts += record.lockoutCount;
      totalAttempts += record.count;
    }
    
    return {
      totalTracked,
      currentlyLocked,
      totalLockouts,
      averageAttemptsBeforeLockout: totalTracked > 0 ? totalAttempts / totalTracked : 0,
    };
  }

  /**
   * Check for suspicious patterns across multiple identifiers
   */
  public detectSuspiciousPatterns(): Array<{
    type: 'distributed_attack' | 'account_enumeration' | 'credential_stuffing';
    details: Record<string, unknown>;
  }> {
    const patterns: Array<{
      type: 'distributed_attack' | 'account_enumeration' | 'credential_stuffing';
      details: Record<string, unknown>;
    }> = [];
    
    const now = Date.now();
    const timeWindow = 60 * 60 * 1000; // 1 hour
    
    // Group by IP and email
    const ipGroups = new Map<string, AttemptRecord[]>();
    const emailGroups = new Map<string, AttemptRecord[]>();
    
    for (const [key, record] of this.attemptTracking.entries()) {
      if ((now - record.lastAttempt) > timeWindow) continue;
      
      const [type, identifier] = key.split(':');
      
      if (type === 'ip') {
        if (!ipGroups.has(identifier)) {
          ipGroups.set(identifier, []);
        }
        ipGroups.get(identifier)!.push(record);
      } else if (type === 'email') {
        if (!emailGroups.has(identifier)) {
          emailGroups.set(identifier, []);
        }
        emailGroups.get(identifier)!.push(record);
      }
    }
    
    // Detect distributed attacks (many IPs, few attempts each)
    if (ipGroups.size > 20) {
      const totalAttempts = Array.from(ipGroups.values()).reduce(
        (sum, records) => sum + records.reduce((s, r) => s + r.count, 0),
        0
      );
      
      if (totalAttempts > 100) {
        patterns.push({
          type: 'distributed_attack',
          details: {
            uniqueIPs: ipGroups.size,
            totalAttempts,
            averageAttemptsPerIP: totalAttempts / ipGroups.size,
          },
        });
      }
    }
    
    // Detect account enumeration (many emails from same IP)
    for (const [ip, records] of ipGroups.entries()) {
      if (records.length > 10) {
        patterns.push({
          type: 'account_enumeration',
          details: {
            sourceIP: ip,
            accountsTargeted: records.length,
            totalAttempts: records.reduce((sum, r) => sum + r.count, 0),
          },
        });
      }
    }
    
    return patterns;
  }

  /**
   * Cleanup resources
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attemptTracking.clear();
  }
}

// Export singleton instance
export const lockoutManager = AccountLockoutManager.getInstance();

// Helper functions for common use cases
export const checkLoginLockout = (email: string, ip: string, context: Omit<LockoutContext, 'identifier' | 'type'>) => {
  const emailContext: LockoutContext = { ...context, identifier: email, type: 'email' };
  const ipContext: LockoutContext = { ...context, identifier: ip, type: 'ip' };
  
  return {
    emailLocked: lockoutManager.isLocked(emailContext),
    ipLocked: lockoutManager.isLocked(ipContext),
    emailInfo: lockoutManager.getLockoutInfo(emailContext),
    ipInfo: lockoutManager.getLockoutInfo(ipContext),
  };
};

export const recordLoginAttempt = (email: string, ip: string, context: Omit<LockoutContext, 'identifier' | 'type'>) => {
  const emailContext: LockoutContext = { ...context, identifier: email, type: 'email' };
  const ipContext: LockoutContext = { ...context, identifier: ip, type: 'ip' };
  
  return {
    emailRecord: lockoutManager.recordAttempt(emailContext, LOCKOUT_CONFIGS.LOGIN),
    ipRecord: lockoutManager.recordAttempt(ipContext, LOCKOUT_CONFIGS.LOGIN),
  };
};

export const checkApiAccessLockout = (userId: string, ip: string, context: Omit<LockoutContext, 'identifier' | 'type'>) => {
  const userContext: LockoutContext = { ...context, identifier: userId, type: 'user' };
  const ipContext: LockoutContext = { ...context, identifier: ip, type: 'ip' };
  
  return {
    userLocked: lockoutManager.isLocked(userContext),
    ipLocked: lockoutManager.isLocked(ipContext),
    userInfo: lockoutManager.getLockoutInfo(userContext),
    ipInfo: lockoutManager.getLockoutInfo(ipContext),
  };
};