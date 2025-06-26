import { Ratelimit } from '@upstash/ratelimit';
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
 * Optimized rate limiter using Upstash's official rate limiting library
 * More efficient than our custom implementation with better performance
 */
export class UpstashOptimizedRateLimiter {
  private redis: Redis | null = null;
  private rateLimiters: Map<string, Ratelimit> = new Map();
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
    
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      if (!this.isDevelopment) {
        console.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not found in production');
      } else {
        console.warn('Rate limiting disabled: Upstash Redis credentials not found');
      }
      return;
    }
    
    this.redis = new Redis({
      url,
      token,
    });
  }

  /**
   * Get or create a rate limiter for a specific configuration
   */
  private getRateLimiter(config: RateLimitConfig): Ratelimit | null {
    if (!this.redis) {
      return null;
    }
    
    const configKey = `${config.limit}:${config.windowMs}:${config.keyPrefix || 'default'}`;
    
    if (!this.rateLimiters.has(configKey)) {
      const rateLimiter = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs}ms`),
        analytics: true,
        prefix: config.keyPrefix || 'rate_limit',
      });
      
      this.rateLimiters.set(configKey, rateLimiter);
    }
    
    return this.rateLimiters.get(configKey)!;
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
    try {
      const rateLimiter = this.getRateLimiter(config);
      
      // If rate limiter is not available (development mode), allow all requests
      if (!rateLimiter) {
        return {
          allowed: true,
          remaining: config.limit - 1,
          resetTime: Date.now() + config.windowMs,
          totalRequests: 1
        };
      }
      
      const result = await rateLimiter.limit(identifier);
      
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
        totalRequests: config.limit - result.remaining + (result.success ? 1 : 0)
      };
      
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetTime: Date.now() + config.windowMs,
        totalRequests: 1
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Unique identifier to reset
   * @param config - Rate limit configuration (needed to get the right limiter)
   */
  async resetRateLimit(identifier: string, config: RateLimitConfig): Promise<void> {
    try {
      if (!this.redis) {
        return; // No-op in development mode
      }
      
      const rateLimiter = this.getRateLimiter(config);
      if (!rateLimiter) {
        return;
      }
      
      // Upstash rate limiter doesn't have a direct reset method,
      // so we'll use the Redis client directly
      const key = `${config.keyPrefix || 'rate_limit'}:${identifier}`;
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
    try {
      if (!this.redis) {
        // Return default values in development mode
        return {
          remaining: config.limit,
          resetTime: Date.now() + config.windowMs,
          totalRequests: 0
        };
      }
      
      // For status check, we need to use the Redis client directly
      // since Upstash Ratelimit doesn't have a non-incrementing check
      const key = `${config.keyPrefix || 'rate_limit'}:${identifier}`;
      const now = Date.now();
      const windowStart = now - config.windowMs;
      
      // This is a simplified status check - for full accuracy,
      // you'd need to implement the same sliding window logic
      const exists = await this.redis.exists(key);
      
      if (!exists) {
        return {
          remaining: config.limit,
          resetTime: now + config.windowMs,
          totalRequests: 0
        };
      }

      // For now, return conservative estimates
      return {
        remaining: Math.floor(config.limit / 2), // Conservative estimate
        resetTime: now + config.windowMs,
        totalRequests: Math.floor(config.limit / 2)
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        remaining: config.limit,
        resetTime: Date.now() + config.windowMs,
        totalRequests: 0
      };
    }
  }
}

// Default instance
export const optimizedRateLimiter = new UpstashOptimizedRateLimiter();

// Convenience function for simple rate limiting
export async function checkRateLimitOptimized(
  identifier: string,
  limit: number,
  windowMs: number,
  keyPrefix?: string
): Promise<RateLimitResult> {
  return optimizedRateLimiter.checkRateLimit(identifier, { limit, windowMs, keyPrefix });
}