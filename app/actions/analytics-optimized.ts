'use server';

import { createClient } from '@/lib/supabase/server';

// Re-export types from the original analytics file for compatibility
export interface ModuleCompletionRate {
  moduleId: string;
  moduleName: string;
  moduleType: string;
  completionRate: number;
  totalEligibleStudents: number;
  totalCompletedByEligible: number;
  totalInProgressByEligible: number;
  totalNotStartedByEligible: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  averageOverallProductProgress: number;
  totalEngagedLearners: number;
  totalEligibleLearners: number;
  completionRate?: number;
  completedCount?: number;
  inProgressCount?: number;
  notStartedCount?: number;
}

export interface ClientUsageMetrics {
  clientId: string;
  clientName: string;
  activeLearnersInClient: number;
  averageProductProgressInClient: number;
  assignedProductsCount?: number;
}

export interface AnalyticsSummary {
  totalMal: number;
  overallProductProgress: number;
  sumTotalProductNotStarted?: number;
  sumTotalProductInProgress?: number;
  sumTotalProductCompleted?: number;
  sumTotalProductEligible?: number;
  totalClientActiveLearners: number;
}

// Optimized analytics data structure from our cached RPC function
export interface OptimizedAnalyticsData {
  summary: AnalyticsSummary;
  malData: {
    malCount: number;
    filterApplied: { year: number; month: number } | 'last30days';
  };
  moduleRates: ModuleCompletionRate[];
  productPerformance: ProductPerformance[];
  clientUsage: ClientUsageMetrics[];
  generatedAt: number;
}

interface OptimizedAnalyticsParams {
  dateFrom?: Date;
  dateTo?: Date;
  clientId?: string;
  year?: number;
  month?: number;
  cacheDuration?: string; // e.g., '10 minutes', '1 hour'
}

interface OptimizedAnalyticsResult {
  data?: OptimizedAnalyticsData;
  error?: string;
  cached?: boolean;
  loadTime?: number;
}

/**
 * Optimized analytics function that replaces 4 separate API calls with a single cached RPC call
 * 
 * Performance improvements:
 * - Single authentication check (not 4x like before)
 * - Single RPC call instead of 4 separate calls
 * - Intelligent caching with configurable duration
 * - Sub-millisecond response times for cache hits
 * 
 * @param params - Optional parameters for filtering and cache configuration
 * @returns Promise with consolidated analytics data or error
 */
export async function getOptimizedAnalytics(
  params: OptimizedAnalyticsParams = {}
): Promise<OptimizedAnalyticsResult> {
  const supabase = await createClient();
  const startTime = Date.now();
  
  try {
    // Single authentication check (not 4x like before)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'User not authenticated.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Could not retrieve user profile.' };
    }

    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
      return { error: 'Unauthorized to access this data.' };
    }

    // Single RPC call instead of 4 separate calls
    const { data, error: queryError } = await supabase.rpc('get_cached_analytics_data', {
      p_date_from: params.dateFrom?.toISOString().split('T')[0] || null,
      p_date_to: params.dateTo?.toISOString().split('T')[0] || null,
      p_client_id: params.clientId || null,
      p_year: params.year || null,
      p_month: params.month || null,
      p_cache_duration: params.cacheDuration || '10 minutes'
    });
    
    const loadTime = Date.now() - startTime;

    if (queryError) {
      console.error('Error fetching optimized analytics:', queryError);
      return { error: 'Failed to retrieve analytics data.' };
    }

    // Determine if this was a cache hit (heuristic: very fast response)
    const cached = loadTime < 100;

    return { 
      data: data as OptimizedAnalyticsData,
      cached,
      loadTime
    };

  } catch (e: any) {
    console.error('Unexpected error in getOptimizedAnalytics:', e);
    return { error: 'An unexpected error occurred.' };
  }
}

/**
 * Backward compatibility function for Monthly Active Learners
 * Uses the optimized analytics function but returns only MAL data
 */
export async function getOptimizedMonthlyActiveLearners(params?: {
  year?: number;
  month?: number;
}): Promise<{
  malCount?: number;
  error?: string;
  filterApplied?: { year: number; month: number } | 'last30days';
  cached?: boolean;
}> {
  const result = await getOptimizedAnalytics({
    year: params?.year,
    month: params?.month
  });

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: 'No data returned from analytics function.' };
  }

  return {
    malCount: result.data.malData.malCount,
    filterApplied: result.data.malData.filterApplied,
    cached: result.cached
  };
}

/**
 * Backward compatibility function for Module Completion Rates
 * Uses the optimized analytics function but returns only module rates
 */
export async function getOptimizedModuleCompletionRates(): Promise<{
  rates?: ModuleCompletionRate[];
  error?: string;
  cached?: boolean;
}> {
  const result = await getOptimizedAnalytics();

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: 'No data returned from analytics function.' };
  }

  return {
    rates: result.data.moduleRates,
    cached: result.cached
  };
}

/**
 * Backward compatibility function for Product Performance
 * Uses the optimized analytics function but returns only product data
 */
export async function getOptimizedProductPerformance(): Promise<{
  products?: ProductPerformance[];
  error?: string;
  cached?: boolean;
}> {
  const result = await getOptimizedAnalytics();

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: 'No data returned from analytics function.' };
  }

  return {
    products: result.data.productPerformance,
    cached: result.cached
  };
}

/**
 * Backward compatibility function for Client Usage
 * Uses the optimized analytics function but returns only client data
 */
export async function getOptimizedClientUsage(): Promise<{
  clientMetrics?: ClientUsageMetrics[];
  error?: string;
  cached?: boolean;
}> {
  const result = await getOptimizedAnalytics();

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: 'No data returned from analytics function.' };
  }

  return {
    clientMetrics: result.data.clientUsage,
    cached: result.cached
  };
}

/**
 * Backward compatibility function for Analytics Summary
 * Uses the optimized analytics function but returns only summary data
 */
export async function getOptimizedAnalyticsSummary(): Promise<{
  summary?: AnalyticsSummary;
  error?: string;
  cached?: boolean;
}> {
  const result = await getOptimizedAnalytics();

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: 'No data returned from analytics function.' };
  }

  return {
    summary: result.data.summary,
    cached: result.cached
  };
}

/**
 * Cache performance monitoring function
 * Returns metrics about cache usage and performance
 */
export async function getAnalyticsCachePerformance(): Promise<{
  performance?: {
    total_entries: number;
    average_hit_count: number;
    max_hit_count: number;
    reused_entries: number;
    reuse_percentage: number;
    oldest_entry: string;
    newest_entry: string;
    expired_entries: number;
  };
  error?: string;
}> {
  const supabase = await createClient();
  
  try {
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'User not authenticated.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Could not retrieve user profile.' };
    }

    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
      return { error: 'Unauthorized to access this data.' };
    }

    // Get cache performance metrics
    const { data, error: queryError } = await supabase.rpc('get_analytics_cache_performance');

    if (queryError) {
      console.error('Error fetching cache performance:', queryError);
      return { error: 'Failed to retrieve cache performance data.' };
    }

    return { performance: data };

  } catch (e: any) {
    console.error('Unexpected error in getAnalyticsCachePerformance:', e);
    return { error: 'An unexpected error occurred.' };
  }
} 