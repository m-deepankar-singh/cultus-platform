/**
 * API Client Utilities for Server Actions to API Migration
 * 
 * Provides centralized API calling functionality with proper error handling,
 * type safety, and consistent response structure.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Centralized API call function with error handling and type safety
 * 
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise with the parsed JSON response
 * @throws ApiError for HTTP errors with status codes and details
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      let error: any = { error: 'Unknown error' }
      
      try {
        error = await response.json()
      } catch {
        // If JSON parsing fails, use response text or fallback
        try {
          const text = await response.text()
          error = { error: text || `HTTP ${response.status}` }
        } catch {
          error = { error: `HTTP ${response.status}` }
        }
      }

      throw new ApiError(
        error.error || error.message || `HTTP ${response.status}`,
        response.status,
        response,
        error.details || error
      )
    }

    // Handle empty responses (like DELETE operations)
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T
    }

    return response.json()
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }

    // Handle network errors, timeouts, etc.
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0, // 0 indicates network error
      undefined,
      error
    )
  }
}

/**
 * GET request helper
 */
export function apiGet<T = any>(url: string, options?: RequestInit): Promise<T> {
  return apiCall<T>(url, { ...options, method: 'GET' })
}

/**
 * POST request helper
 */
export function apiPost<T = any>(
  url: string, 
  data?: any, 
  options?: RequestInit
): Promise<T> {
  return apiCall<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request helper
 */
export function apiPut<T = any>(
  url: string, 
  data?: any, 
  options?: RequestInit
): Promise<T> {
  return apiCall<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PATCH request helper
 */
export function apiPatch<T = any>(
  url: string, 
  data?: any, 
  options?: RequestInit
): Promise<T> {
  return apiCall<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request helper
 */
export function apiDelete<T = any>(url: string, options?: RequestInit): Promise<T> {
  return apiCall<T>(url, { ...options, method: 'DELETE' })
}

/**
 * Helper to check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Helper to get a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
} 