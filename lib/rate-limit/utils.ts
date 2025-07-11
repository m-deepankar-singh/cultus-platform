import { NextRequest } from 'next/server';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

/**
 * Extract client IP address from request
 * Handles various proxy headers and deployment environments
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-vercel-forwarded-for', // Vercel
    'x-client-ip',
    'x-cluster-client-ip'
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback to localhost if no headers found
  return '127.0.0.1';
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  // Basic IP validation (IPv4 and IPv6)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Generate rate limit identifier based on configuration
 */
export function generateRateLimitIdentifier(
  request: NextRequest,
  userId?: string,
  useIP: boolean = false
): string {
  if (useIP || !userId) {
    const ip = getClientIP(request);
    return userId ? `${ip}:${userId}` : ip;
  }
  
  return userId;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
  };
}

/**
 * Check if development environment (disable rate limiting)
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.VERCEL_ENV === 'development' ||
         (!process.env.UPSTASH_REDIS_REST_URL && !process.env.KV_REST_API_URL); // No Redis in development
}

/**
 * Log rate limit event for monitoring with enhanced security logging
 */
export function logRateLimitEvent(
  identifier: string,
  endpoint: string,
  allowed: boolean,
  remaining: number,
  limit: number,
  request?: NextRequest
): void {
  securityLogger.logEvent({
    eventType: allowed ? SecurityEventType.RATE_LIMIT_CHECK : SecurityEventType.RATE_LIMIT_EXCEEDED,
    severity: allowed ? SecuritySeverity.INFO : SecuritySeverity.WARNING,
    category: SecurityCategory.RATE_LIMITING,
    endpoint,
    details: {
      identifier,
      allowed,
      remaining,
      limit,
      utilizationPercentage: ((limit - remaining) / limit) * 100,
      rateLimitType: identifier.includes(':') ? 'user_and_ip' : 'ip_only'
    }
  }, request);
}