import { useQuery } from '@tanstack/react-query';
import { expertSessionsOptions } from '@/lib/query-options';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';

/**
 * Hook for fetching expert sessions
 */
export function useExpertSessions(productId?: string) {
  return useQuery(expertSessionsOptions(productId));
}

/**
 * Hook for fetching expert session progress
 */
export function useExpertSessionProgress(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.expertSessionProgress(sessionId),
    queryFn: () => apiClient(`/api/app/job-readiness/expert-sessions/${sessionId}/progress`),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!sessionId,
  });
} 