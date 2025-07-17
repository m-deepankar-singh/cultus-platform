import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { CustomJWTClaims } from './jwt-utils';
import { User } from '@supabase/supabase-js';

// Redis configuration
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache configuration
const AUTH_CACHE_CONFIG = {
  USER_DATA_TTL: 15 * 60, // 15 minutes in seconds
  ROUTE_CACHE_TTL: 60 * 60, // 1 hour in seconds
  ROLE_CACHE_TTL: 15 * 60, // 15 minutes in seconds
  MAX_RETRY_ATTEMPTS: 3,
  FALLBACK_TIMEOUT: 5000, // 5 seconds
} as const;

// Cache key generators
const CACHE_KEYS = {
  USER_AUTH: (userId: string) => `auth:user:${userId}`,
  USER_ROLE: (userId: string) => `auth:role:${userId}`,
  ROUTE_PATTERN: (pattern: string) => `auth:route:${pattern}`,
  ROUTE_CACHE: () => 'auth:routes:all',
} as const;

export interface CachedUserData {
  user: User;
  claims: CustomJWTClaims;
  cached_at: number;
}

export interface CachedRoleData {
  user_role: string;
  client_id: string;
  is_active: boolean;
  is_student: boolean;
  job_readiness_star_level?: number;
  job_readiness_tier?: string;
  cached_at: number;
}

export interface RoutePatternCache {
  [pattern: string]: {
    compiled_regex: string;
    last_used: number;
  };
}

export interface AuthCacheMetrics {
  cache_hits: number;
  cache_misses: number;
  database_fallbacks: number;
  redis_errors: number;
  average_response_time: number;
  hit_rate: number;
}

export class AuthCacheManager {
  private metrics: AuthCacheMetrics = {
    cache_hits: 0,
    cache_misses: 0,
    database_fallbacks: 0,
    redis_errors: 0,
    average_response_time: 0,
    hit_rate: 0,
  };

  // Local in-memory cache for route patterns only
  private routePatternCache: Map<string, { regex: RegExp; lastUsed: number }> = new Map();

  constructor() {
    // Clean up route pattern cache every hour
    setInterval(() => this.cleanupRoutePatternCache(), 60 * 60 * 1000);
  }

  /**
   * Get cached user authentication data with Redis-first approach
   */
  async getCachedUserAuth(userId: string): Promise<CachedUserData | null> {
    const startTime = Date.now();
    
    try {
      // Try Redis first
      const cacheKey = CACHE_KEYS.USER_AUTH(userId);
      const cachedData = await redis.get<CachedUserData>(cacheKey);
      
      if (cachedData) {
        this.metrics.cache_hits++;
        this.updateMetrics(Date.now() - startTime);
        return cachedData;
      }
      
      this.metrics.cache_misses++;
      this.updateMetrics(Date.now() - startTime);
      return null;
    } catch (error) {
      this.metrics.redis_errors++;
      this.metrics.database_fallbacks++;
      console.error('Redis cache error in getCachedUserAuth:', error);
      return null;
    }
  }

  /**
   * Cache user authentication data in Redis
   */
  async setCachedUserAuth(
    userId: string, 
    user: User, 
    claims: CustomJWTClaims
  ): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.USER_AUTH(userId);
      const userData: CachedUserData = {
        user,
        claims,
        cached_at: Date.now(),
      };
      
