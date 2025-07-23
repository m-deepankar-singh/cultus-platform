import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClaimsFromToken, isTokenExpired, CustomJWTClaims, getVerifiedClaimsFromSession, getVerifiedClaimsFromUser } from './jwt-utils';
import { User } from '@supabase/supabase-js';
import { rateLimitGuard, type RateLimitRule } from '@/lib/rate-limit';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';
import { authCacheManager } from './auth-cache-manager';
import { cachedRoleService } from './cached-role-service';
import { validateJWTFast } from './jwt-validation-cache';
import { cookies } from 'next/headers';

export interface ApiAuthResult {
  user: User;
  claims: CustomJWTClaims;
  supabase: any;
}

/**
 * Helper function to check if a user is active based on their role
 * For students: checks student_is_active
 * For admin/staff: checks profile_is_active
 */
export function isUserActive(claims: CustomJWTClaims): boolean {
  if (claims.is_student) {
    return claims.student_is_active === true;
  } else {
    return claims.profile_is_active === true;
  }
}

export interface ApiAuthError {
  error: string;
  status: number;
}

/**
 * @deprecated SECURITY WARNING: This function is unsafe and will be removed.
 * Use authenticateApiRequestUltraFast() instead which provides cryptographic validation.
 * This function relies on unsafe JWT decoding.
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, claims, and supabase client OR ApiAuthError
 */
/*
export async function authenticateApiRequest(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
  securityLogger.logEvent({
    eventType: SecurityEventType.AUTH_FAILURE,
    severity: SecuritySeverity.WARNING,
    category: SecurityCategory.AUTHENTICATION,
    details: {
      warning: 'DEPRECATED_FUNCTION_USED',
      function: 'authenticateApiRequest',
      recommendation: 'Use authenticateApiRequestUltraFast() instead'
    }
  });
  // ... rest of implementation commented out for migration
  throw new Error('DEPRECATED: Use authenticateApiRequestUltraFast() instead');
}
*/

/**
 * @deprecated SECURITY WARNING: This function has been replaced.
 * Use authenticateApiRequestUltraFast() instead which provides better performance.
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, verified claims, and supabase client OR ApiAuthError
 */
/*
export async function authenticateApiRequestSecure(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
  // ... implementation commented out for migration
  throw new Error('DEPRECATED: Use authenticateApiRequestUltraFast() instead');
}
*/

