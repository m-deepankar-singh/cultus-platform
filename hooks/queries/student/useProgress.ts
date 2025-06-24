import { useQuery } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook for fetching student progress data
 */
export function useStudentProgress() {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.studentProgress,
      queryFn: () => apiClient('/api/app/progress/detailed'),
      staleTime: 1000 * 60 * 3, // 3 minutes
    })
  );
} 