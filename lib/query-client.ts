'use client';

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { cacheManager } from './cache/cache-manager';

// Query client configuration optimized for Vercel serverless
const QUERY_CLIENT_CONFIG = {
  // Maximum number of queries to keep in cache (reduced for serverless)
  maxSize: 50,
  
  // Garbage collection time (shorter for serverless functions)
  gcTime: 2 * 60 * 1000, // 2 minutes
  
  // Stale time (longer to reduce refetches in serverless)
  staleTime: 2 * 60 * 1000, // 2 minutes
  
  // Default retry configuration
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

// Create query cache with memory management (TanStack Query doesn't support maxSize directly)
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error('Query cache error:', error, {
      queryKey: query.queryKey,
      queryHash: query.queryHash,
    });
  },
  onSuccess: (data, query) => {
    // Optional: Log successful queries for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log('Query cache success:', {
        queryKey: query.queryKey,
        dataSize: JSON.stringify(data).length,
      });
    }
  },
});

// Create mutation cache with error handling
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    console.error('Mutation cache error:', error, {
      mutationKey: mutation.options.mutationKey,
    });
  },
  onSuccess: (data, _variables, _context, mutation) => {
    // Invalidate related cache entries on successful mutations
    if (mutation.options.mutationKey) {
      const key = mutation.options.mutationKey[0];
      if (typeof key === 'string') {
        // Invalidate database cache based on mutation type
        const tags = getCacheTagsForMutation(key);
        if (tags.length > 0) {
          cacheManager.invalidateByTags(tags).catch(console.error);
        }
      }
    }
  },
});

// Create the query client with bounded memory configuration
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      gcTime: QUERY_CLIENT_CONFIG.gcTime,
      staleTime: QUERY_CLIENT_CONFIG.staleTime,
      retry: QUERY_CLIENT_CONFIG.retry,
      retryDelay: QUERY_CLIENT_CONFIG.retryDelay,
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1, // Fewer retries for mutations
      retryDelay: 1000,
    },
  },
});

// Helper function to map mutation keys to cache tags
function getCacheTagsForMutation(mutationKey: string): string[] {
  const tagMap: Record<string, string[]> = {
    // User-related mutations
    'users': ['users', 'auth'],
    'profiles': ['users', 'auth'],
    'students': ['users', 'auth', 'students'],
    
    // Client-related mutations
    'clients': ['clients', 'dashboard'],
    'client_configs': ['client_configs', 'clients'],
    
    // Product-related mutations
    'products': ['products', 'job_readiness'],
    'modules': ['modules', 'module_content'],
    'lessons': ['module_content', 'lessons'],
    
    // Job readiness mutations
    'job_readiness_progress': ['student_progress', 'progress'],
    'job_readiness_assessments': ['products', 'assessments'],
    'expert_sessions': ['expert_sessions', 'content'],
    
    // Analytics mutations
    'analytics': ['analytics', 'dashboard', 'stats'],
  };
  
  return tagMap[mutationKey] || [];
}

// Memory monitoring utilities
export const queryClientUtils = {
  /**
   * Get current query cache statistics
   */
  getCacheStats() {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      maxSize: QUERY_CLIENT_CONFIG.maxSize,
      utilizationPercent: (queries.length / QUERY_CLIENT_CONFIG.maxSize) * 100,
      staleQueries: queries.filter(q => q.isStale()).length,
      inactiveQueries: queries.filter(q => !q.getObserversCount()).length,
    };
  },

  /**
   * Get memory usage estimation
   */
  getMemoryEstimation() {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    let totalSize = 0;
    queries.forEach(query => {
      if (query.state.data) {
        totalSize += JSON.stringify(query.state.data).length;
      }
    });
    
    return {
      estimatedSizeBytes: totalSize,
      estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      queriesWithData: queries.filter(q => q.state.data).length,
    };
  },

  /**
   * Clear queries that exceed memory thresholds
   */
  clearOldQueries(maxAge: number = 5 * 60 * 1000) {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const cutoffTime = Date.now() - maxAge;
    
    let clearedCount = 0;
    queries.forEach(query => {
      if (query.state.dataUpdatedAt < cutoffTime && !query.getObserversCount()) {
        cache.remove(query);
        clearedCount++;
      }
    });
    
    // If we have too many queries, remove the oldest ones
    if (queries.length > QUERY_CLIENT_CONFIG.maxSize) {
      const sortedQueries = queries
        .filter(q => !q.getObserversCount())
        .sort((a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt);
      
      const toRemove = sortedQueries.slice(0, queries.length - QUERY_CLIENT_CONFIG.maxSize);
      toRemove.forEach(query => {
        cache.remove(query);
        clearedCount++;
      });
    }
    
    return clearedCount;
  },

  /**
   * Force garbage collection on query cache
   */
  forceGarbageCollection() {
    const cache = queryClient.getQueryCache();
    cache.clear();
    return true;
  },
};

// Export configuration for testing and monitoring
export const queryClientConfig = QUERY_CLIENT_CONFIG;

// Development-only query cache monitoring (disabled in serverless)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Only run in browser environment, not in serverless functions
  setInterval(() => {
    const stats = queryClientUtils.getCacheStats();
    const memory = queryClientUtils.getMemoryEstimation();
    
    if (stats.utilizationPercent > 80) {
      console.warn('Query cache utilization high:', stats);
      console.warn('Memory estimation:', memory);
    }
  }, 30000);
}