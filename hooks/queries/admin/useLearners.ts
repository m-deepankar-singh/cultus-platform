import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { adminLearnersOptions } from '@/lib/query-options';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, buildQueryParams } from '@/lib/api-client';
import { z } from 'zod';

// Type definitions based on the API response
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

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

export interface LearnersFilters {
  search?: string;
  clientId?: string;
  isActive?: boolean;
  pageSize?: number;
}

// Schema for API response validation
const PaginatedLearnersResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    full_name: z.string(),
    email: z.string().nullable(),
    phone_number: z.string().nullable(),
    client_id: z.string(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    star_rating: z.number().nullable(),
    last_login_at: z.string().nullable(),
    temporary_password: z.string().nullable(),
    job_readiness_background_type: z.string().nullable(),
    client: z.object({
      id: z.string(),
      name: z.string()
    }).nullable()
  })),
  metadata: z.object({
    totalCount: z.number(),
    totalPages: z.number(),
    currentPage: z.number(),
    pageSize: z.number()
  })
});

/**
 * Hook for fetching learners with pagination
 */
export function useLearners(filters: LearnersFilters) {
  return useQuery(adminLearnersOptions(filters));
}

/**
 * Hook for infinite learners query - optimized for virtualization
 */
export function useLearnersInfinite(filters: LearnersFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminLearners(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params = buildQueryParams({
        ...filters,
        page: pageParam,
        pageSize: filters.pageSize || 50, // Default to 50 for better virtualization performance
      });
      
      const response = await apiClient<PaginatedResponse<Learner>>(`/api/admin/learners?${params}`);
      
      // Validate response shape
      const validated = PaginatedLearnersResponseSchema.parse(response);
      return validated;
    },
    getNextPageParam: (lastPage) => {
      // Return the next page number if there are more pages, otherwise undefined
      return lastPage.metadata.currentPage < lastPage.metadata.totalPages
        ? lastPage.metadata.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes for admin data
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
    refetchOnWindowFocus: false, // Disable refetch on window focus for admin tables
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

/**
 * Hook for fetching learners with standard pagination (non-virtualized tables)
 * Useful for simpler tables or when virtualization is not needed
 */
export function useLearnersPaginated(filters: LearnersFilters & { page: number }) {
  const { page, ...filterParams } = filters;
  
  return useInfiniteQuery({
    queryKey: [...queryKeys.adminLearners(filterParams), 'paginated', page],
    queryFn: async () => {
      const params = buildQueryParams({
        ...filterParams,
        page,
        pageSize: filters.pageSize || 20, // Standard pagination uses smaller page size
      });
      
      const response = await apiClient<PaginatedResponse<Learner>>(`/api/admin/learners?${params}`);
      
      // Validate response shape
      const validated = PaginatedLearnersResponseSchema.parse(response);
      return validated;
    },
    getNextPageParam: () => undefined, // Disable infinite loading for standard pagination
    initialPageParam: page,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Helper to flatten pages from infinite query
 */
export function flattenLearnersPages(data: any): Learner[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page: PaginatedResponse<Learner>) => page.data);
}

/**
 * Helper to get total count from infinite query
 */
export function getTotalLearnersCount(data: any): number {
  if (!data?.pages?.[0]) return 0;
  return data.pages[0].metadata.totalCount;
} 