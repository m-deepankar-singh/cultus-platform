import { useQuery } from '@tanstack/react-query';
import { assessmentDetailsOptions } from '@/lib/query-options';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';

/**
 * Hook for fetching assessment details
 */
export function useAssessmentDetails(moduleId: string) {
  return useQuery(assessmentDetailsOptions(moduleId));
}

/**
 * Hook for fetching assessment progress
 */
export function useAssessmentProgress(moduleId: string) {
  return useQuery({
    queryKey: queryKeys.assessmentProgress(moduleId),
    queryFn: () => apiClient(`/api/app/assessments/${moduleId}/progress`),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!moduleId,
  });
} 