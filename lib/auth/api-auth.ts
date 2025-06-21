import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAnyRole, getClaimsFromToken, isTokenExpired, CustomJWTClaims } from './jwt-utils';
import { User } from '@supabase/supabase-js';

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
 * Optimized authentication for API routes
 * Handles both profile-based users (admin/staff) and students
 * Falls back to database queries when JWT claims are missing
 * 
 * @param requiredRoles - Array of roles that are allowed to access the endpoint
 * @returns ApiAuthResult with user, claims, and supabase client OR ApiAuthError
 */
export async function authenticateApiRequest(
  requiredRoles?: string[]
): Promise<ApiAuthResult | ApiAuthError> {
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