import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';
import { cacheMonitor } from './monitoring/cache-monitor';

export function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 15, // Reduced from 30 to 15 minutes for memory management
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
    // Phase 2: Cache Size Limits - TanStack Query doesn't support maxSize directly
    // We'll implement manual cleanup in the monitoring functions
  });

  // Phase 2: Register TanStack Query cache with monitoring
  cacheMonitor.registerCache('tanstack-query', 100);
  cacheMonitor.registerCache('tanstack-mutations', 20);
  
  // Phase 3.3: Performance Monitoring Setup
  setupQueryMetrics(queryClient);
  
  // Phase 2: Implement manual cache size management
  setupCacheSizeManagement(queryClient);
  
  return queryClient;
}

/**
 * Phase 2 & 3.3: Enhanced TanStack Query Performance Monitoring
 * Subscribes to query and mutation cache events for performance tracking
 * and memory monitoring integration
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
        cacheMonitor.recordCacheHit('tanstack-query');
      } else if (metrics.state === 'pending' && metrics.fetchStatus === 'fetching') {
        // This is a cache miss
        cacheMonitor.recordCacheMiss('tanstack-query');
      }
    }
    
    // Monitor cache size changes
    if (event.type === 'added') {
      const estimatedSize = estimateQuerySize(event.query);
      cacheMonitor.recordCacheSet('tanstack-query', estimatedSize);
    } else if (event.type === 'removed') {
      const estimatedSize = estimateQuerySize(event.query);
      cacheMonitor.recordCacheDelete('tanstack-query', estimatedSize);
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
    
    // Monitor mutation cache size changes
    if (event.type === 'added') {
      const estimatedSize = estimateMutationSize(event.mutation);
      cacheMonitor.recordCacheSet('tanstack-mutations', estimatedSize);
    } else if (event.type === 'removed') {
      const estimatedSize = estimateMutationSize(event.mutation);
      cacheMonitor.recordCacheDelete('tanstack-mutations', estimatedSize);
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

/**
 * Phase 2: Estimate memory size of a query
 */
function estimateQuerySize(query: any): number {
  try {
    // Estimate size based on serialized data
    const queryKeySize = JSON.stringify(query.queryKey).length * 2; // Unicode characters
    const dataSize = query.state.data ? JSON.stringify(query.state.data).length * 2 : 0;
    const errorSize = query.state.error ? JSON.stringify(query.state.error).length * 2 : 0;
    
    // Add overhead for object structure and metadata
    const overhead = 1024; // 1KB overhead per query
    
    return queryKeySize + dataSize + errorSize + overhead;
  } catch {
    return 1024; // Default 1KB if estimation fails
  }
}

/**
 * Phase 2: Estimate memory size of a mutation
 */
function estimateMutationSize(mutation: any): number {
  try {
    // Estimate size based on serialized data
    const keySize = mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey).length * 2 : 0;
    const variablesSize = mutation.state.variables ? JSON.stringify(mutation.state.variables).length * 2 : 0;
    const dataSize = mutation.state.data ? JSON.stringify(mutation.state.data).length * 2 : 0;
    const errorSize = mutation.state.error ? JSON.stringify(mutation.state.error).length * 2 : 0;
    
    // Add overhead for object structure and metadata
    const overhead = 512; // 512B overhead per mutation
    
    return keySize + variablesSize + dataSize + errorSize + overhead;
  } catch {
    return 512; // Default 512B if estimation fails
  }
}

/**
 * Phase 2: Manual cache size management
 * Implements maxSize behavior by periodically cleaning up old queries
 */
function setupCacheSizeManagement(queryClient: QueryClient) {
  const MAX_QUERIES = 100;
  const MAX_MUTATIONS = 20;
  const CLEANUP_INTERVAL = 60000; // 1 minute
  
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  const cleanupCaches = () => {
    const queryCache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    // Clean up queries if over limit
    const queries = queryCache.getAll();
    if (queries.length > MAX_QUERIES) {
      const inactiveQueries = queries
        .filter(q => !q.getObserversCount())
        .sort((a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt);
      
      const toRemove = inactiveQueries.slice(0, queries.length - MAX_QUERIES);
      toRemove.forEach(query => queryCache.remove(query));
    }
    
    // Clean up mutations if over limit
    const mutations = mutationCache.getAll();
    if (mutations.length > MAX_MUTATIONS) {
      const oldMutations = mutations
        .sort((a, b) => (a.state.submittedAt || 0) - (b.state.submittedAt || 0));
      
      const toRemove = oldMutations.slice(0, mutations.length - MAX_MUTATIONS);
      toRemove.forEach(mutation => mutationCache.remove(mutation));
    }
  };
  
  // Run cleanup periodically
  setInterval(cleanupCaches, CLEANUP_INTERVAL);
  
  // Run initial cleanup
  cleanupCaches();
} 