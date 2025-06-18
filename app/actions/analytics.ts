'use server';

import { createClient } from '@/lib/supabase/server';
import { cacheManager, CacheUtils } from '@/lib/cache/cache-manager'; // Assuming you have this server client setup
// import { cookies } from 'next/headers'; // No longer needed here if createClient handles it

interface MonthlyActiveLearnersParams {
  year?: number;
  month?: number; // 1-12
}

interface MonthlyActiveLearnersResult {
  malCount?: number;
  error?: string;
  filterApplied?: { year: number; month: number } | 'last30days';
}

export async function getMonthlyActiveLearners(
  params?: MonthlyActiveLearnersParams
): Promise<MonthlyActiveLearnersResult> {
  // const cookieStore = cookies(); // createClient in lib/supabase/server.ts gets cookies internally
  // Ensure createClient is awaited if it's asynchronous and called without arguments
  const supabase = await createClient();

  try {
    // 1. Check user authentication and role
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error fetching user for MAL:', userError?.message);
      return { error: 'User not authenticated.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile for MAL:', profileError?.message);
      return { error: 'Could not retrieve user profile.' };
    }

    if (profile.role !== 'Admin' && profile.role !== 'Staff') {
      console.warn(`Unauthorized attempt to access MAL by user ${user.id} with role ${profile.role}`);
      return { error: 'Unauthorized to access this data.' };
    }

    let startDate: Date;
    let endDate: Date;
    let filterApplied: { year: number; month: number } | 'last30days';

    if (params?.year && params?.month && params.month >= 1 && params.month <= 12) {
      // Calculate start and end dates for the specific month
      startDate = new Date(params.year, params.month - 1, 1);
      endDate = new Date(params.year, params.month, 0); // Day 0 of next month gives last day of current month
      endDate.setHours(23, 59, 59, 999); // Include the entire last day
      filterApplied = { year: params.year, month: params.month };
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      filterApplied = 'last30days';
    }

    // 3. Query for Monthly Active Learners
    const { count, error: countError } = await supabase
      .from('students') // Assuming your students table is named 'students'
      .select('id', { count: 'exact', head: true })
      .gte('last_login_at', startDate.toISOString())
      .lte('last_login_at', endDate.toISOString());

    if (countError) {
      console.error('Error counting MAL:', countError);
      return { error: 'Failed to retrieve MAL count.' };
    }

    return { malCount: count ?? 0, filterApplied };

  } catch (e: any) {
    console.error('Unexpected error in getMonthlyActiveLearners:', e);
    return { error: 'An unexpected error occurred.' };
  }
}

// Updated interface for the new structure from calculate_module_completion_rates
// Export this type
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

interface ModuleCompletionRatesResult {
  rates?: ModuleCompletionRate[];
  error?: string;
}

export async function getModuleCompletionRates(): Promise<ModuleCompletionRatesResult> {
  const supabase = await createClient();
  try {
    // 1. Check user authentication and role (similar to getMonthlyActiveLearners)
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

    // 2. Query for module completion rates
    // This query assumes that any student with a record in student_module_progress for a module
    // is considered "enrolled" for the purpose of calculating completion rates for that module.
    const { data, error: queryError } = await supabase.rpc(
      'calculate_module_completion_rates'
    );

    if (queryError) {
      console.error('Error fetching module completion rates:', queryError.message);
      return { error: 'Failed to retrieve module completion rates.' };
    }

    // The data from the RPC call should match ModuleCompletionRate[]
    // Perform a cast if confident in the RPC's return structure, or add validation.
    const rates = data as ModuleCompletionRate[];

    return { rates };

  } catch (e: any) {
    console.error('Unexpected error in getModuleCompletionRates:', e.message);
    return { error: 'An unexpected error occurred.' };
  }
}

// ---- Database Function (to be created in a new migration) ----
// This function encapsulates the logic for calculating module completion rates.
// It's generally good practice to put complex queries into database functions.
/*
-- Migration content for creating the calculate_module_completion_rates function:

CREATE OR REPLACE FUNCTION public.calculate_module_completion_rates()
RETURNS TABLE (
  "moduleId" uuid,
  "moduleName" text,
  "moduleType" text,
  "completionRate" float,
  "totalEnrolled" bigint,
  "totalCompleted" bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id AS "moduleId",
    m.name AS "moduleName",
    m.type AS "moduleType", -- This is the 'text' type from your modules table
    COALESCE(
      (COUNT(CASE WHEN smp.status = 'Completed' THEN 1 END) * 100.0) /
      NULLIF(COUNT(DISTINCT smp.student_id), 0),
      0
    ) AS "completionRate",
    COUNT(DISTINCT smp.student_id) AS "totalEnrolled",
    COUNT(CASE WHEN smp.status = 'Completed' THEN 1 END) AS "totalCompleted"
  FROM
    public.modules m
  LEFT JOIN
    public.student_module_progress smp ON m.id = smp.module_id
  GROUP BY
    m.id, m.name, m.type
  ORDER BY
    m.name;
$$;

*/ 

// Export this type
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

interface ProductPerformanceResult {
  products?: ProductPerformance[];
  error?: string;
}

