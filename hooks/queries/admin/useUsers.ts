import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, buildQueryParams } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  email?: string;
  last_sign_in_at?: string;
  created_at?: string;
  updated_at?: string;
  role?: string;
  full_name?: string;
  client_id?: string | null;
  client?: {
    id: string;
    name: string;
  };
  banned_until?: string | null;
  status?: string;
  is_active?: boolean;
  is_enrolled?: boolean;
  user_metadata?: {
    status?: string;
  };
  app_metadata?: {
    status?: string;
  };
}

export interface UsersFilters {
  search?: string;
  role?: string;
  clientId?: string;
  isActive?: boolean;
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
}

/**
 * Hook for fetching users with pagination
 */
export function useUsers(filters: UsersFilters) {
  return useQuery({
    queryKey: queryKeys.adminUsers(filters),
    queryFn: ({ queryKey }) => {
      const [, , filterParams] = queryKey;
      const params = buildQueryParams(filterParams);
      return apiClient<PaginatedResponse<UserProfile>>(`/api/admin/users?${params}`);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for admin data
  });
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
      
      return apiClient<PaginatedResponse<UserProfile>>(`/api/admin/users?${params}`);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.currentPage < lastPage.metadata?.totalPages
        ? lastPage.metadata.currentPage + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes for admin data
  });
}

export function flattenUsersPages(data: any): UserProfile[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page: PaginatedResponse<UserProfile>) => page.data);
}

export function getTotalUsersCount(data: any): number {
  if (!data?.pages?.[0]) return 0;
  return data.pages[0].metadata.totalCount;
}

// Export the existing types from the other file for backward compatibility
export type { CreateUserData, UpdateUserData } from '@/hooks/api/use-users'; 