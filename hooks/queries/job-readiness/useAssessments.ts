import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';

/**
 * Hook for fetching job readiness assessments for a specific product
 */
export function useJobReadinessAssessments(productId: string) {
  return useQuery({
    queryKey: queryKeys.jobReadinessAssessments(productId),
    queryFn: () => apiClient(`/api/app/job-readiness/assessments/${productId}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!productId,
  });
} 