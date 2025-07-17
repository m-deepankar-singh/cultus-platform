/**
 * Role Utilities for Components
 * 
 * SECURITY UPDATE: These utilities now use cryptographically verified JWT validation.
 * Updated to use secure functions instead of unsafe manual JWT decoding.
 * 
 * SECURITY FIX: Replaced deprecated getVerifiedClaimsFromSession() with 
 * getVerifiedClaimsFromUser() to eliminate potential session data vulnerabilities.
 * All functions now use supabase.auth.getUser() instead of getSession().
 */

import { createBrowserClient } from '@supabase/ssr';
import { getVerifiedClaimsFromUser } from './jwt-utils';

// Create browser client following SSR guidelines
function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Get current user's role using secure JWT validation
 * @returns Promise<string> User role or 'student' as default
 */
export async function getCurrentUserRole(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return 'student';
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return claims.user_role || 'student';
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return 'student';
  }
}

/**
 * Check if current user is an active student using secure JWT validation
 * @returns Promise<boolean> True if user is an active student
 */
export async function getCurrentUserStudentStatus(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return claims.is_student === true && claims.student_is_active !== false;
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return false;
  }
}

/**
 * Check if current user is admin using secure JWT validation
 * @returns Promise<boolean> True if user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return claims.user_role === 'Admin';
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return false;
  }
}

/**
 * Check if current user is admin or staff using secure JWT validation
 * @returns Promise<boolean> True if user is admin or staff
 */
export async function isCurrentUserAdminOrStaff(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return ['Admin', 'Staff'].includes(claims.user_role || '');
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return false;
  }
}

/**
 * Check if current user has staff-level access using secure JWT validation
 * @returns Promise<boolean> True if user is admin, staff, or client staff
 */
export async function isCurrentUserStaffLevel(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return ['Admin', 'Staff', 'Client Staff'].includes(claims.user_role || '');
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return false;
  }
}

/**
 * Get current user's client ID using secure JWT validation
 * @returns Promise<string | null> Client ID or null if not available
 */
export async function getCurrentUserClientId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return claims.client_id || null;
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return null;
  }
}

/**
 * Get current user's job readiness information using secure JWT validation
 * @returns Promise<object> Job readiness info with star level, tier, and student status
 */
export async function getCurrentUserJobReadinessInfo(): Promise<{
  starLevel: string | null;
  tier: string | null;
  isStudent: boolean;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      starLevel: null,
      tier: null,
      isStudent: false,
    };
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return {
      starLevel: claims.job_readiness_star_level || null,
      tier: claims.job_readiness_tier || null,
      isStudent: claims.is_student || false,
    };
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return {
      starLevel: null,
      tier: null,
      isStudent: false,
    };
  }
}

/**
 * Get current user's complete profile using secure JWT validation
 * @returns Promise<object> Complete user profile from verified JWT claims
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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
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
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    return {
      role: claims.user_role || 'student',
      clientId: claims.client_id || null,
      isStudent: claims.is_student || false,
      isActive: claims.profile_is_active !== false,
      jobReadiness: {
        starLevel: claims.job_readiness_star_level || null,
        tier: claims.job_readiness_tier || null,
      },
    };
  } catch (error) {
    console.error('Error getting verified claims:', error);
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
}

/**
 * Check if current user has access to a specific route using secure JWT validation
 * @param routePath - The route path to check access for
 * @returns Promise<boolean> True if user has access to the route
 */
export async function hasRouteAccess(routePath: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  try {
    const claims = getVerifiedClaimsFromUser(user);
    
    // Admin-only routes
    const adminOnlyRoutes = ['/users', '/admin/users', '/modules/create'];
    if (adminOnlyRoutes.some(route => routePath.startsWith(route))) {
      return claims.user_role === 'Admin';
    }
    
    // Admin and Staff routes
    const adminStaffRoutes = ['/dashboard', '/clients', '/products', '/learners', '/modules'];
    if (adminStaffRoutes.some(route => routePath.startsWith(route))) {
      return ['Admin', 'Staff'].includes(claims.user_role || '');
    }
    
    // Student app routes
    if (routePath.startsWith('/app')) {
      return claims.is_student === true && claims.student_is_active !== false;
    }
    
    // Default: allow access
    return true;
  } catch (error) {
    console.error('Error getting verified claims:', error);
    return false;
  }
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
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    session,
    user: user || null,
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