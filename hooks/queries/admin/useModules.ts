import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';
import { InfiniteData } from '@tanstack/react-query';

// Module type matching the API response
export interface Module {
  id: string;
  name: string;
  type: "Course" | "Assessment";
  created_at: string;
  updated_at: string;
  sequence: number;
  product_id: string | null;
  configuration: Record<string, unknown>;
  products?: {
    id: string;
    name: string;
  }[] | null;
}

// Module filters interface
export interface ModulesFilters {
  search?: string;
  type?: "Course" | "Assessment" | "all";
  productId?: string;
  pageSize?: number;
}

// API response structure
interface ModulesResponse {
  data: Module[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// Fetch modules function
async function fetchModules({ pageParam = 1, filters }: { pageParam?: number; filters: ModulesFilters }): Promise<ModulesResponse> {
  const params = new URLSearchParams({
    page: pageParam.toString(),
    pageSize: (filters.pageSize || 50).toString(),
  });

  if (filters.search) {
    params.append('search', filters.search);
  }

  if (filters.type && filters.type !== 'all') {
    params.append('type', filters.type);
  }

  if (filters.productId) {
    params.append('productId', filters.productId);
  }

  params.append('include_assignments', 'true');

  return apiClient<ModulesResponse>(`/api/admin/modules?${params.toString()}`);
}

// Main infinite query hook
export function useModulesInfinite(filters: ModulesFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminModules(filters),
    queryFn: ({ pageParam }) => fetchModules({ pageParam, filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { currentPage, totalPages } = lastPage.metadata;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Helper function to flatten pages into single array
export function flattenModulesPages(data: InfiniteData<ModulesResponse> | undefined): Module[] {
  if (!data) return [];
  return data.pages.flatMap(page => page.data);
}

// Helper function to get total count
export function getTotalModulesCount(data: InfiniteData<ModulesResponse> | undefined): number {
  if (!data || data.pages.length === 0) return 0;
  return data.pages[0].metadata.totalCount;
}

// Export everything as a default object for consistency
export default {
  useModulesInfinite,
  flattenModulesPages,
  getTotalModulesCount,
}; 