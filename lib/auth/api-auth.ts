import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClaimsFromToken, isTokenExpired, CustomJWTClaims, getVerifiedClaimsFromSession, getVerifiedClaimsFromUser } from './jwt-utils';
import { User } from '@supabase/supabase-js';
import { rateLimitGuard, type RateLimitRule } from '@/lib/rate-limit';

export interface ApiAuthResult {
  user: User;
  claims: CustomJWTClaims;
  supabase: any;
}

export interface ApiAuthError {
  error: string;
  status: number;
}

/**
 * @deprecated SECURITY WARNING: This function is unsafe and will be removed.
 * Use authenticateApiRequestSecure() instead which provides cryptographic validation.
 * This function relies on unsafe JWT decoding.
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequest(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
  console.warn('SECURITY WARNING: authenticateApiRequest is deprecated. Use authenticateApiRequestSecure() instead.');
  try {
    const supabase = await createClient();
    
    // Get user (this works with Authorization header in API routes)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Unauthorized", status: 401 };
    }

    // Get session to access JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return { error: "Unauthorized", status: 401 };
    }

    // Check token expiration
    if (isTokenExpired(session.access_token)) {
      return { error: "Token expired", status: 401 };
    }

    // Extract claims from JWT
    let claims = getClaimsFromToken(session.access_token);

    // If JWT claims are missing critical data (common for students), fetch from database
    if (!claims.client_id || !claims.user_role) {
      // Try to get student data first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, client_id, is_active, job_readiness_star_level, job_readiness_tier')
        .eq('id', user.id)
        .single();

      if (student && !studentError) {
        // User is a student - build claims from student data
        claims = {
          ...claims,
          user_role: 'student',
          client_id: student.client_id,
          profile_is_active: student.is_active,
          is_student: true,
          student_is_active: student.is_active,
          job_readiness_star_level: student.job_readiness_star_level,
          job_readiness_tier: student.job_readiness_tier
        };
      } else {
        // Try profile table for admin/staff users
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, client_id, is_active')
          .eq('id', user.id)
          .single();

        if (profile && !profileError) {
          claims = {
            ...claims,
            user_role: profile.role,
            client_id: profile.client_id,
            profile_is_active: profile.is_active,
            is_student: false
          };
        } else {
          return { error: "User profile not found", status: 403 };
        }
      }
    }

    // Role check - handle student role specially
    if (requiredRoles) {
      const userRole = claims.user_role || 'student';
      const hasRequiredRole = requiredRoles.includes(userRole) || 
        (requiredRoles.includes('student') && claims.is_student);
      
      if (!hasRequiredRole) {
        return { error: "Forbidden", status: 403 };
      }
    }

    return {
      user,
      claims,
      supabase
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { error: "Authentication failed", status: 500 };
  }
}

/**
 * SECURE AUTHENTICATION - Use this for cryptographically verified JWT validation
 * Replaces unsafe JWT decoding with Supabase's built-in validation
 * Uses only getUser() for security - avoids getSession() which may contain unverified data
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, verified claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequestSecure(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
  try {
    const supabase = await createClient();
    
    // Get user with automatic JWT signature validation - this is the ONLY secure method
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Unauthorized", status: 401 };
    }

    // Extract verified claims directly from the authenticated user object
    // This is secure because user data comes from cryptographically verified source
    let claims: CustomJWTClaims;
    try {
      claims = getVerifiedClaimsFromUser(user);
    } catch (error) {
      console.error('Error extracting verified claims from user metadata:', error);
      return { error: "Invalid user metadata", status: 401 };
    }

    // If custom claims are missing, fetch from database
    if (!claims.client_id || !claims.user_role) {
      // Try to get student data first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, client_id, is_active, job_readiness_star_level, job_readiness_tier')
        .eq('id', user.id)
        .single();

      if (student && !studentError) {
        // User is a student - build verified claims from database
        claims = {
          ...claims,
          user_role: 'student',
          client_id: student.client_id,
          profile_is_active: student.is_active,
          is_student: true,
          student_is_active: student.is_active,
          job_readiness_star_level: student.job_readiness_star_level,
          job_readiness_tier: student.job_readiness_tier
        };
      } else {
        // Try profile table for admin/staff users
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, client_id, is_active')
          .eq('id', user.id)
          .single();

        if (profile && !profileError) {
          claims = {
            ...claims,
            user_role: profile.role,
            client_id: profile.client_id,
            profile_is_active: profile.is_active,
            is_student: false
          };
        } else {
          return { error: "User profile not found", status: 403 };
        }
      }
    }

    // Role validation using verified claims
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = claims.user_role;
      const hasRequiredRole = requiredRoles.includes(userRole || '') || 
                            (requiredRoles.includes('student') && userRole === 'student');

      if (!hasRequiredRole) {
        console.warn('JWT_ACCESS_DENIED: Role validation failed', {
          userId: user.id,
          userRole,
          requiredRoles,
          timestamp: new Date().toISOString()
        });
        return { 
          error: `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${userRole}`, 
          status: 403 
        };
      }
    }

    console.log('JWT_API_AUTH_SUCCESS: Secure authentication completed', {
      userId: user.id,
      role: claims.user_role,
      timestamp: new Date().toISOString()
    });

    return {
      user,
      claims,
      supabase
    };

  } catch (error) {
    console.error('Authentication error:', error);
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
    const authResult = await authenticateApiRequestSecure(requiredRoles);
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
        return { error: "Rate limit exceeded", status: 429 };
      }
    }

    return authResult;
  } catch (error) {
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
    const authResult = await authenticateApiRequest(requiredRoles);
    
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
      const authResult = await authenticateApiRequest(requiredRoles);
      
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
  const authResult = await authenticateApiRequest();
  
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