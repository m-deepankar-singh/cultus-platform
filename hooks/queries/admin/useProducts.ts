import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';
import { InfiniteData } from '@tanstack/react-query';

// Product type matching the API response
export interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  type?: string;
}

// Product filters interface
export interface ProductsFilters {
  search?: string;
  pageSize?: number;
}

// API response structure
interface ProductsResponse {
  data: Product[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// Paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// Infinite query hook for products
export function useProductsInfinite(filters: ProductsFilters = {}) {
  const { search = '', pageSize = 10 } = filters;

  return useInfiniteQuery({
    queryKey: queryKeys.adminProducts({ search, pageSize }),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await apiClient<ProductsResponse>(`/api/admin/products?${params.toString()}`);
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.metadata.currentPage < lastPage.metadata.totalPages) {
        return lastPage.metadata.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Helper function to flatten pages for virtualized display
export function flattenProductsPages(data: InfiniteData<ProductsResponse> | undefined): Product[] {
  if (!data) return [];
  return data.pages.flatMap(page => page.data);
}

// Helper function to get total count
export function getTotalProductsCount(data: InfiniteData<ProductsResponse> | undefined): number {
  if (!data || data.pages.length === 0) return 0;
  return data.pages[0].metadata.totalCount;
} 