/**
 * PHASE 2 OPTIMIZED AUTHENTICATION - Uses Redis caching and RPC functions
 * This is the fastest authentication method with Redis-first caching
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, verified claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequestOptimized(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Get user with automatic JWT signature validation
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
        error: userError?.message || 'No user found',
        function: 'authenticateApiRequestOptimized'
      });
      return { error: "Unauthorized", status: 401 };
    }

    // Get cached auth data with Redis-first approach
    const authData = await authCacheManager.getUserAuthData(user.id);
    
    if (!authData) {
      securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
        error: 'Failed to get auth data from cache or database',
        userId: user.id,
        function: 'authenticateApiRequestOptimized'
      });
      return { error: "Authentication data not found", status: 401 };
    }

    const { claims } = authData;

    // Role validation using cached claims
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = claims.user_role;
      const hasRequiredRole = requiredRoles.includes(userRole || '') || 
                            (requiredRoles.includes('student') && userRole === 'student');

      if (!hasRequiredRole) {
        securityLogger.logAuthEvent(SecurityEventType.ROLE_VALIDATION_FAILED, {
          userId: user.id,
          userRole,
          requiredRoles,
          function: 'authenticateApiRequestOptimized'
        });
        return { 
          error: `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${userRole}`, 
          status: 403 
        };
      }
    }

    const processingTime = Date.now() - startTime;
    securityLogger.logAuthEvent(SecurityEventType.AUTH_SUCCESS, {
      userId: user.id,
      userRole: claims.user_role,
      function: 'authenticateApiRequestOptimized',
      processingTime,
      cacheHit: authData.cached_at ? true : false
    });

    return {
      user,
      claims,
      supabase
    };

  } catch (error) {
    securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
      error: error instanceof Error ? error.message : 'Unknown error',
      function: 'authenticateApiRequestOptimized'
    });
    console.error('Optimized authentication error:', error);
    return { error: "Internal server error", status: 500 };
  }
}

/**
 * PHASE 2 RPC-BASED AUTHENTICATION - Uses database RPC functions for optimal database performance
 * This method uses consolidated RPC functions for minimal database queries
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, verified claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequestRPC(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Get user with automatic JWT signature validation
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
        error: userError?.message || 'No user found',
        function: 'authenticateApiRequestRPC'
      });
      return { error: "Unauthorized", status: 401 };
    }

    // Use RPC function for consolidated user data retrieval
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_user_auth_profile_cached',
      { user_id: user.id }
    );

    if (rpcError || !rpcData || rpcData.length === 0) {
      securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
        error: rpcError?.message || 'User profile not found via RPC',
        userId: user.id,
        function: 'authenticateApiRequestRPC'
      });
      return { error: "User profile not found", status: 403 };
    }

    const profileData = rpcData[0];

    // Build claims from RPC data
    const claims: CustomJWTClaims = {
      user_role: profileData.user_role as 'Admin' | 'Staff' | 'Client Staff' | 'student',
      client_id: profileData.client_id,
      profile_is_active: profileData.profile_is_active,
      is_student: profileData.is_student,
      student_is_active: profileData.student_is_active,
      job_readiness_star_level: profileData.job_readiness_star_level ? 
        (['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const)[profileData.job_readiness_star_level - 1] : 
        undefined,
      job_readiness_tier: profileData.job_readiness_tier as 'BRONZE' | 'SILVER' | 'GOLD' | undefined,
    };

    // Role validation using RPC claims
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = claims.user_role;
      const hasRequiredRole = requiredRoles.includes(userRole || '') || 
                            (requiredRoles.includes('student') && userRole === 'student');

      if (!hasRequiredRole) {
        securityLogger.logAuthEvent(SecurityEventType.ROLE_VALIDATION_FAILED, {
          userId: user.id,
          userRole,
          requiredRoles,
          function: 'authenticateApiRequestRPC'
        });
        return { 
          error: `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${userRole}`, 
          status: 403 
        };
      }
    }

    const processingTime = Date.now() - startTime;
    securityLogger.logAuthEvent(SecurityEventType.AUTH_SUCCESS, {
      userId: user.id,
      userRole: claims.user_role,
      function: 'authenticateApiRequestRPC',
      processingTime,
      method: 'rpc'
    });

    // Cache the result for future use
    authCacheManager.setCachedUserAuth(user.id, user, claims).catch(console.error);

    return {
      user,
      claims,
      supabase
    };

  } catch (error) {
    securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
      error: error instanceof Error ? error.message : 'Unknown error',
      function: 'authenticateApiRequestRPC'
    });
    console.error('RPC authentication error:', error);
    return { error: "Internal server error", status: 500 };
  }
}

/**
 * PHASE 2 HYBRID AUTHENTICATION - Combines Redis caching with RPC fallback
 * This is the recommended authentication method for Phase 2
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, verified claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequestHybrid(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Get user with automatic JWT signature validation
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
        error: userError?.message || 'No user found',
        function: 'authenticateApiRequestHybrid'
      });
      return { error: "Unauthorized", status: 401 };
    }

    // Try Redis cache first
    const cachedData = await authCacheManager.getCachedUserAuth(user.id);
    let claims: CustomJWTClaims;
    let cacheHit = false;

    if (cachedData) {
      claims = cachedData.claims;
      cacheHit = true;
    } else {
      // Cache miss - use RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_user_auth_profile_cached',
        { user_id: user.id }
      );

      if (rpcError || !rpcData || rpcData.length === 0) {
        securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
          error: rpcError?.message || 'User profile not found via RPC',
          userId: user.id,
          function: 'authenticateApiRequestHybrid'
        });
        return { error: "User profile not found", status: 403 };
      }

      const profileData = rpcData[0];

      // Build claims from RPC data
      claims = {
        user_role: profileData.user_role as 'Admin' | 'Staff' | 'Client Staff' | 'student',
        client_id: profileData.client_id,
        profile_is_active: profileData.profile_is_active,
        is_student: profileData.is_student,
        student_is_active: profileData.student_is_active,
        job_readiness_star_level: profileData.job_readiness_star_level ? 
          (['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const)[profileData.job_readiness_star_level - 1] : 
          undefined,
        job_readiness_tier: profileData.job_readiness_tier as 'BRONZE' | 'SILVER' | 'GOLD' | undefined,
      };

      // Cache the result for future use
      authCacheManager.setCachedUserAuth(user.id, user, claims).catch(console.error);
    }

    // Role validation using hybrid claims
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = claims.user_role;
      const hasRequiredRole = requiredRoles.includes(userRole || '') || 
                            (requiredRoles.includes('student') && userRole === 'student');

      if (!hasRequiredRole) {
        securityLogger.logAuthEvent(SecurityEventType.ROLE_VALIDATION_FAILED, {
          userId: user.id,
          userRole,
          requiredRoles,
          function: 'authenticateApiRequestHybrid'
        });
        return { 
          error: `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${userRole}`, 
          status: 403 
        };
      }
    }

    const processingTime = Date.now() - startTime;
    securityLogger.logAuthEvent(SecurityEventType.AUTH_SUCCESS, {
      userId: user.id,
      userRole: claims.user_role,
      function: 'authenticateApiRequestHybrid',
      processingTime,
      cacheHit,
      method: cacheHit ? 'redis' : 'rpc'
    });

    return {
      user,
      claims,
      supabase
    };

  } catch (error) {
    securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
      error: error instanceof Error ? error.message : 'Unknown error',
      function: 'authenticateApiRequestHybrid'
    });
    console.error('Hybrid authentication error:', error);
    return { error: "Internal server error", status: 500 };
  }
}

/**
 * Secure authentication with rate limiting
 */
