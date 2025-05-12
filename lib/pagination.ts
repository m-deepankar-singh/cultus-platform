/**
 * Pagination utilities for server-side pagination with Supabase
 */

/**
 * Interface for pagination parameters to be used in API requests
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Standard response format for paginated data
 */
export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

/**
 * Calculates the range parameters for Supabase's range() method
 * @param page The current page number (1-indexed)
 * @param pageSize Number of items per page
 * @returns Object with from and to values for Supabase range query
 */
export function calculatePaginationRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

/**
 * Creates a PaginatedResponse object from query results
 * @param data The data array returned from the query
 * @param count The total count of items (before pagination)
 * @param page The current page number
 * @param pageSize The page size used for pagination
 * @returns A standardized PaginatedResponse object
 */
export function createPaginatedResponse<T>(
  data: T[],
  count: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    metadata: {
      totalCount: count,
      totalPages: Math.ceil(count / pageSize),
      currentPage: page,
      pageSize,
    },
  };
} 