export async function getProductPerformance(): Promise<ProductPerformanceResult> {
  const supabase = await createClient();
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: 'User not authenticated.' };
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile || (profile.role !== 'Admin' && profile.role !== 'Staff')) return { error: 'Unauthorized.' };

    try {
      // Use cached product performance data
      const data = await cacheManager.getCachedProductPerformance(
        undefined, // No client filtering 
        CacheUtils.durations.LONG // 15 minutes cache for analytics
      );
      const products = data as ProductPerformance[]; 
      return { products };
    } catch (cacheError) {
      console.error('Cache error, falling back to direct RPC:', cacheError);
      
      // Fallback to direct RPC call if cache fails
      const { data, error: queryError } = await supabase.rpc('calculate_product_performance');
      if (queryError) {
        console.error('Error in calculate_product_performance RPC:', queryError.message);
        return { error: 'Failed to retrieve product performance metrics.' };
      }
      const products = data as ProductPerformance[]; 
      return { products };
    }
  } catch (e: any) {
    console.error('Unexpected error in getProductPerformance:', e.message);
    return { error: 'An unexpected error occurred.' };
  }
}

// ---- Database Function (to be created in a new migration) ----
// This function calculates product performance metrics
/*
-- Will be created in a separate migration file
*/ 

// Export this type
export interface ClientUsageMetrics {
  clientId: string;
  clientName: string;
  activeLearnersInClient: number;
  averageProductProgressInClient: number;
}

interface ClientUsageResult {
  clientMetrics?: ClientUsageMetrics[];
  error?: string;
}

export async function getClientUsage(): Promise<ClientUsageResult> {
  const supabase = await createClient();

  try {
    // 1. Check user authentication and role
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

    // 2. Query for client usage metrics using an RPC function
    const { data, error: queryError } = await supabase.rpc(
      'calculate_client_usage_metrics'
    );

    if (queryError) {
      console.error('Error fetching client usage metrics:', queryError.message);
      return { error: 'Failed to retrieve client usage metrics.' };
    }

    const clientMetrics = data as ClientUsageMetrics[];
    return { clientMetrics };

  } catch (e: any) {
    console.error('Unexpected error in getClientUsage:', e.message);
    return { error: 'An unexpected error occurred.' };
  }
}

// ---- Database Function (to be created in a new migration) ----
// This function calculates client usage metrics
/*
-- Will be created in a separate migration file
*/ 

// Updated AnalyticsSummary interface (removed module-specific summary counts)
// Export this type
export interface AnalyticsSummary {
  totalMal: number;
  overallProductProgress: number;
  sumTotalProductNotStarted?: number;
  sumTotalProductInProgress?: number;
  sumTotalProductCompleted?: number;
  sumTotalProductEligible?: number;
  totalClientActiveLearners: number;
}

interface AnalyticsSummaryResult {
  summary?: AnalyticsSummary;
  error?: string;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResult> {
  const supabase = await createClient();
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: 'User not authenticated.' };
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile || (profile.role !== 'Admin' && profile.role !== 'Staff')) return { error: 'Unauthorized.' };

    const [malResult, productPerformanceResult, clientUsageResult, moduleRatesResult] = await Promise.all([
      getMonthlyActiveLearners(),
      getProductPerformance(), // This will now return the new structure per product
      getClientUsage(),
      getModuleCompletionRates()
    ]);

    if (malResult.error) return { error: `Error fetching MAL: ${malResult.error}` };
    if (productPerformanceResult.error) return { error: `Error fetching product performance: ${productPerformanceResult.error}` };
    if (clientUsageResult.error) return { error: `Error fetching client usage: ${clientUsageResult.error}` };
    if (moduleRatesResult.error) return { error: `Error fetching module rates: ${moduleRatesResult.error}` };

    const totalMal = malResult.malCount ?? 0;

    let overallProductProgress = 0;
    let sumTotalProductNotStarted = 0;
    let sumTotalProductInProgress = 0;
    let sumTotalProductCompleted = 0;
    let sumTotalProductEligible = 0;

    if (productPerformanceResult.products && productPerformanceResult.products.length > 0) {
      const individualProductTrueAverages: number[] = [];
      productPerformanceResult.products.forEach(product => {
        // Use the new direct counts from the RPC for summation
        sumTotalProductEligible += product.totalEligibleLearners ?? 0;
        sumTotalProductCompleted += product.completedCount ?? 0;
        sumTotalProductInProgress += product.inProgressCount ?? 0; 
        sumTotalProductNotStarted += product.notStartedCount ?? 0;

        // The averageOverallProductProgress from RPC is already the true weighted average for that product
        if (product.totalEligibleLearners && product.totalEligibleLearners > 0) {
           individualProductTrueAverages.push(product.averageOverallProductProgress ?? 0);
        }
      });

      if (individualProductTrueAverages.length > 0) {
        // Overall product progress is the average of the per-product true weighted averages
        overallProductProgress = individualProductTrueAverages.reduce((acc, val) => acc + val, 0) / individualProductTrueAverages.length;
      }
    }
    
    let totalClientActiveLearners = 0;
    if (clientUsageResult.clientMetrics && clientUsageResult.clientMetrics.length > 0) {
      totalClientActiveLearners = clientUsageResult.clientMetrics.reduce((acc, client) => acc + client.activeLearnersInClient, 0);
    }

    return {
      summary: {
        totalMal,
        overallProductProgress,
        sumTotalProductNotStarted,
        sumTotalProductInProgress,
        sumTotalProductCompleted,
        sumTotalProductEligible,
        totalClientActiveLearners,
      },
    };
  } catch (e: any) {
    console.error('Unexpected error in getAnalyticsSummary:', e.message);
    return { error: 'An unexpected error occurred while generating summary.' };
  }
}