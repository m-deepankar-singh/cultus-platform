import { useQuery } from '@tanstack/react-query';
import { jobReadinessProgressOptions } from '@/lib/query-options';

/**
 * Hook for fetching job readiness progress
 */
export function useJobReadinessProgress() {
  return useQuery(jobReadinessProgressOptions());
} 