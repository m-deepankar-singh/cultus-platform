export interface SimpleCacheConfig {
  maxAge: number;
  cacheType: 'public' | 'private';
  mustRevalidate?: boolean;
}

export function generateCacheHeaders(config: SimpleCacheConfig): Record<string, string> {
  const cacheControl = `${config.cacheType}, max-age=${config.maxAge}${
    config.mustRevalidate ? ', must-revalidate' : ''
  }`;
  
  return {
    'Cache-Control': cacheControl,
    'Vary': 'Authorization'
  };
}

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  STATIC: { maxAge: 900, cacheType: 'private' as const }, // 15 minutes
  SEMI_STATIC: { maxAge: 300, cacheType: 'private' as const }, // 5 minutes
  DYNAMIC: { maxAge: 60, cacheType: 'private' as const }, // 1 minute
  FREQUENT: { maxAge: 30, cacheType: 'private' as const }, // 30 seconds
} as const;