/**
 * JWT Utilities for Custom Claims
 * 
 * These utilities extract custom claims from JWT tokens, eliminating the need
 * for database queries in middleware and components.
 */

interface CustomJWTClaims {
  // From profiles table
  user_role?: 'Admin' | 'Staff' | 'Client Staff' | 'student';
  client_id?: string;
  profile_is_active?: boolean;
  
  // From students table  
  is_student?: boolean;
  student_is_active?: boolean;
  job_readiness_star_level?: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  job_readiness_tier?: 'BRONZE' | 'SILVER' | 'GOLD';
  
  // Standard JWT claims
  sub?: string;
  aud?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Safely decode JWT token and extract custom claims
 * @param accessToken - The JWT access token
 * @returns Custom claims object with safe defaults
 */
export function getClaimsFromToken(accessToken: string): CustomJWTClaims {
  try {
    // Simple base64 decode of JWT payload (middle section)
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    // Add padding if needed for base64 decode
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(paddedPayload));
    
    return {
      user_role: decoded.user_role || 'student',
      client_id: decoded.client_id,
      profile_is_active: decoded.profile_is_active !== false,
      is_student: decoded.is_student || false,
      student_is_active: decoded.student_is_active !== false,
      job_readiness_star_level: decoded.job_readiness_star_level,
      job_readiness_tier: decoded.job_readiness_tier,
      sub: decoded.sub,
      aud: decoded.aud,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    // Return safe defaults on error
    return {
      user_role: 'student',
      profile_is_active: true,
      is_student: false,
      student_is_active: false,
    };
  }
}

/**
 * Check if user has required role
 * @param accessToken - The JWT access token
 * @param requiredRole - Required role for access
 * @returns True if user has required role
 */
export function hasRequiredRole(
  accessToken: string, 
  requiredRole: string
): boolean {
  const claims = getClaimsFromToken(accessToken);
  return claims.user_role === requiredRole;
}

/**
 * Check if user has any of the required roles
 * @param accessToken - The JWT access token
 * @param requiredRoles - Array of acceptable roles
 * @returns True if user has any of the required roles
 */
export function hasAnyRole(
  accessToken: string, 
  requiredRoles: string[]
): boolean {
  const claims = getClaimsFromToken(accessToken);
  return requiredRoles.includes(claims.user_role || 'student');
}

/**
 * Check if user is an active student
 * @param accessToken - The JWT access token
 * @returns True if user is an active student
 */
export function isStudentActive(accessToken: string): boolean {
  const claims = getClaimsFromToken(accessToken);
  return claims.is_student === true && claims.student_is_active !== false;
}

/**
 * Check if user is admin
 * @param accessToken - The JWT access token
 * @returns True if user is admin
 */
export function isAdmin(accessToken: string): boolean {
  return hasRequiredRole(accessToken, 'Admin');
}

/**
 * Check if user is admin or staff
 * @param accessToken - The JWT access token
 * @returns True if user is admin or staff
 */
export function isAdminOrStaff(accessToken: string): boolean {
  return hasAnyRole(accessToken, ['Admin', 'Staff']);
}

/**
 * Check if user is admin, staff, or client staff
 * @param accessToken - The JWT access token
 * @returns True if user has any staff-level role
 */
export function isStaffLevel(accessToken: string): boolean {
  return hasAnyRole(accessToken, ['Admin', 'Staff', 'Client Staff']);
}

/**
 * Get user's client ID from JWT claims
 * @param accessToken - The JWT access token
 * @returns Client ID or null if not available
 */
export function getClientId(accessToken: string): string | null {
  const claims = getClaimsFromToken(accessToken);
  return claims.client_id || null;
}

/**
 * Get user's job readiness information
 * @param accessToken - The JWT access token
 * @returns Job readiness info object
 */
export function getJobReadinessInfo(accessToken: string): {
  starLevel: string | null;
  tier: string | null;
  isStudent: boolean;
} {
  const claims = getClaimsFromToken(accessToken);
  return {
    starLevel: claims.job_readiness_star_level || null,
    tier: claims.job_readiness_tier || null,
    isStudent: claims.is_student || false,
  };
}

/**
 * Check if JWT token is expired
 * @param accessToken - The JWT access token
 * @returns True if token is expired
 */
export function isTokenExpired(accessToken: string): boolean {
  try {
    const claims = getClaimsFromToken(accessToken);
    if (!claims.exp) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return claims.exp < currentTime;
  } catch {
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Get time until token expires
 * @param accessToken - The JWT access token
 * @returns Seconds until expiration, or null if no expiration
 */
export function getTokenExpirationTime(accessToken: string): number | null {
  try {
    const claims = getClaimsFromToken(accessToken);
    if (!claims.exp) return null;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, claims.exp - currentTime);
  } catch {
    return null;
  }
} 