export async function authenticateApiRequestWithRateLimitSecure(
  request: NextRequest,
  requiredRoles?: string[],
  rateLimitConfig?: RateLimitRule
): Promise<ApiAuthResult | ApiAuthError> {
  try {
    // First, authenticate the request
    const authResult = await authenticateApiRequestUltraFast(requiredRoles);
    if ('error' in authResult) {
      return authResult;
    }

    // Then apply rate limiting if configured
    if (rateLimitConfig) {
      const rateLimitResponse = await rateLimitGuard(
        request,
        authResult.user.id,
        authResult.claims.user_role || undefined,
        rateLimitConfig
      );

      if (rateLimitResponse) {
        securityLogger.logEvent({
          eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
          severity: SecuritySeverity.WARNING,
          category: SecurityCategory.RATE_LIMITING,
          userId: authResult.user.id,
          userRole: authResult.claims.user_role,
          details: {
            function: 'authenticateApiRequestWithRateLimitSecure'
          }
        });
        return { error: "Rate limit exceeded", status: 429 };
      }
    }

    return authResult;
  } catch (error) {
    securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
      error: error instanceof Error ? error.message : 'Unknown error',
      function: 'authenticateApiRequestWithRateLimitSecure'
    });
    console.error('Authentication with rate limit error:', error);
    return { error: "Internal server error", status: 500 };
  }
}

/**
 * LEGACY AUTHENTICATION - DEPRECATED DUE TO SECURITY VULNERABILITY
 * Enhanced authentication for API routes with optional rate limiting
 * Includes all features of authenticateApiRequest plus rate limiting support
 * 
 * @param request - NextRequest object (required for rate limiting)
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @param rateLimitConfig - Optional rate limiting configuration
 * @returns ApiAuthResult with user, claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequestWithRateLimit(
  request: NextRequest,
  requiredRoles?: string[],
  rateLimitConfig?: RateLimitRule
): Promise<ApiAuthResult | ApiAuthError> {
  try {
    // First, perform standard authentication
    const authResult = await authenticateApiRequestUltraFast(requiredRoles, request);
    
    if ('error' in authResult) {
      return authResult;
    }

    // If rate limiting is enabled, check rate limits
    if (rateLimitConfig) {
      const rateLimitResponse = await rateLimitGuard(
        request,
        authResult.user.id,
        authResult.claims.user_role,
        rateLimitConfig
      );

      if (rateLimitResponse) {
        // Rate limit exceeded, extract error details
        const responseData = await rateLimitResponse.json();
        return {
          error: responseData.error || 'Rate limit exceeded',
          status: rateLimitResponse.status
        };
      }
    }

    return authResult;
  } catch (error) {
    console.error('Enhanced authentication error:', error);
    return { error: "Authentication failed", status: 500 };
  }
}

/**
 * Higher-order function that wraps API route handlers with authentication
 * 
 * Usage:
 * export const GET = withAuth(['Admin', 'Staff'])(async (req, auth) => {
 *   // auth.user, auth.claims, auth.supabase are available
 *   // No need for manual authentication checks
 * });
 * 
 * @param requiredRoles - Array of roles that can access this endpoint
 */
