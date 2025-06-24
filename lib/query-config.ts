import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes (v5 renamed from cacheTime)
        refetchOnWindowFocus: false,
        refetchOnReconnect: true, // Good for offline support
        refetchOnMount: true,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
} 