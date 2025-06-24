import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { adminUsersOptions, UsersFilters } from '@/lib/query-options';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, buildQueryParams } from '@/lib/api-client';

/**
 * Hook for fetching users with pagination
 */
export function useUsers(filters: UsersFilters) {
  return useQuery(adminUsersOptions(filters));
}

/**
 * Hook for infinite users query - optimized for virtualization
 */
export function useUsersInfinite(filters: UsersFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminUsers(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params = buildQueryParams({
        ...filters,
        page: pageParam,
        pageSize: filters.pageSize || 50,
      });
      
      return apiClient(`/api/admin/users?${params}`);
    },
    getNextPageParam: (lastPage: any) => {
      return lastPage.metadata?.currentPage < lastPage.metadata?.totalPages
        ? lastPage.metadata.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2,
  });
} 