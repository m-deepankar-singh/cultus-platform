import { SESSION_TIMEOUT_CONFIG } from '@/lib/auth/session-timeout-constants';

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

// Helper to get current last activity timestamp
function getLastActivity(): string {
  if (typeof window === 'undefined') return Date.now().toString();
  
  const stored = localStorage.getItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
  return stored || Date.now().toString();
}

// Helper to update last activity on API calls
function updateLastActivity(): void {
  if (typeof window === 'undefined') return;
  
  const now = Date.now().toString();
  localStorage.setItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY, now);
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
    'x-last-activity': getLastActivity(),
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
    // Update last activity timestamp before making request
    updateLastActivity();
    
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Failed to parse error response as JSON
      }
      
      // Handle session timeout responses
      if (response.status === 401 && typeof window !== 'undefined') {
        // Check if this is a session timeout
        const authError = errorMessage.toLowerCase();
        if (authError.includes('session') || authError.includes('expired') || authError.includes('timeout')) {
          // Clear session data and redirect to login
          localStorage.removeItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
          
          // Determine redirect based on endpoint - student APIs should go to student login
          const isStudentApi = endpoint.startsWith('/api/app/') || url.includes('/api/app/');
          const redirectUrl = isStudentApi ? '/app/login?sessionExpired=true' : '/admin/login?sessionExpired=true';
          
          window.location.href = redirectUrl;
          return null as T;
        }
        
        // Handle general 401 errors (not session timeouts)
        // Clear session data and redirect based on API endpoint
        localStorage.removeItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
        
        const isStudentApi = endpoint.startsWith('/api/app/') || url.includes('/api/app/');
        const redirectUrl = isStudentApi ? '/app/login' : '/admin/login';
        
        window.location.href = redirectUrl;
        return null as T;
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