export function withAuth(requiredRoles?: string[]) {
  return function(
    handler: (req: NextRequest, auth: ApiAuthResult) => Promise<NextResponse>
  ) {
    return async function(req: NextRequest) {
      const authResult = await authenticateApiRequestUltraFast(requiredRoles, req);
      
      if ('error' in authResult) {
        return NextResponse.json(
          { error: authResult.error }, 
          { status: authResult.status }
        );
      }

      // Pass the authenticated context to the handler
      return handler(req, authResult);
    };
  };
}

/**
 * Enhanced higher-order function that wraps API route handlers with authentication and rate limiting
 * 
 * Usage:
 * export const POST = withAuthAndRateLimit(['Admin'], { limit: 10, windowMs: 60000 })(async (req, auth) => {
 *   // auth.user, auth.claims, auth.supabase are available
 *   // Rate limiting is automatically handled
 * });
 * 
 * @param requiredRoles - Array of roles that can access this endpoint
 * @param rateLimitConfig - Optional rate limiting configuration
 */
export function withAuthAndRateLimit(requiredRoles?: string[], rateLimitConfig?: RateLimitRule) {
  return function(
    handler: (req: NextRequest, auth: ApiAuthResult) => Promise<NextResponse>
  ) {
    return async function(req: NextRequest) {
      const authResult = await authenticateApiRequestWithRateLimit(req, requiredRoles, rateLimitConfig);
      
      if ('error' in authResult) {
        return NextResponse.json(
          { error: authResult.error }, 
          { status: authResult.status }
        );
      }

      // Pass the authenticated context to the handler
      return handler(req, authResult);
    };
  };
}

/**
 * Legacy compatibility function for gradual migration
 * Mimics the old getUserSessionAndRole() API but uses JWT claims
 * 
 * @deprecated Use authenticateApiRequest() directly for new code
 */
export async function getUserSessionAndRoleOptimized() {
  const authResult = await authenticateApiRequestUltraFast();
  
  if ('error' in authResult) {
    return {
      user: null,
      profile: null,
      role: null,
      error: new Error(authResult.error)
    };
  }

  // Simulate the old profile structure for compatibility
  const profile = {
    id: authResult.user.id,
    role: authResult.claims.user_role,
    client_id: authResult.claims.client_id,
    is_active: authResult.claims.profile_is_active
  };

  return {
    user: authResult.user,
    profile,
    role: authResult.claims.user_role,
    error: null
  };
}

