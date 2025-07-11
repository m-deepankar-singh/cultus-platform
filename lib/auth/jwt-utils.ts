/**
 * JWT Utilities for Custom Claims
 * 
 * SECURITY UPDATE: This file now includes both secure and legacy functions.
 * Legacy functions are deprecated and will be removed after migration.
 * Use the *Secure functions for cryptographically verified JWT validation.
 */

import { createClient } from '@/lib/supabase/server';
import { User, Session } from '@supabase/supabase-js';

export interface CustomJWTClaims {
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
 * SECURE FUNCTIONS - Use these for cryptographically verified JWT validation
 * These functions replace the unsafe manual JWT decoding with Supabase's built-in validation
 */

/**
 * Extract verified custom claims from authenticated Supabase user
 * This is the most secure method as it uses only cryptographically verified user data
 * @param user - Verified Supabase user object from getUser()
 * @returns Custom claims object with verified data
 */
export function getVerifiedClaimsFromUser(user: User): CustomJWTClaims {
  if (!user) {
    throw new Error('Invalid user: no user data');
  }
  
  // Extract claims from verified user metadata
  // Supabase has already validated the JWT signature via getUser()
  return {
    user_role: user.app_metadata?.user_role || null,
    client_id: user.app_metadata?.client_id || null,
    profile_is_active: user.app_metadata?.profile_is_active !== false,
    is_student: user.app_metadata?.is_student || false,
    student_is_active: user.app_metadata?.student_is_active !== false,
    job_readiness_star_level: user.app_metadata?.job_readiness_star_level || null,
    job_readiness_tier: user.app_metadata?.job_readiness_tier || null,
    sub: user.id,
    aud: user.aud,
    role: user.role,
    iat: Math.floor(Date.now() / 1000), // Current timestamp since user object doesn't contain JWT timing
    exp: Math.floor(Date.now() / 1000) + 3600, // Default 1 hour expiry
  };
}

/**
 * @deprecated SECURITY WARNING: This function uses getSession() which may contain unverified data.
 * Use getVerifiedClaimsFromUser() with getUser() instead for maximum security.
 * Extract verified custom claims from Supabase session
 * @param session - Verified Supabase session object
 * @returns Custom claims object with verified data
 */
export function getVerifiedClaimsFromSession(session: Session): CustomJWTClaims {
  console.warn('SECURITY WARNING: getVerifiedClaimsFromSession is deprecated. Use getVerifiedClaimsFromUser() instead.');
  if (!session?.user) {
    throw new Error('Invalid session: no user data');
  }

  const user = session.user;
  
  // Extract claims from verified session metadata
  // Supabase has already validated the JWT signature
  return {
    user_role: user.app_metadata?.user_role || null,
    client_id: user.app_metadata?.client_id || null,
    profile_is_active: user.app_metadata?.profile_is_active !== false,
    is_student: user.app_metadata?.is_student || false,
    student_is_active: user.app_metadata?.student_is_active !== false,
    job_readiness_star_level: user.app_metadata?.job_readiness_star_level || null,
    job_readiness_tier: user.app_metadata?.job_readiness_tier || null,
    sub: user.id,
    aud: session.user.aud,
    role: user.role,
    iat: Math.floor(Date.now() / 1000), // Current timestamp as issued at time
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expire in 1 hour
  };
}

/**
 * Get verified user claims using the most secure method (getUser only)
 * This avoids the getSession() security vulnerability
 * @returns Verified claims or null if no valid user
 */
export async function getVerifiedClaims(): Promise<CustomJWTClaims | null> {
  try {
    const supabase = await createClient();
    // Use only getUser() for maximum security - avoids unverified storage data
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('JWT_VALIDATION_INFO: No valid authenticated user found');
      return null;
    }
    
    const claims = getVerifiedClaimsFromUser(user);
    console.log('JWT_VALIDATION_SUCCESS: Secure claims extracted from user', { 
      userId: claims.sub, 
      role: claims.user_role,
      timestamp: new Date().toISOString() 
    });
    return claims;
  } catch (error) {
    console.error('JWT_VALIDATION_FAILED: Error getting verified claims', { 
      error: error instanceof Error ? error.message : String(error), 
      timestamp: new Date().toISOString() 
    });
    return null;
  }
}

/**
 * Check if user has required role using verified session
 * @param requiredRole - Required role for access
 * @returns True if user has required role
 */
export async function hasRequiredRoleSecure(requiredRole: string): Promise<boolean> {
  const claims = await getVerifiedClaims();
  if (!claims) return false;
  
  return claims.user_role === requiredRole;
}

/**
 * Check if user has any of the required roles using verified session
 * @param requiredRoles - Array of acceptable roles
 * @returns True if user has any of the required roles
 */
export async function hasAnyRoleSecure(requiredRoles: string[]): Promise<boolean> {
  const claims = await getVerifiedClaims();
  if (!claims) return false;
  
  return requiredRoles.includes(claims.user_role || '');
}

/**
 * Check if user is an active student using verified session
 * @returns True if user is an active student
 */
export async function isStudentActiveSecure(): Promise<boolean> {
  const claims = await getVerifiedClaims();
  if (!claims) return false;
  
  return claims.is_student === true && claims.student_is_active !== false;
}

/**
 * Check if token is expired using verified session
 * @returns True if token is expired
 */
export async function isTokenExpiredSecure(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // If getUser() succeeds, token is valid
    // If it fails, token is expired or invalid
    return error !== null || !user;
  } catch {
    return true; // Treat errors as expired
  }
}

/**
 * LEGACY FUNCTIONS - DEPRECATED DUE TO SECURITY VULNERABILITY
 * These functions are unsafe and will be removed after migration
 */

/**
 * @deprecated SECURITY WARNING: This function is unsafe and will be removed.
 * Use getVerifiedClaims() instead which provides cryptographic validation.
 * This function manually decodes JWT without signature verification.
 * 
 * @param accessToken - The JWT access token
 * @returns Custom claims object with safe defaults
 */
export function getClaimsFromToken(accessToken: string): CustomJWTClaims {
  console.warn('SECURITY WARNING: getClaimsFromToken is deprecated due to security vulnerability. Use getVerifiedClaims() instead.');
  console.error('UNSAFE JWT USAGE DETECTED:', new Error().stack);
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
 * @deprecated SECURITY WARNING: This function is unsafe and will be removed.
 * Use hasRequiredRoleSecure() instead which provides cryptographic validation.
 * 
 * @param accessToken - The JWT access token
 * @param requiredRole - Required role for access
 * @returns True if user has required role
 */
export function hasRequiredRole(
  accessToken: string, 
  requiredRole: string
): boolean {
  console.warn('SECURITY WARNING: hasRequiredRole is deprecated. Use hasRequiredRoleSecure() instead.');
  const claims = getClaimsFromToken(accessToken);
  return claims.user_role === requiredRole;
}

/**
 * @deprecated SECURITY WARNING: This function is unsafe and will be removed.
 * Use hasAnyRoleSecure() instead which provides cryptographic validation.
 * 
 * @param accessToken - The JWT access token
 * @param requiredRoles - Array of acceptable roles
 * @returns True if user has any of the required roles
 */
export function hasAnyRole(
  accessToken: string, 
  requiredRoles: string[]
): boolean {
  console.warn('SECURITY WARNING: hasAnyRole is deprecated. Use hasAnyRoleSecure() instead.');
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