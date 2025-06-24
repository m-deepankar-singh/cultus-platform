import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { adminClientsOptions, ClientsFilters } from '@/lib/query-options';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, buildQueryParams } from '@/lib/api-client';

/**
 * Hook for fetching clients with pagination
 */
export function useClients(filters: ClientsFilters) {
  return useQuery(adminClientsOptions(filters));
}

/**
 * Hook for infinite clients query - optimized for virtualization
 */
export function useClientsInfinite(filters: ClientsFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminClients(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params = buildQueryParams({
        ...filters,
        page: pageParam,
        pageSize: filters.pageSize || 50,
      });
      
      return apiClient(`/api/admin/clients?${params}`);
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