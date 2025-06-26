// Primary rate limiting functionality (Upstash Redis optimized)
export {
  UpstashOptimizedRateLimiter,
  optimizedRateLimiter as rateLimiter,
  checkRateLimitOptimized as checkRateLimit,
  type RateLimitResult,
  type RateLimitConfig
} from './upstash-optimized';

// Legacy implementation (deprecated - kept for compatibility)
export {
  UpstashRateLimiter,
  rateLimiter as legacyRateLimiter,
  checkRateLimit as checkRateLimitLegacy
} from './vercel-kv';

// Configuration and rules
export {
  RATE_LIMIT_CONFIGS,
  getRateLimitConfigByEndpoint,
  applyRoleMultiplier,
  ROLE_MULTIPLIERS,
  type RateLimitRule
} from './config';

// Middleware and guards
export {
  checkRequestRateLimit,
  withRateLimit,
  rateLimitGuard,
  type RateLimitError
} from './middleware';

// Utility functions
export {
  getClientIP,
  generateRateLimitIdentifier,
  createRateLimitHeaders,
  isDevelopment,
  logRateLimitEvent
} from './utils';