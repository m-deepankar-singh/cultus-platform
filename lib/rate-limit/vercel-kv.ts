import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Sliding window rate limiter using Upstash Redis
 * Implements a precise sliding window algorithm with automatic cleanup
 */
export class UpstashRateLimiter {
  private keyPrefix: string;
  private redis: Redis;
  
  constructor(keyPrefix: string = 'rate_limit') {
    this.keyPrefix = keyPrefix;
    this.redis = Redis.fromEnv();
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier for the rate limit (e.g., user ID, IP)
   * @param config - Rate limit configuration
   * @returns Promise<RateLimitResult>
   */
  async checkRateLimit(
    identifier: string, 
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    try {
      // Get current request timestamps from Redis
      const timestamps: number[] = await this.redis.get(key) || [];
      
      // Filter out timestamps outside the current window
      const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
      
      // Check if we're within the limit
      const currentRequests = validTimestamps.length;
      const allowed = currentRequests < config.limit;
      
      if (allowed) {
        // Add current timestamp and store back to Redis
        validTimestamps.push(now);
        await this.redis.set(key, validTimestamps, { 
          ex: Math.ceil(config.windowMs / 1000) // Expire after window duration
        });
      }
      
      const remaining = Math.max(0, config.limit - currentRequests - (allowed ? 1 : 0));
      const resetTime = Math.min(...validTimestamps) + config.windowMs;
      
      return {
        allowed,
        remaining,
        resetTime,
        totalRequests: currentRequests + (allowed ? 1 : 0)
      };
      
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On KV failure, allow the request but log the error
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetTime: now + config.windowMs,
        totalRequests: 1
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Unique identifier to reset
   */
  async resetRateLimit(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Get current rate limit status without incrementing
   * @param identifier - Unique identifier to check
   * @param config - Rate limit configuration
   */
  async getRateLimitStatus(
    identifier: string, 
    config: RateLimitConfig
  ): Promise<Omit<RateLimitResult, 'allowed'>> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    try {
      const timestamps: number[] = await this.redis.get(key) || [];
      const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
      const currentRequests = validTimestamps.length;
      const remaining = Math.max(0, config.limit - currentRequests);
      const resetTime = validTimestamps.length > 0 ? 
        Math.min(...validTimestamps) + config.windowMs : 
        now + config.windowMs;
      
      return {
        remaining,
        resetTime,
        totalRequests: currentRequests
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        remaining: config.limit,
        resetTime: now + config.windowMs,
        totalRequests: 0
      };
    }
  }
}

// Default instance
export const rateLimiter = new UpstashRateLimiter();

// Convenience function for simple rate limiting
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  keyPrefix?: string
): Promise<RateLimitResult> {
  const limiter = keyPrefix ? new UpstashRateLimiter(keyPrefix) : rateLimiter;
  return limiter.checkRateLimit(identifier, { limit, windowMs });
}