import { useQuery } from '@tanstack/react-query';
import { jobReadinessProductsOptions } from '@/lib/query-options';

/**
 * Hook for fetching job readiness products
 */
export function useJobReadinessProducts(productId?: string) {
  return useQuery(jobReadinessProductsOptions(productId));
} 