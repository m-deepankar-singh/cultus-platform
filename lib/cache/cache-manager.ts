import { createClient } from '@/lib/supabase/server';

export interface CacheConfig {
  duration: string; // e.g., '5 minutes', '1 hour'
  tags: string[];   // For tag-based invalidation
}

export interface CacheMetrics {
  total_entries: number;
  average_hits: number;
  max_hits: number;
  reused_entries: number;
  oldest_entry: string;
  newest_entry: string;
  expired_entries: number;
}

export interface CacheEntry {
  cache_key: string;
  hit_count: number;
  created_at: string;
  expires_at: string;
  cache_tags: string[];
}

export class DatabaseCacheManager {
  private async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Get cached expert sessions data
   */
  async getCachedExpertSessions(
    productId?: string,
    duration: string = '5 minutes'
  ): Promise<any> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_expert_sessions_with_stats_cached', {
      p_product_id: productId || null,
      p_cache_duration: duration
    });

    if (error) {
      console.error('Expert sessions cache error:', error);
      throw new Error(`Cache operation failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Get cached product performance data
   */
  async getCachedProductPerformance(
    clientId?: string,
    duration: string = '15 minutes'
  ): Promise<any> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_product_performance_cached', {
      p_client_id: clientId || null,
      p_cache_duration: duration
    });

    if (error) {
      console.error('Product performance cache error:', error);
      throw new Error(`Cache operation failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Generic cached data retrieval
   */
  async getCachedData(
    cacheKey: string,
    duration: string = '10 minutes'
  ): Promise<any> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('get_cached_data', {
      p_cache_key: cacheKey,
      p_cache_duration: duration
    });

    if (error) {
      console.error('Cache retrieval error:', error);
      throw new Error(`Cache retrieval failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Generic cache data storage
   */
  async setCachedData(
    cacheKey: string,
    data: any,
    duration: string = '10 minutes',
    tags: string[] = []
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc('set_cached_data', {
      p_cache_key: cacheKey,
      p_cache_data: data,
      p_cache_duration: duration,
      p_cache_tags: tags
    });

    if (error) {
      console.error('Cache storage error:', error);
      throw new Error(`Cache storage failed: ${error.message}`);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('invalidate_cache_by_tags', {
      p_tags: tags
    });

    if (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Update cache hit count for analytics
   */
  async updateHitCount(cacheKey: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc('update_cache_hit_count', {
      p_cache_key: cacheKey
    });

    if (error) {
      console.error('Hit count update error:', error);
    }
  }

  /**
   * Get cache performance metrics
   */
  async getCacheMetrics(): Promise<CacheMetrics | null> {
    const supabase = await this.getSupabaseClient();
    
    try {
      // Get basic counts
      const { count: totalEntries } = await supabase
        .from('query_cache')
        .select('*', { count: 'exact', head: true });

      const { count: reusedEntries } = await supabase
        .from('query_cache')
        .select('*', { count: 'exact', head: true })
        .gt('hit_count', 0);

      const { count: expiredEntries } = await supabase
        .from('query_cache')
        .select('*', { count: 'exact', head: true })
        .lte('expires_at', new Date().toISOString());

      // Get aggregated data
      const { data: aggregates } = await supabase
        .from('query_cache')
        .select('hit_count, created_at')
        .order('hit_count', { ascending: false })
        .limit(1000);

      if (!aggregates) return null;

      const hitCounts = aggregates.map(row => row.hit_count || 0);
      const averageHits = hitCounts.length > 0 
        ? hitCounts.reduce((sum, hits) => sum + hits, 0) / hitCounts.length 
        : 0;
      const maxHits = hitCounts.length > 0 ? Math.max(...hitCounts) : 0;

      const dates = aggregates.map(row => row.created_at).filter(Boolean);
      const oldestEntry = dates.length > 0 ? dates[dates.length - 1] : '';
      const newestEntry = dates.length > 0 ? dates[0] : '';

      return {
        total_entries: totalEntries || 0,
        average_hits: averageHits,
        max_hits: maxHits,
        reused_entries: reusedEntries || 0,
        oldest_entry: oldestEntry,
        newest_entry: newestEntry,
        expired_entries: expiredEntries || 0
      };
    } catch (error) {
      console.error('Cache metrics error:', error);
      return null;
    }
  }

  /**
   * Get top cache entries by hit count
   */
  async getTopCacheEntries(limit: number = 20): Promise<CacheEntry[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('query_cache')
      .select('cache_key, hit_count, created_at, expires_at, cache_tags')
      .order('hit_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Top cache entries error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase.rpc('cleanup_expired_cache');

    if (error) {
      console.error('Cache cleanup error:', error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    const metrics = await this.getCacheMetrics();
    const topEntries = await this.getTopCacheEntries(10);

    if (!metrics) return null;

    const hitRate = metrics.total_entries > 0 
      ? (metrics.reused_entries / metrics.total_entries * 100).toFixed(1)
      : '0';

    return {
      metrics,
      topEntries,
      hitRate: parseFloat(hitRate),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cache wrapper function for any database operation
   */
  async withCache<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    options: {
      duration?: string;
      tags?: string[];
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const {
      duration = '10 minutes',
      tags = [],
      forceRefresh = false
    } = options;

    // If force refresh, skip cache lookup
    if (!forceRefresh) {
      try {
        const cachedData = await this.getCachedData(cacheKey, duration);
        if (cachedData !== null) {
          // Update hit count in background
          this.updateHitCount(cacheKey).catch(console.error);
          return cachedData;
        }
      } catch (error) {
        console.warn('Cache lookup failed, falling back to fresh data:', error);
      }
    }

    // Fetch fresh data
    const freshData = await fetchFunction();

    // Store in cache (fire and forget)
    this.setCachedData(cacheKey, freshData, duration, tags)
      .catch(error => console.error('Failed to cache data:', error));

    return freshData;
  }
}

// Singleton instance
export const cacheManager = new DatabaseCacheManager();

// Utility functions for common cache patterns
export const CacheUtils = {
  /**
   * Generate cache key for student progress
   */
  studentProgressKey: (studentId: string, moduleId?: string) => 
    `student_progress:${studentId}${moduleId ? `:${moduleId}` : ''}`,

  /**
   * Generate cache key for product performance
   */
  productPerformanceKey: (clientId?: string) => 
    `product_performance:${clientId || 'all'}`,

  /**
   * Generate cache key for expert sessions
   */
  expertSessionsKey: (productId?: string) => 
    `expert_sessions:${productId || 'all'}`,

  /**
   * Generate cache key for module analytics
   */
  moduleAnalyticsKey: (moduleId: string, dateRange?: string) => 
    `module_analytics:${moduleId}:${dateRange || 'default'}`,

  /**
   * Common cache durations
   */
  durations: {
    SHORT: '2 minutes',
    MEDIUM: '5 minutes', 
    LONG: '15 minutes',
    EXTENDED: '1 hour',
    DAILY: '24 hours'
  },

  /**
   * Common cache tag patterns
   */
  tags: {
    STUDENT_PROGRESS: ['student_progress', 'progress'],
    EXPERT_SESSIONS: ['expert_sessions', 'sessions', 'stats'],
    PRODUCT_PERFORMANCE: ['products', 'performance', 'analytics'],
    MODULE_DATA: ['modules', 'module_completion'],
    ANALYTICS: ['analytics', 'stats', 'performance']
  }
}; 