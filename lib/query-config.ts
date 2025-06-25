import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

export function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes (v5 renamed from cacheTime)
        refetchOnWindowFocus: false,
        refetchOnReconnect: true, // Good for offline support
        refetchOnMount: true,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });

  // Phase 3.3: Performance Monitoring Setup
  setupQueryMetrics(queryClient);
  
  return queryClient;
}

/**
 * Phase 3.3: TanStack Query Performance Monitoring
 * Subscribes to query and mutation cache events for performance tracking
 */
export function setupQueryMetrics(queryClient: QueryClient) {
  if (typeof window === 'undefined') return; // Only run on client side
  
  // Subscribe to query cache events
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'observerResultsUpdated') {
      const query = event.query;
      const metrics = {
        queryKey: query.queryKey,
        state: query.state.status,
        dataUpdatedAt: query.state.dataUpdatedAt,
        errorUpdatedAt: query.state.errorUpdatedAt,
        fetchStatus: query.state.fetchStatus,
        isStale: query.isStale(),
        timestamp: Date.now()
      };
      
      // Log performance metrics (can be enhanced to send to analytics)
      if (process.env.NODE_ENV === 'development') {
        console.log('[TanStack Query] Query metrics:', metrics);
      }
      
      // Track cache hit rate
      if (metrics.state === 'success' && metrics.fetchStatus === 'idle') {
        // This is a cache hit
        trackCacheHit(query.queryKey);
      }
    }
  });
  
  // Subscribe to mutation cache events
  queryClient.getMutationCache().subscribe((event) => {
    if (event.type === 'updated') {
      const mutation = event.mutation;
      const metrics = {
        mutationKey: mutation.options.mutationKey,
        state: mutation.state.status,
        submittedAt: mutation.state.submittedAt,
        variables: mutation.state.variables,
        timestamp: Date.now()
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[TanStack Query] Mutation metrics:', metrics);
      }
      
      // Track mutation success/error rates
      if (metrics.state === 'success' || metrics.state === 'error') {
        trackMutationResult(metrics.state, mutation.options.mutationKey);
      }
    }
  });
}

/**
 * Track cache hit rates for performance monitoring
 */
function trackCacheHit(queryKey: unknown[]) {
  const key = JSON.stringify(queryKey);
  const hits = getCacheHitCount();
  hits[key] = (hits[key] || 0) + 1;
  sessionStorage.setItem('tanstack-cache-hits', JSON.stringify(hits));
}

/**
 * Track mutation success/error rates
 */
function trackMutationResult(state: string, mutationKey?: readonly unknown[]) {
  const results = getMutationResults();
  const key = mutationKey ? JSON.stringify(mutationKey) : 'unknown';
  if (!results[key]) results[key] = { success: 0, error: 0 };
  results[key][state as keyof typeof results[typeof key]]++;
  sessionStorage.setItem('tanstack-mutation-results', JSON.stringify(results));
}

/**
 * Get current cache hit counts
 */
function getCacheHitCount(): Record<string, number> {
  try {
    const stored = sessionStorage.getItem('tanstack-cache-hits');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get current mutation results
 */
function getMutationResults(): Record<string, { success: number; error: number }> {
  try {
    const stored = sessionStorage.getItem('tanstack-mutation-results');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get performance statistics for monitoring dashboard
 */
export function getQueryPerformanceStats() {
  const cacheHits = getCacheHitCount();
  const mutationResults = getMutationResults();
  
  const totalHits = Object.values(cacheHits).reduce((sum, count) => sum + count, 0);
  const totalMutations = Object.values(mutationResults).reduce(
    (sum, result) => sum + result.success + result.error, 0
  );
  const successfulMutations = Object.values(mutationResults).reduce(
    (sum, result) => sum + result.success, 0
  );
  
  return {
    cacheHitRate: totalHits > 0 ? ((totalHits / (totalHits + 1)) * 100).toFixed(1) + '%' : '0%',
    totalCacheHits: totalHits,
    mutationSuccessRate: totalMutations > 0 ? ((successfulMutations / totalMutations) * 100).toFixed(1) + '%' : '0%',
    totalMutations,
    topQueries: Object.entries(cacheHits)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query: JSON.parse(query), hitCount: count })),
    mutationStats: mutationResults
  };
} 