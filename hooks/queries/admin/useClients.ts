import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, buildQueryParams } from '@/lib/api-client';

export interface Client {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  contact_email: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  // Extended fields from API response
  products?: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  total_students?: number;
  active_students?: number;
  recent_activity?: any[];
}

export interface ClientsFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  pageSize?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  // Also support the old pagination format for backward compatibility
  pagination?: {
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Hook for fetching clients with pagination
 */
export function useClients(filters: ClientsFilters) {
  return useQuery({
    queryKey: queryKeys.adminClients(filters),
    queryFn: ({ queryKey }) => {
      const [, , filterParams] = queryKey;
      const params = buildQueryParams(filterParams);
      return apiClient<PaginatedResponse<Client>>(`/api/admin/clients?${params}`);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for admin data
  });
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
      
      return apiClient<PaginatedResponse<Client>>(`/api/admin/clients?${params}`);
    },
    getNextPageParam: (lastPage) => {
      // Support both metadata and pagination formats
      if (lastPage.metadata) {
        return lastPage.metadata.currentPage < lastPage.metadata.totalPages
          ? lastPage.metadata.currentPage + 1
          : undefined;
      } else if (lastPage.pagination) {
        return lastPage.pagination.page < lastPage.pagination.totalPages
          ? lastPage.pagination.page + 1
          : undefined;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes for admin data
  });
}

export function flattenClientsPages(data: any): Client[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page: PaginatedResponse<Client>) => page.data);
}

export function getTotalClientsCount(data: any): number {
  if (!data?.pages?.[0]) return 0;
  const firstPage = data.pages[0];
  return firstPage.metadata?.totalCount || firstPage.pagination?.totalCount || 0;
} 