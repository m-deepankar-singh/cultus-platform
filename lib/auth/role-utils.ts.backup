/**
 * Role Utilities for Components
 * 
 * These utilities provide role-based access control for React components
 * using JWT claims instead of database queries for optimal performance.
 */

import { createBrowserClient } from '@supabase/ssr';
import { getClaimsFromToken, isStudentActive, hasRequiredRole, hasAnyRole, getClientId, getJobReadinessInfo } from './jwt-utils';

// Create browser client following SSR guidelines
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Get current user's role from JWT claims (optimized - no database query)
 * @returns Promise<string> User role or 'student' as default
 */
export async function getCurrentUserRole(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return 'student';
  }
  
  const claims = getClaimsFromToken(session.access_token);
  return claims.user_role || 'student';
}

/**
 * Check if current user is an active student (optimized - no database query)
 * @returns Promise<boolean> True if user is an active student
 */
export async function getCurrentUserStudentStatus(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return false;
  }
  
  return isStudentActive(session.access_token);
}

/**
 * Check if current user is admin (optimized - no database query)
 * @returns Promise<boolean> True if user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return false;
  }
  
  return hasRequiredRole(session.access_token, 'Admin');
}

/**
 * Check if current user is admin or staff (optimized - no database query)
 * @returns Promise<boolean> True if user is admin or staff
 */
export async function isCurrentUserAdminOrStaff(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return false;
  }
  
  return hasAnyRole(session.access_token, ['Admin', 'Staff']);
}

/**
 * Check if current user has staff-level access (optimized - no database query)
 * @returns Promise<boolean> True if user is admin, staff, or client staff
 */
export async function isCurrentUserStaffLevel(): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return false;
  }
  
  return hasAnyRole(session.access_token, ['Admin', 'Staff', 'Client Staff']);
}

/**
 * Get current user's client ID from JWT claims (optimized - no database query)
 * @returns Promise<string | null> Client ID or null if not available
 */
export async function getCurrentUserClientId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return null;
  }
  
  return getClientId(session.access_token);
}

/**
 * Get current user's job readiness information (optimized - no database query)
 * @returns Promise<object> Job readiness info with star level, tier, and student status
 */
export async function getCurrentUserJobReadinessInfo(): Promise<{
  starLevel: string | null;
  tier: string | null;
  isStudent: boolean;
}> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return {
      starLevel: null,
      tier: null,
      isStudent: false,
    };
  }
  
  return getJobReadinessInfo(session.access_token);
}

/**
 * Get current user's complete profile from JWT claims (optimized - no database query)
 * @returns Promise<object> Complete user profile from JWT claims
 */
export async function getCurrentUserProfile(): Promise<{
  role: string;
  clientId: string | null;
  isStudent: boolean;
  isActive: boolean;
  jobReadiness: {
    starLevel: string | null;
    tier: string | null;
  };
}> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return {
      role: 'student',
      clientId: null,
      isStudent: false,
      isActive: true,
      jobReadiness: {
        starLevel: null,
        tier: null,
      },
    };
  }
  
  const claims = getClaimsFromToken(session.access_token);
  const jobReadiness = getJobReadinessInfo(session.access_token);
  
  return {
    role: claims.user_role || 'student',
    clientId: claims.client_id || null,
    isStudent: claims.is_student || false,
    isActive: claims.profile_is_active !== false,
    jobReadiness: {
      starLevel: jobReadiness.starLevel,
      tier: jobReadiness.tier,
    },
  };
}

/**
 * Check if current user has access to a specific route (optimized - no database query)
 * @param routePath - The route path to check access for
 * @returns Promise<boolean> True if user has access to the route
 */
export async function hasRouteAccess(routePath: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return false;
  }
  
  // Admin-only routes
  const adminOnlyRoutes = ['/users', '/admin/users', '/modules/create'];
  if (adminOnlyRoutes.some(route => routePath.startsWith(route))) {
    return hasRequiredRole(session.access_token, 'Admin');
  }
  
  // Admin and Staff routes
  const adminStaffRoutes = ['/dashboard', '/clients', '/products', '/learners', '/modules'];
  if (adminStaffRoutes.some(route => routePath.startsWith(route))) {
    return hasAnyRole(session.access_token, ['Admin', 'Staff']);
  }
  
  // Student app routes
  if (routePath.startsWith('/app')) {
    return isStudentActive(session.access_token);
  }
  
  // Default: allow access
  return true;
}

/**
 * Get current session and user (following SSR guidelines)
 * @returns Promise<object> Session and user data
 */
export async function getCurrentSession(): Promise<{
  session: any;
  user: any;
}> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    session,
    user: session?.user || null,
  };
}

// DEPRECATED FUNCTIONS - Kept for backward compatibility during migration
// These will be removed after all components are updated

/**
 * @deprecated Use getCurrentUserRole() instead
 */
export async function getRoleFromProfile(): Promise<string | null> {
  console.warn('getRoleFromProfile is deprecated. Use getCurrentUserRole() instead.');
  return getCurrentUserRole();
}

/**
 * @deprecated Use getCurrentUserStudentStatus() instead
 */
export async function isUserStudent(): Promise<boolean> {
  console.warn('isUserStudent is deprecated. Use getCurrentUserStudentStatus() instead.');
  return getCurrentUserStudentStatus();
} 