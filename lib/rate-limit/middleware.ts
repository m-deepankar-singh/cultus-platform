import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, type RateLimitResult } from './index';
import { RateLimitRule, getRateLimitConfigByEndpoint, applyRoleMultiplier } from './config';
import { generateRateLimitIdentifier, createRateLimitHeaders, isDevelopment, logRateLimitEvent } from './utils';

export interface RateLimitError {
  error: string;
  status: number;
  headers?: Record<string, string>;
}

/**
 * Check rate limit for a request
 * @param request - NextRequest object
 * @param userId - User ID (if authenticated)
 * @param userRole - User role (for role-based limits)
 * @param config - Optional custom rate limit config (overrides endpoint-based detection)
 * @returns Promise<RateLimitResult | RateLimitError>
 */
export async function checkRequestRateLimit(
  request: NextRequest,
  userId?: string,
  userRole?: string,
  config?: RateLimitRule
): Promise<RateLimitResult | RateLimitError> {
  // Skip rate limiting in development
  if (isDevelopment()) {
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 60000,
      totalRequests: 1
    };
  }

  try {
    // Get rate limit configuration
    const rateLimitConfig = config || getRateLimitConfigByEndpoint(request.nextUrl.pathname);
    
    if (!rateLimitConfig) {
      // No rate limiting configured for this endpoint
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000,
        totalRequests: 1
      };
    }

    // Apply role-based multipliers if user role is available
    const finalConfig = userRole ? 
      applyRoleMultiplier(rateLimitConfig, userRole) : 
      rateLimitConfig;

    // Generate identifier
    const identifier = generateRateLimitIdentifier(
      request,
      userId,
      finalConfig.useIP
    );

    // Check rate limit
    const result = await rateLimiter.checkRateLimit(identifier, finalConfig);
    
    // Log the event
    logRateLimitEvent(
      identifier,
      request.nextUrl.pathname,
      result.allowed,
      result.remaining,
      finalConfig.limit
    );

    if (!result.allowed) {
      return {
        error: 'Rate limit exceeded',
        status: 429,
        headers: createRateLimitHeaders(
          finalConfig.limit,
          result.remaining,
          result.resetTime
        )
      };
    }

    return result;

  } catch (error) {
    console.error('Rate limit check failed:', error);
    
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: 0,
      resetTime: Date.now() + 60000,
      totalRequests: 1
    };
  }
}

/**
 * Higher-order function that wraps API route handlers with rate limiting
 * 
 * Usage:
 * export const POST = withRateLimit()(async (req, auth) => {
 *   // Your API logic here
 * });
 * 
 * Or with custom config:
 * export const POST = withRateLimit({ 
 *   limit: 10, 
 *   windowMs: 60000,
 *   useIP: true 
 * })(async (req, auth) => {
 *   // Your API logic here
 * });
 */
export function withRateLimit(customConfig?: Partial<RateLimitRule>) {
  return function<T extends any[]>(
    handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async function(req: NextRequest, ...args: T): Promise<NextResponse> {
      // Extract user info from args if available (from auth middleware)
      const authContext = args.find(arg => 
        arg && typeof arg === 'object' && 'user' in arg && 'claims' in arg
      );
      
      const userId = authContext?.user?.id;
      const userRole = authContext?.claims?.user_role;

      // Check rate limit
      const rateLimitResult = await checkRequestRateLimit(
        req,
        userId,
        userRole,
        customConfig as RateLimitRule
      );

      if ('error' in rateLimitResult) {
        return NextResponse.json(
          { error: rateLimitResult.error },
          { 
            status: rateLimitResult.status,
            headers: rateLimitResult.headers
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(req, ...args);
      
      // Add rate limit headers
      const headers = createRateLimitHeaders(
        customConfig?.limit || 1000, // Default high limit
        rateLimitResult.remaining,
        rateLimitResult.resetTime
      );

      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    };
  };
}

/**
 * Standalone rate limit check function for use in existing middleware
 */
export async function rateLimitGuard(
  request: NextRequest,
  userId?: string,
  userRole?: string,
  customConfig?: RateLimitRule
): Promise<NextResponse | null> {
  const result = await checkRequestRateLimit(request, userId, userRole, customConfig);
  
  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { 
        status: result.status,
        headers: result.headers
      }
    );
  }
  
  return null; // No rate limit violation
}