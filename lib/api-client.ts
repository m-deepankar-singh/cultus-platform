// Add query parameter helper
export function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

// Improved error types aligned with TanStack Query
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Enhanced API client with better error handling for TanStack Query
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  let url = endpoint;

  if (!/^https?:\/\//i.test(endpoint)) {
    if (!baseUrl) {
      throw new ApiError('Application URL not configured');
    }
    url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  }

  const defaultHeaders: HeadersInit = {
    'Accept': 'application/json',
  };

  if (options.body) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Failed to parse error response as JSON
      }
      throw new ApiError(errorMessage, response.status);
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get("Content-Length") === "0") {
      return null as T;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      throw new ApiError("Response was not JSON");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "A network error occurred"
    );
  }
}

// Legacy wrapper for backward compatibility (maintains existing return structure)
export async function legacyApiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await apiClient<T>(endpoint, options);
    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof ApiError 
      ? error.message 
      : error instanceof Error 
        ? error.message 
        : "A network error occurred";
    return { data: null, error: errorMessage };
  }
} 