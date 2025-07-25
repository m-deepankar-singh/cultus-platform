import { NextRequest } from 'next/server';
import { SESSION_TIMEOUT_CONFIG } from './session-timeout-constants';

// Session timeout cache configuration
const TIMEOUT_CACHE_CONFIG = {
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 1000,
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
} as const;

// Session timeout status
interface SessionTimeoutStatus {
  isExpired: boolean;
  lastActivity: number | null;
  timeSinceActivity: number;
  cached: boolean;
  checkedAt: number;
}

// Cached timeout entry
interface TimeoutCacheEntry {
  status: SessionTimeoutStatus;
  expiresAt: number;
}

/**
 * Optimized session timeout service with caching
 * Reduces expensive header parsing and repeated calculations
 */
export class SessionTimeoutService {
  private timeoutCache = new Map<string, TimeoutCacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if session is expired with caching optimization
   */
  checkSessionTimeout(request: NextRequest, userId: string): SessionTimeoutStatus {
    const cacheKey = this.generateCacheKey(userId, request);
    
    // Check cache first
    const cached = this.getCachedStatus(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate fresh timeout status
    const status = this.calculateTimeoutStatus(request);
    
    // Cache the result
    this.setCachedStatus(cacheKey, status);
    
    return status;
  }

  /**
   * Get session timeout information for monitoring
   */
  getTimeoutInfo(request: NextRequest): {
    hasTimeoutHeader: boolean;
    lastActivity: number | null;
    timeSinceActivity: number;
    isExpired: boolean;
  } {
    const status = this.calculateTimeoutStatus(request);
    
    return {
      hasTimeoutHeader: status.lastActivity !== null,
      lastActivity: status.lastActivity,
      timeSinceActivity: status.timeSinceActivity,
      isExpired: status.isExpired,
    };
  }

  /**
   * Force refresh timeout status (bypass cache)
   */
  refreshTimeoutStatus(request: NextRequest, userId: string): SessionTimeoutStatus {
    const cacheKey = this.generateCacheKey(userId, request);
    
    // Remove from cache
    this.timeoutCache.delete(cacheKey);
    
    // Calculate fresh status
    return this.checkSessionTimeout(request, userId);
  }

  /**
   * Clear timeout cache for user
   */
  clearUserTimeoutCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.timeoutCache.entries()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.timeoutCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalEntries = this.timeoutCache.size;
    const expiredEntries = Array.from(this.timeoutCache.values())
      .filter(entry => Date.now() > entry.expiresAt).length;
    
    return {
      totalEntries,
      expiredEntries,
      activeEntries: totalEntries - expiredEntries,
      maxSize: TIMEOUT_CACHE_CONFIG.MAX_CACHE_SIZE,
      utilizationRate: (totalEntries / TIMEOUT_CACHE_CONFIG.MAX_CACHE_SIZE) * 100,
    };
  }

  /**
   * Calculate timeout status from request
   */
  private calculateTimeoutStatus(request: NextRequest): SessionTimeoutStatus {
    const lastActivityHeader = request.headers.get('x-last-activity');
    const lastActivity = lastActivityHeader ? parseInt(lastActivityHeader, 10) : null;
    
    let timeSinceActivity = 0;
    let isExpired = false;
    
    if (lastActivity) {
      timeSinceActivity = Date.now() - lastActivity;
      isExpired = timeSinceActivity > SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION;
    }
    
    return {
      isExpired,
      lastActivity,
      timeSinceActivity,
      cached: false,
      checkedAt: Date.now(),
    };
  }

  /**
   * Generate cache key for timeout status
   */
  private generateCacheKey(userId: string, request: NextRequest): string {
    const lastActivity = request.headers.get('x-last-activity') || 'none';
    return `timeout:${userId}:${lastActivity}`;
  }

  /**
   * Get cached timeout status
   */
  private getCachedStatus(cacheKey: string): SessionTimeoutStatus | null {
    const entry = this.timeoutCache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry is still valid
    if (Date.now() > entry.expiresAt) {
      this.timeoutCache.delete(cacheKey);
      return null;
    }
    
    // Return cached status with updated flag
    return {
      ...entry.status,
      cached: true,
    };
  }

  /**
   * Cache timeout status
   */
  private setCachedStatus(cacheKey: string, status: SessionTimeoutStatus): void {
    // Prevent memory leaks by limiting cache size
    if (this.timeoutCache.size >= TIMEOUT_CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.evictOldEntries();
    }
    
    const entry: TimeoutCacheEntry = {
      status,
      expiresAt: Date.now() + TIMEOUT_CACHE_CONFIG.CACHE_TTL,
    };
    
    this.timeoutCache.set(cacheKey, entry);
  }

  /**
   * Evict old cache entries (LRU-style)
   */
  private evictOldEntries(): void {
    const now = Date.now();
    const entriesToRemove: string[] = [];
    
    // First, remove expired entries
    for (const [key, entry] of this.timeoutCache.entries()) {
      if (now > entry.expiresAt) {
        entriesToRemove.push(key);
      }
    }
    
    // If still over limit, remove oldest entries
    if (this.timeoutCache.size - entriesToRemove.length >= TIMEOUT_CACHE_CONFIG.MAX_CACHE_SIZE) {
      const entries = Array.from(this.timeoutCache.entries())
        .filter(([key]) => !entriesToRemove.includes(key))
        .sort((a, b) => a[1].status.checkedAt - b[1].status.checkedAt);
      
      const excessCount = (this.timeoutCache.size - entriesToRemove.length) - TIMEOUT_CACHE_CONFIG.MAX_CACHE_SIZE + 100;
      
      for (let i = 0; i < excessCount && i < entries.length; i++) {
        entriesToRemove.push(entries[i][0]);
      }
    }
    
    // Remove entries
    entriesToRemove.forEach(key => this.timeoutCache.delete(key));
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.evictOldEntries();
    }, TIMEOUT_CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.timeoutCache.clear();
  }

  /**
   * Format timeout duration for human reading
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Check if timeout duration exceeds threshold
   */
  static isNearTimeout(timeSinceActivity: number, warningThreshold: number = 0.8): boolean {
    const timeoutThreshold = SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION * warningThreshold;
    return timeSinceActivity > timeoutThreshold;
  }
}

// Singleton instance
export const sessionTimeoutService = new SessionTimeoutService();

// Export types
export type { SessionTimeoutStatus };

// Export configuration for testing
export { TIMEOUT_CACHE_CONFIG };