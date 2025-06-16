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
 * Replaces the dual-call pattern (getUser + profiles query) with JWT claims
 * 
 * Performance Benefits:
 * - Eliminates 1 database query per request (profiles table lookup)
 * - Uses JWT custom claims for role authorization
 * - Maintains same security guarantees
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

    // Extract claims and check roles using JWT (ZERO database queries)
    const claims = getClaimsFromToken(session.access_token);

    // Role check using JWT claims only - no database queries needed!
    if (requiredRoles && !hasAnyRole(session.access_token, requiredRoles)) {
      return { error: "Forbidden", status: 403 };
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
    return async function(req: NextRequest, context?: any) {
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