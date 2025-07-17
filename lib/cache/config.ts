export const cacheConfig = {
  enabled: process.env.ENABLE_HTTP_CACHING === 'true',
} as const;