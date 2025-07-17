import { createClient } from '@/lib/supabase/server';
import { authCacheManager } from '@/lib/auth/auth-cache-manager';
import { cachedRoleService } from '@/lib/auth/cached-role-service';

export interface AuthPerformanceMetrics {
  phase: string;
  timestamp: string;
  database: {
    rpc_function_stats: {
      function_name: string;
      total_calls: number;
      avg_execution_time: number;
      cache_hit_ratio: number;
    }[];
    materialized_view_stats: {
      view_name: string;
      total_rows: number;
      last_refresh: string;
      size_mb: number;
    };
    query_performance: {
      avg_auth_query_time: number;
      slow_query_count: number;
    };
  };
  redis: {
    cache_hits: number;
    cache_misses: number;
    hit_rate: number;
    avg_response_time: number;
    database_fallbacks: number;
  };
  application: {
    auth_requests_per_minute: number;
    avg_auth_response_time: number;
    concurrent_users: number;
    error_rate: number;
  };
}

export class AuthPerformanceMonitor {
  private metrics: AuthPerformanceMetrics[] = [];

  constructor() {
    // No initialization needed - create client on demand
  }

  /**
   * Get Supabase client - only create when needed within request context
   */
  private async getSupabaseClient() {
    try {
      return await createClient();
    } catch (error) {
      console.error('Failed to create Supabase client for monitoring:', error);
      return null;
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<AuthPerformanceMetrics> {
    const timestamp = new Date().toISOString();

    // Get database metrics
    const databaseMetrics = await this.getDatabaseMetrics();
    
    // Get Redis metrics
    const redisMetrics = await this.getRedisMetrics();
    
    // Get application metrics
    const applicationMetrics = await this.getApplicationMetrics();

    const metrics: AuthPerformanceMetrics = {
      phase: 'Phase 2 - RPC + Redis Hybrid',
      timestamp,
      database: databaseMetrics,
      redis: redisMetrics,
      application: applicationMetrics,
    };

    // Store metrics for trending
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    return metrics;
  }

  /**
   * Get database performance metrics
   */
  private async getDatabaseMetrics() {
    const supabase = await this.getSupabaseClient();
    if (!supabase) {
      return this.getDefaultDatabaseMetrics();
    }

    try {
      // Get RPC function statistics
      const { data: rpcStats, error: rpcError } = await supabase.rpc('get_auth_performance_stats');
      
      if (rpcError) {
        console.error('Error getting RPC stats:', rpcError);
      }

      // Ensure rpcStats is an array - the RPC function returns a single row as an array
      const statsArray = Array.isArray(rpcStats) ? rpcStats : (rpcStats ? [rpcStats] : []);

      // Get cache row count
      const { count: cacheCount, error: cacheError } = await supabase
        .from('user_auth_cache')
        .select('*', { count: 'exact', head: true });

      if (cacheError) {
        console.error('Error getting cache count:', cacheError);
      }

      // Calculate approximate size based on row count
      const estimatedSizeMB = (cacheCount || 0) * 0.001; // Rough estimate

      return {
        rpc_function_stats: statsArray,
        materialized_view_stats: {
          view_name: 'user_auth_cache',
          total_rows: cacheCount || 0,
          last_refresh: new Date().toISOString(),
          size_mb: estimatedSizeMB,
        },
        query_performance: {
          avg_auth_query_time: statsArray[0]?.avg_execution_time || 0,
          slow_query_count: 0, // TODO: Implement slow query detection
        },
      };
    } catch (error) {
      console.error('Error getting database metrics:', error);
      return this.getDefaultDatabaseMetrics();
    }
  }

  /**
   * Get default database metrics when Supabase client fails
   */
  private getDefaultDatabaseMetrics() {
    return {
      rpc_function_stats: [],
      materialized_view_stats: {
        view_name: 'user_auth_cache',
        total_rows: 0,
        last_refresh: new Date().toISOString(),
        size_mb: 0,
      },
      query_performance: {
        avg_auth_query_time: 0,
        slow_query_count: 0,
      },
    };
  }

  /**
   * Get Redis cache metrics
   */
  private async getRedisMetrics() {
    try {
      const cacheMetrics = authCacheManager.getMetrics();
      const roleMetrics = cachedRoleService.getMetrics();

      return {
        cache_hits: cacheMetrics.cache_hits + roleMetrics.cache_hits,
        cache_misses: cacheMetrics.cache_misses + roleMetrics.cache_misses,
        hit_rate: cacheMetrics.hit_rate,
        avg_response_time: cacheMetrics.average_response_time,
        database_fallbacks: cacheMetrics.database_fallbacks,
      };
    } catch (error) {
      console.error('Error getting Redis metrics:', error);
      return {
        cache_hits: 0,
        cache_misses: 0,
        hit_rate: 0,
        avg_response_time: 0,
        database_fallbacks: 0,
      };
    }
  }

  /**
   * Get application-level metrics
   */
  private async getApplicationMetrics() {
    // This would typically come from application monitoring
    // For now, return placeholder values
    return {
      auth_requests_per_minute: 0, // TODO: Implement request counting
      avg_auth_response_time: 0,   // TODO: Implement response time tracking
      concurrent_users: 0,         // TODO: Implement concurrent user tracking
      error_rate: 0,               // TODO: Implement error rate tracking
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(timeRange: 'hour' | 'day' | 'week' = 'hour') {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = new Date(now.getTime() - timeRangeMs[timeRange]);
    
    return this.metrics.filter(metric => 
      new Date(metric.timestamp) >= cutoff
    );
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    const metrics = await this.getPerformanceMetrics();
    const trends = this.getPerformanceTrends('hour');

    return {
      current_metrics: metrics,
      trends: {
        cache_hit_rate_trend: trends.map(m => ({
          timestamp: m.timestamp,
          hit_rate: m.redis.hit_rate,
        })),
        response_time_trend: trends.map(m => ({
          timestamp: m.timestamp,
          avg_response_time: m.redis.avg_response_time,
        })),
        database_fallback_trend: trends.map(m => ({
          timestamp: m.timestamp,
          fallbacks: m.redis.database_fallbacks,
        })),
      },
      summary: {
        total_users_cached: metrics.database.materialized_view_stats.total_rows,
        cache_effectiveness: metrics.redis.hit_rate,
        performance_improvement: this.calculatePerformanceImprovement(trends),
        recommendations: this.generateRecommendations(metrics),
      },
    };
  }

  /**
   * Calculate performance improvement over time
   */
  private calculatePerformanceImprovement(trends: AuthPerformanceMetrics[]) {
    if (trends.length < 2) return 0;

    const first = trends[0];
    const last = trends[trends.length - 1];

    const responseTimeImprovement = 
      ((first.redis.avg_response_time - last.redis.avg_response_time) / first.redis.avg_response_time) * 100;

    const cacheHitImprovement = 
      ((last.redis.hit_rate - first.redis.hit_rate) / first.redis.hit_rate) * 100;

    return {
      response_time_improvement: responseTimeImprovement,
      cache_hit_improvement: cacheHitImprovement,
      overall_score: (responseTimeImprovement + cacheHitImprovement) / 2,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: AuthPerformanceMetrics) {
    const recommendations = [];

    // Cache hit rate recommendations
    if (metrics.redis.hit_rate < 85) {
      recommendations.push({
        type: 'cache_optimization',
        priority: 'high',
        message: 'Cache hit rate is below 85%. Consider increasing Redis TTL or investigating cache invalidation patterns.',
      });
    }

    // Response time recommendations
    if (metrics.redis.avg_response_time > 100) {
      recommendations.push({
        type: 'response_time',
        priority: 'medium',
        message: 'Average response time is above 100ms. Consider Redis connection pooling or geographic distribution.',
      });
    }

    // Database fallback recommendations
    if (metrics.redis.database_fallbacks > 10) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'High number of database fallbacks detected. Check Redis connection health and consider Redis clustering.',
      });
    }

    // Materialized view recommendations
    if (metrics.database.materialized_view_stats.size_mb > 100) {
      recommendations.push({
        type: 'storage',
        priority: 'low',
        message: 'Materialized view size is growing large. Consider implementing data archiving or partitioning.',
      });
    }

    return recommendations;
  }

  /**
   * Health check for authentication system
   */
  async healthCheck() {
    const authCacheHealth = await authCacheManager.healthCheck();
    const roleServiceHealth = await cachedRoleService.healthCheck();

    return {
      overall_health: authCacheHealth.redis && roleServiceHealth.redis && roleServiceHealth.database,
      components: {
        redis_cache: authCacheHealth.redis,
        role_service: roleServiceHealth.redis,
        database: roleServiceHealth.database,
      },
      metrics: {
        auth_cache: authCacheHealth.metrics,
        role_service: roleServiceHealth.metrics,
      },
    };
  }
}

// Export the class for instantiation within request contexts
// Note: Do not create singleton instance as it would cause cookies() context errors