/**
 * PHASE 2 ULTRA-FAST AUTHENTICATION - Uses JWT validation cache to bypass slow Auth server calls
 * This is the fastest authentication method with local JWT validation and Redis caching
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @param request - NextRequest object for security logging and endpoint tracking
 * @returns ApiAuthResult with user, verified claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequestUltraFast(
  requiredRoles?: string[],
  request?: NextRequest
): Promise<ApiAuthResult | ApiAuthError> {
  const startTime = Date.now();
  let jwtValidationTime = 0;
  let cacheTime = 0;
  let supabaseCreateTime = 0;
  
  try {
    // Extract JWT token from cookies - fallback to traditional method if ultra-fast fails
    const cookieStore = await cookies();
    
    // Try to get the token from the session cookie
    let token: string | undefined;
    
    // Look for the main auth token cookie (format: sb-<project-ref>-auth-token)
    const authTokenCookie = cookieStore.getAll()
      .find((cookie: { name: string; value: string }) => cookie.name.includes('auth-token'));
    
    if (authTokenCookie?.value) {
      try {
        const sessionData = JSON.parse(authTokenCookie.value);
        token = sessionData.access_token;
      } catch (error) {
        // Ignore parsing errors and fallback to traditional method
      }
    }
    
    // If we couldn't extract token from cookies, fallback to traditional supabase.auth.getUser()
    if (!token) {
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
          error: userError?.message || 'No user found',
          function: 'authenticateApiRequestUltraFast'
        }, request);
        return { error: "Unauthorized", status: 401 };
      }

      // Get session to access JWT token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
          error: sessionError?.message || 'No session or access token',
          function: 'authenticateApiRequestUltraFast'
        }, request);
        return { error: "Unauthorized", status: 401 };
      }

      token = session.access_token;
    }

    // Fast JWT validation using JWKS endpoint and caching
    const jwtStart = Date.now();
    const jwtResult = await validateJWTFast(token);
    jwtValidationTime = Date.now() - jwtStart;

    if (!jwtResult) {
      securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
        error: 'JWT validation failed',
        function: 'authenticateApiRequestUltraFast'
      }, request);
      return { error: "Unauthorized", status: 401 };
    }

    const { user, payload } = jwtResult;

    // Try Redis cache first for user auth data
    const cacheStart = Date.now();
    const cachedData = await authCacheManager.getCachedUserAuth(user.id);
    cacheTime = Date.now() - cacheStart;
    
    let claims: CustomJWTClaims;
    let cacheHit = false;

    if (cachedData) {
      claims = cachedData.claims;
      cacheHit = true;
    } else {
      // Cache miss - create Supabase client and use RPC function
      const supabaseStart = Date.now();
      const supabase = await createClient();
      supabaseCreateTime = Date.now() - supabaseStart;
      
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_user_auth_profile_cached',
        { user_id: user.id }
      );

      if (rpcError || !rpcData || rpcData.length === 0) {
        securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
          error: rpcError?.message || 'User profile not found via RPC',
          userId: user.id,
          function: 'get_user_auth_profile_cached',
          rpcFunction: 'get_user_auth_profile_cached',
          errorDetails: rpcError ? {
            code: rpcError.code,
            details: rpcError.details,
            hint: rpcError.hint
          } : undefined
        }, request);
        return { error: "User profile not found", status: 403 };
      }

      const profileData = rpcData[0];

      // Build claims from RPC data
      claims = {
        user_role: profileData.user_role as 'Admin' | 'Staff' | 'Client Staff' | 'student',
        client_id: profileData.client_id,
        profile_is_active: profileData.profile_is_active,
        is_student: profileData.is_student,
        student_is_active: profileData.student_is_active,
        job_readiness_star_level: profileData.job_readiness_star_level ? 
          (['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const)[profileData.job_readiness_star_level - 1] : 
          undefined,
        job_readiness_tier: profileData.job_readiness_tier as 'BRONZE' | 'SILVER' | 'GOLD' | undefined,
      };

      // Cache the result for future use
      authCacheManager.setCachedUserAuth(user.id, user, claims).catch(console.error);
    }

    // Role validation using ultra-fast claims
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = claims.user_role;
      const hasRequiredRole = requiredRoles.includes(userRole || '') || 
                            (requiredRoles.includes('student') && userRole === 'student');

      if (!hasRequiredRole) {
        securityLogger.logAuthEvent(SecurityEventType.ROLE_VALIDATION_FAILED, {
          userId: user.id,
          userRole,
          requiredRoles,
          function: 'authenticateApiRequestUltraFast'
        }, request);
        return { 
          error: `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${userRole}`, 
          status: 403 
        };
      }
    }

    const processingTime = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      securityLogger.logAuthEvent(SecurityEventType.AUTH_SUCCESS, {
        userId: user.id,
        userRole: claims.user_role,
        function: 'authenticateApiRequestUltraFast',
        processingTime,
        cacheHit,
        method: cacheHit ? 'jwt-cache-redis' : 'jwt-cache-rpc',
        performanceBreakdown: {
          jwtValidationTime,
          cacheTime,
          supabaseCreateTime,
          totalTime: processingTime
        }
      }, request);
    }

    // Create supabase client only if not already created
    const supabase = await createClient();

    return {
      user,
      claims,
      supabase
    };

  } catch (error) {
    securityLogger.logAuthEvent(SecurityEventType.AUTH_FAILURE, {
      error: error instanceof Error ? error.message : 'Unknown error',
      function: 'authenticateApiRequestUltraFast'
    }, request);
    console.error('Ultra-fast authentication error:', error);
    return { error: "Internal server error", status: 500 };
  }
} 