      await redis.set(cacheKey, userData, { ex: AUTH_CACHE_CONFIG.USER_DATA_TTL });
    } catch (error) {
      this.metrics.redis_errors++;
      console.error('Redis cache error in setCachedUserAuth:', error);
      // Fail silently - don't break auth flow
    }
  }

  /**
   * Get cached role data with Redis-first approach
   */
  async getCachedRoleData(userId: string): Promise<CachedRoleData | null> {
    const startTime = Date.now();
    
    try {
      const cacheKey = CACHE_KEYS.USER_ROLE(userId);
      const cachedData = await redis.get<CachedRoleData>(cacheKey);
      
      if (cachedData) {
        this.metrics.cache_hits++;
        this.updateMetrics(Date.now() - startTime);
        return cachedData;
      }
      
      this.metrics.cache_misses++;
      this.updateMetrics(Date.now() - startTime);
      return null;
    } catch (error) {
      this.metrics.redis_errors++;
      this.metrics.database_fallbacks++;
      console.error('Redis cache error in getCachedRoleData:', error);
      return null;
    }
  }

  /**
   * Cache role data in Redis
   */
  async setCachedRoleData(userId: string, roleData: Omit<CachedRoleData, 'cached_at'>): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.USER_ROLE(userId);
      const cacheData: CachedRoleData = {
        ...roleData,
        cached_at: Date.now(),
      };
      
      await redis.set(cacheKey, cacheData, { ex: AUTH_CACHE_CONFIG.ROLE_CACHE_TTL });
    } catch (error) {
      this.metrics.redis_errors++;
      console.error('Redis cache error in setCachedRoleData:', error);
      // Fail silently - don't break auth flow
    }
  }

  /**
   * Get user auth data with database fallback
   */
  async getUserAuthData(userId: string): Promise<CachedUserData | null> {
    // Try cache first
    const cachedData = await this.getCachedUserAuth(userId);
    if (cachedData) {
      return cachedData;
    }

    // Database fallback
    this.metrics.database_fallbacks++;
    
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user || user.id !== userId) {
        return null;
      }

      // Get role data from database
      const roleData = await this.getRoleDataFromDatabase(userId);
      if (!roleData) {
        return null;
      }

      // Build claims with proper type casting
      const claims: CustomJWTClaims = {
        user_role: this.castUserRole(roleData.user_role),
        client_id: roleData.client_id,
        profile_is_active: roleData.is_active,
        is_student: roleData.is_student,
        student_is_active: roleData.is_student ? roleData.is_active : undefined,
        job_readiness_star_level: this.castStarLevel(roleData.job_readiness_star_level),
        job_readiness_tier: this.castTier(roleData.job_readiness_tier),
      };

      const userData: CachedUserData = {
        user,
        claims,
        cached_at: Date.now(),
      };

      // Cache for next time (fire and forget)
      this.setCachedUserAuth(userId, user, claims).catch(console.error);
      
      return userData;
    } catch (error) {
      console.error('Database fallback error in getUserAuthData:', error);
      return null;
    }
  }

  /**
   * Get role data from database with caching
   */
  private async getRoleDataFromDatabase(userId: string): Promise<CachedRoleData | null> {
    // Try cache first
    const cachedRole = await this.getCachedRoleData(userId);
    if (cachedRole) {
      return cachedRole;
    }

    try {
      const supabase = await createClient();
      
      // Try students table first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, client_id, is_active, job_readiness_star_level, job_readiness_tier')
        .eq('id', userId)
        .single();

      if (student && !studentError) {
        const roleData: CachedRoleData = {
          user_role: 'student',
          client_id: student.client_id,
          is_active: student.is_active,
          is_student: true,
          job_readiness_star_level: student.job_readiness_star_level,
          job_readiness_tier: student.job_readiness_tier,
          cached_at: Date.now(),
        };

        // Cache for next time
        this.setCachedRoleData(userId, roleData).catch(console.error);
        return roleData;
      }

      // Try profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, client_id, is_active')
        .eq('id', userId)
        .single();

      if (profile && !profileError) {
        const roleData: CachedRoleData = {
          user_role: profile.role,
          client_id: profile.client_id,
          is_active: profile.is_active,
          is_student: false,
          cached_at: Date.now(),
        };

        // Cache for next time
        this.setCachedRoleData(userId, roleData).catch(console.error);
        return roleData;
      }

      return null;
    } catch (error) {
      console.error('Database role lookup error:', error);
      return null;
    }
  }

  /**
   * Cached route pattern matching (local memory cache only)
   */
  pathMatchesPattern(pathname: string, pattern: string): boolean {
    const cacheKey = pattern;
    
    // Check local cache first
    const cached = this.routePatternCache.get(cacheKey);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.regex.test(pathname);
    }

    // Compile regex and cache locally
    let regex: RegExp;
    if (pattern.includes('*')) {
      regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    } else {
      regex = new RegExp('^' + pattern + '(/.*)?$');
    }

    this.routePatternCache.set(cacheKey, {
      regex,
      lastUsed: Date.now(),
    });

    return regex.test(pathname);
  }

  /**
   * Clean up old route pattern cache entries
   */
  private cleanupRoutePatternCache(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, value] of this.routePatternCache.entries()) {
      if (value.lastUsed < oneHourAgo) {
        this.routePatternCache.delete(key);
      }
    }
  }

  /**
   * Invalidate user cache entries
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const userAuthKey = CACHE_KEYS.USER_AUTH(userId);
      const userRoleKey = CACHE_KEYS.USER_ROLE(userId);
      
      await Promise.all([
        redis.del(userAuthKey),
        redis.del(userRoleKey),
      ]);
    } catch (error) {
      console.error('Redis cache invalidation error:', error);
    }
  }

  /**
   * Clear all auth cache entries
   */
  async clearAllAuthCache(): Promise<void> {
    try {
      const pattern = 'auth:*';
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      // Clear local cache
      this.routePatternCache.clear();
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): AuthCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      cache_hits: 0,
      cache_misses: 0,
      database_fallbacks: 0,
      redis_errors: 0,
      average_response_time: 0,
      hit_rate: 0,
    };
  }

  /**
   * Update metrics with response time
   */
  private updateMetrics(responseTime: number): void {
    const total = this.metrics.cache_hits + this.metrics.cache_misses;
    this.metrics.average_response_time = 
      (this.metrics.average_response_time * (total - 1) + responseTime) / total;
    
    this.metrics.hit_rate = 
      this.metrics.cache_hits / (this.metrics.cache_hits + this.metrics.cache_misses) * 100;
  }

  /**
   * Cast user role to proper type
   */
  private castUserRole(role: string): 'Admin' | 'Staff' | 'Client Staff' | 'student' | undefined {
    if (['Admin', 'Staff', 'Client Staff', 'student'].includes(role)) {
      return role as 'Admin' | 'Staff' | 'Client Staff' | 'student';
    }
    return undefined;
  }

  /**
   * Cast star level to proper type
   */
  private castStarLevel(level: number | undefined): 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | undefined {
    if (level === undefined) return undefined;
    const levelMap: Record<number, 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'> = {
      1: 'ONE',
      2: 'TWO',
      3: 'THREE',
      4: 'FOUR',
      5: 'FIVE',
    };
    return levelMap[level];
  }

  /**
   * Cast tier to proper type
   */
  private castTier(tier: string | undefined): 'BRONZE' | 'SILVER' | 'GOLD' | undefined {
    if (tier === undefined) return undefined;
    const upperTier = tier.toUpperCase();
    if (['BRONZE', 'SILVER', 'GOLD'].includes(upperTier)) {
      return upperTier as 'BRONZE' | 'SILVER' | 'GOLD';
    }
    return undefined;
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ redis: boolean; metrics: AuthCacheMetrics }> {
    try {
      await redis.ping();
      return {
        redis: true,
        metrics: this.getMetrics(),
      };
    } catch (error) {
      return {
        redis: false,
        metrics: this.getMetrics(),
      };
    }
  }
}

// Singleton instance
export const authCacheManager = new AuthCacheManager();