import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';

/**
 * Hook for fetching job readiness courses for a specific product
 */
export function useJobReadinessCourses(productId: string) {
  return useQuery({
    queryKey: queryKeys.jobReadinessCourses(productId),
    queryFn: () => apiClient(`/api/app/job-readiness/courses/${productId}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!productId,
  });
} 