import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import { CustomJWTClaims } from './jwt-utils';

// Redis configuration
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache configuration
const ROLE_CACHE_CONFIG = {
  TTL: 15 * 60, // 15 minutes in seconds
  BULK_FETCH_SIZE: 100,
  MAX_RETRY_ATTEMPTS: 3,
} as const;

// Cache key generators
const ROLE_CACHE_KEYS = {
  USER_ROLE: (userId: string) => `role:user:${userId}`,
  BULK_ROLES: (userIds: string[]) => `role:bulk:${userIds.sort().join(':')}`,
  ROLE_PERMISSIONS: (role: string) => `role:permissions:${role}`,
} as const;

export interface UserRoleData {
  user_id: string;
  user_role: string;
  client_id: string;
  is_active: boolean;
  is_student: boolean;
  profile_is_active?: boolean;
  student_is_active?: boolean;
  job_readiness_star_level?: number;
  job_readiness_tier?: string;
  cached_at: number;
}

export interface RolePermissions {
  role: string;
  permissions: string[];
  access_patterns: string[];
  route_patterns: string[];
  cached_at: number;
}

export interface RoleServiceMetrics {
  cache_hits: number;
  cache_misses: number;
  database_queries: number;
  bulk_operations: number;
  average_response_time: number;
  error_count: number;
}

export class CachedRoleService {
  private metrics: RoleServiceMetrics = {
    cache_hits: 0,
    cache_misses: 0,
    database_queries: 0,
    bulk_operations: 0,
    average_response_time: 0,
    error_count: 0,
  };

  /**
   * Get user role data with Redis caching
   */
  async getUserRole(userId: string): Promise<UserRoleData | null> {
    const startTime = Date.now();
    
    try {
      // Try Redis first
      const cacheKey = ROLE_CACHE_KEYS.USER_ROLE(userId);
      const cachedData = await redis.get<UserRoleData>(cacheKey);
      
      if (cachedData) {
        this.metrics.cache_hits++;
        this.updateMetrics(Date.now() - startTime);
        return cachedData;
      }
      
      // Cache miss - fetch from database
      this.metrics.cache_misses++;
      const roleData = await this.fetchRoleFromDatabase(userId);
      
      if (roleData) {
        // Cache the result
        await this.cacheUserRole(userId, roleData);
      }
      
      this.updateMetrics(Date.now() - startTime);
      return roleData;
    } catch (error) {
      this.metrics.error_count++;
      console.error('Error in getUserRole:', error);
      
      // Fallback to database
      return this.fetchRoleFromDatabase(userId);
    }
  }

