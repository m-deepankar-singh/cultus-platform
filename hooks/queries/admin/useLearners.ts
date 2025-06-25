import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { adminLearnersOptions } from '@/lib/query-options';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, buildQueryParams } from '@/lib/api-client';

/**
 * Hook for fetching learners with pagination
 */
export function useLearners(filters: LearnersFilters) {
  return useQuery(adminLearnersOptions(filters));
}

/**
 * Hook for infinite learners query - optimized for virtualization
 */
export function useLearnersInfinite(filters: LearnersFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminLearners(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params = buildQueryParams({
        ...filters,
        page: pageParam,
        pageSize: filters.pageSize || 50,
      });
      
      return apiClient(`/api/admin/learners?${params}`);
    },
    getNextPageParam: (lastPage: any) => {
      return lastPage.metadata?.currentPage < lastPage.metadata?.totalPages
        ? lastPage.metadata.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes for admin data
  });
}

export interface Learner {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  client_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  star_rating: number | null;
  last_login_at: string | null;
  temporary_password: string | null;
  job_readiness_background_type: string | null;
  client: {
    id: string;
    name: string;
  } | null;
}

export interface LearnersFilters {
  search?: string;
  clientId?: string;
  isActive?: boolean;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

export function flattenLearnersPages(data: any): Learner[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page: PaginatedResponse<Learner>) => page.data);
}

export function getTotalLearnersCount(data: any): number {
  if (!data?.pages?.[0]) return 0;
  return data.pages[0].metadata.totalCount;
} 