  /**
   * Get multiple user roles efficiently with bulk operations
   */
  async getUserRoles(userIds: string[]): Promise<Map<string, UserRoleData>> {
    const startTime = Date.now();
    this.metrics.bulk_operations++;
    
    const result = new Map<string, UserRoleData>();
    const missingUserIds: string[] = [];
    
    try {
      // Batch get from Redis
      const cacheKeys = userIds.map(id => ROLE_CACHE_KEYS.USER_ROLE(id));
      const cachedData = await redis.mget<UserRoleData[]>(...cacheKeys);
      
      // Process cached results
      userIds.forEach((userId, index) => {
        const cached = cachedData[index];
        if (cached) {
          result.set(userId, cached);
          this.metrics.cache_hits++;
        } else {
          missingUserIds.push(userId);
          this.metrics.cache_misses++;
        }
      });
      
      // Fetch missing roles from database
      if (missingUserIds.length > 0) {
        const freshRoles = await this.fetchRolesFromDatabase(missingUserIds);
        
        // Add to result and cache
        const cacheOperations = freshRoles.map(roleData => {
          result.set(roleData.user_id, roleData);
          return this.cacheUserRole(roleData.user_id, roleData);
        });
        
        // Cache all fresh data concurrently
        await Promise.allSettled(cacheOperations);
      }
      
      this.updateMetrics(Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.error_count++;
      console.error('Error in getUserRoles:', error);
      
      // Fallback to database for all users
      const allRoles = await this.fetchRolesFromDatabase(userIds);
      allRoles.forEach(roleData => {
        result.set(roleData.user_id, roleData);
      });
      
      return result;
    }
  }

  /**
   * Get role permissions with caching
   */
  async getRolePermissions(role: string): Promise<RolePermissions | null> {
    try {
      const cacheKey = ROLE_CACHE_KEYS.ROLE_PERMISSIONS(role);
      const cachedData = await redis.get<RolePermissions>(cacheKey);
      
      if (cachedData) {
        this.metrics.cache_hits++;
        return cachedData;
      }
      
      // Fetch from database or define static permissions
      const permissions = this.getStaticRolePermissions(role);
      if (permissions) {
        await redis.set(cacheKey, permissions, { ex: ROLE_CACHE_CONFIG.TTL });
        this.metrics.cache_misses++;
      }
      
      return permissions;
    } catch (error) {
      this.metrics.error_count++;
      console.error('Error in getRolePermissions:', error);
      return this.getStaticRolePermissions(role);
    }
  }

  /**
   * Update user role and invalidate cache
   */
  async updateUserRole(userId: string, newRoleData: Omit<UserRoleData, 'user_id' | 'cached_at'>): Promise<void> {
    try {
      // Update in database first
      await this.updateRoleInDatabase(userId, newRoleData);
      
      // Create full role data
      const fullRoleData: UserRoleData = {
        user_id: userId,
        ...newRoleData,
        cached_at: Date.now(),
      };
      
      // Update cache
      await this.cacheUserRole(userId, fullRoleData);
    } catch (error) {
      this.metrics.error_count++;
      console.error('Error in updateUserRole:', error);
      throw error;
    }
  }

  /**
   * Invalidate user role cache
   */
  async invalidateUserRole(userId: string): Promise<void> {
    try {
      const cacheKey = ROLE_CACHE_KEYS.USER_ROLE(userId);
      await redis.del(cacheKey);
    } catch (error) {
      console.error('Error invalidating user role cache:', error);
    }
  }

  /**
   * Invalidate multiple user role caches
   */
  async invalidateUserRoles(userIds: string[]): Promise<void> {
    try {
      const cacheKeys = userIds.map(id => ROLE_CACHE_KEYS.USER_ROLE(id));
      if (cacheKeys.length > 0) {
        await redis.del(...cacheKeys);
      }
    } catch (error) {
      console.error('Error invalidating user roles cache:', error);
    }
  }

  /**
   * Cache user role data
   */
  private async cacheUserRole(userId: string, roleData: UserRoleData): Promise<void> {
    try {
      const cacheKey = ROLE_CACHE_KEYS.USER_ROLE(userId);
      await redis.set(cacheKey, roleData, { ex: ROLE_CACHE_CONFIG.TTL });
    } catch (error) {
      console.error('Error caching user role:', error);
    }
  }

  /**
   * Fetch single role from database
   */
  private async fetchRoleFromDatabase(userId: string): Promise<UserRoleData | null> {
    this.metrics.database_queries++;
    
    try {
      const supabase = await createClient();
      
      // Try students table first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, client_id, is_active, job_readiness_star_level, job_readiness_tier')
        .eq('id', userId)
        .single();

      if (student && !studentError) {
        return {
          user_id: userId,
          user_role: 'student',
          client_id: student.client_id,
          is_active: student.is_active,
          is_student: true,
          student_is_active: student.is_active,
          job_readiness_star_level: student.job_readiness_star_level,
          job_readiness_tier: student.job_readiness_tier,
          cached_at: Date.now(),
        };
      }

      // Try profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, client_id, is_active')
        .eq('id', userId)
        .single();

      if (profile && !profileError) {
        return {
          user_id: userId,
          user_role: profile.role,
          client_id: profile.client_id,
          is_active: profile.is_active,
          is_student: false,
          profile_is_active: profile.is_active,
          cached_at: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error('Database role fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch multiple roles from database
   */
  private async fetchRolesFromDatabase(userIds: string[]): Promise<UserRoleData[]> {
    this.metrics.database_queries++;
    
    try {
      const supabase = await createClient();
      const roles: UserRoleData[] = [];
      
      // Fetch students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, client_id, is_active, job_readiness_star_level, job_readiness_tier')
        .in('id', userIds);

      if (students && !studentsError) {
        students.forEach(student => {
          roles.push({
            user_id: student.id,
            user_role: 'student',
            client_id: student.client_id,
            is_active: student.is_active,
            is_student: true,
            student_is_active: student.is_active,
            job_readiness_star_level: student.job_readiness_star_level,
            job_readiness_tier: student.job_readiness_tier,
            cached_at: Date.now(),
          });
        });
      }

      // Get remaining user IDs not found in students
      const foundStudentIds = new Set(students?.map(s => s.id) || []);
      const remainingUserIds = userIds.filter(id => !foundStudentIds.has(id));

      if (remainingUserIds.length > 0) {
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, role, client_id, is_active')
          .in('id', remainingUserIds);

        if (profiles && !profilesError) {
          profiles.forEach(profile => {
            roles.push({
              user_id: profile.id,
              user_role: profile.role,
              client_id: profile.client_id,
              is_active: profile.is_active,
              is_student: false,
              profile_is_active: profile.is_active,
              cached_at: Date.now(),
            });
          });
        }
      }

      return roles;
    } catch (error) {
      console.error('Database roles fetch error:', error);
      return [];
    }
  }

  /**
   * Update role in database
   */
  private async updateRoleInDatabase(userId: string, roleData: Omit<UserRoleData, 'user_id' | 'cached_at'>): Promise<void> {
    this.metrics.database_queries++;
    
    try {
      const supabase = await createClient();
      
      if (roleData.is_student) {
        // Update students table
        await supabase
          .from('students')
          .update({
            client_id: roleData.client_id,
            is_active: roleData.is_active,
            job_readiness_star_level: roleData.job_readiness_star_level,
            job_readiness_tier: roleData.job_readiness_tier,
          })
          .eq('id', userId);
      } else {
        // Update profiles table
        await supabase
          .from('profiles')
          .update({
            role: roleData.user_role,
            client_id: roleData.client_id,
            is_active: roleData.is_active,
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Database role update error:', error);
      throw error;
    }
  }

  /**
   * Get static role permissions
   */
  private getStaticRolePermissions(role: string): RolePermissions | null {
    const permissionMap: Record<string, RolePermissions> = {
      'Admin': {
        role: 'Admin',
        permissions: ['*'],
        access_patterns: ['admin/*', 'api/admin/*'],
        route_patterns: ['/admin/*', '/api/admin/*', '/users', '/modules/create', '/modules/*/edit'],
        cached_at: Date.now(),
      },
      'Staff': {
        role: 'Staff',
        permissions: ['read', 'write:limited'],
        access_patterns: ['admin/*', 'api/admin/*', 'api/staff/*'],
        route_patterns: ['/admin/*', '/api/admin/*', '/api/staff/*'],
        cached_at: Date.now(),
      },
      'Viewer': {
        role: 'Viewer',
        permissions: ['read'],
        access_patterns: ['admin/*'],
        route_patterns: ['/admin/*'],
        cached_at: Date.now(),
      },
      'student': {
        role: 'student',
        permissions: ['read:student', 'write:student'],
        access_patterns: ['app/*', 'api/app/*'],
        route_patterns: ['/app/*', '/api/app/*'],
        cached_at: Date.now(),
      },
    };

    return permissionMap[role] || null;
  }

  /**
   * Convert role data to JWT claims with proper type casting
   */
  convertToJWTClaims(roleData: UserRoleData): CustomJWTClaims {
    return {
      user_role: this.castUserRole(roleData.user_role),
      client_id: roleData.client_id,
      profile_is_active: roleData.profile_is_active,
      is_student: roleData.is_student,
      student_is_active: roleData.student_is_active,
      job_readiness_star_level: this.castStarLevel(roleData.job_readiness_star_level),
      job_readiness_tier: this.castTier(roleData.job_readiness_tier),
    };
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
   * Get service metrics
   */
  getMetrics(): RoleServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      cache_hits: 0,
      cache_misses: 0,
      database_queries: 0,
      bulk_operations: 0,
      average_response_time: 0,
      error_count: 0,
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(responseTime: number): void {
    const total = this.metrics.cache_hits + this.metrics.cache_misses;
    this.metrics.average_response_time = 
      (this.metrics.average_response_time * (total - 1) + responseTime) / total;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ redis: boolean; database: boolean; metrics: RoleServiceMetrics }> {
    try {
      // Check Redis
      const redisHealth = await redis.ping();
      
      // Check database
      const supabase = await createClient();
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      return {
        redis: redisHealth === 'PONG',
        database: !error,
        metrics: this.getMetrics(),
      };
    } catch (error) {
      return {
        redis: false,
        database: false,
        metrics: this.getMetrics(),
      };
    }
  }
}

// Singleton instance
export const cachedRoleService = new CachedRoleService();