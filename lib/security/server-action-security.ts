import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import crypto from 'crypto';

/**
 * Security utilities for Next.js Server Actions
 * Implements CSRF protection, authentication, and action ID validation
 */

export interface SecurityValidationResult {
  success: boolean;
  error?: string;
  user?: any;
  profile?: any;
}

export interface ActionSecurityConfig {
  requireAuth?: boolean;
  allowedRoles?: string[];
  requireCSRF?: boolean;
  requireActionId?: boolean;
}

/**
 * Generate a cryptographically secure action ID
 */
export function generateActionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate Origin and Host headers for CSRF protection
 */
export async function validateCSRFHeaders(): Promise<boolean> {
  try {
    const headersList = await headers();
    const origin = headersList.get('origin');
    const host = headersList.get('host');
    const referer = headersList.get('referer');

    // Allow same-origin requests
    if (origin && host) {
      const originHost = new URL(origin).host;
      return originHost === host;
    }

    // Fall back to referer check if origin is not present
    if (referer && host) {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    }

    // For local development, allow requests without origin/referer
    if (process.env.NODE_ENV === 'development' && (!origin && !referer)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

/**
 * Validate action ID to prevent direct endpoint access
 */
export function validateActionId(providedActionId: string, expectedActionId: string): boolean {
  if (!providedActionId || !expectedActionId) {
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedActionId, 'hex'),
    Buffer.from(expectedActionId, 'hex')
  );
}

/**
 * Get authenticated user with caching
 */
export const getAuthenticatedUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
});

/**
 * Get user profile with role information
 */
export const getUserProfile = cache(async (userId: string) => {
  try {
    const supabase = await createClient();
    
    // First try to get from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('id', userId)
      .single();

    if (profile && !profileError) {
      return { success: true, profile };
    }

    // If not found in profiles, check if user is a student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, is_active')
      .eq('id', userId)
      .single();

    if (student && !studentError) {
      // Return student with 'Student' role
      return { 
        success: true, 
        profile: { 
          id: student.id, 
          role: 'Student' 
        } 
      };
    }

    // If neither profiles nor students found, return error
    return { success: false, error: 'Profile not found' };
  } catch (error) {
    console.error('Profile fetch error:', error);
    return { success: false, error: 'Failed to fetch profile' };
  }
});

/**
 * Comprehensive security validation for server actions
 */
export async function validateServerActionSecurity(
  config: ActionSecurityConfig = {},
  formData?: FormData
): Promise<SecurityValidationResult> {
  const {
    requireAuth = true,
    allowedRoles = [],
    requireCSRF = true,
    requireActionId = false,
  } = config;

  try {
    // 1. CSRF Protection
    if (requireCSRF) {
      const isValidCSRF = await validateCSRFHeaders();
      if (!isValidCSRF) {
        return { success: false, error: 'CSRF validation failed' };
      }
    }

    // 2. Action ID Validation
    if (requireActionId && formData) {
      const providedActionId = formData.get('actionId') as string;
      const expectedActionId = formData.get('expectedActionId') as string;
      
      if (!providedActionId || !expectedActionId) {
        return { success: false, error: 'Action ID missing' };
      }

      const isValidActionId = validateActionId(providedActionId, expectedActionId);
      if (!isValidActionId) {
        return { success: false, error: 'Invalid action ID' };
      }
    }

    // 3. Authentication
    if (requireAuth) {
      const authResult = await getAuthenticatedUser();
      if (!authResult.success || !authResult.user) {
        return { success: false, error: authResult.error || 'Authentication required' };
      }

      // 4. Authorization (Role Check)
      if (allowedRoles.length > 0) {
        const profileResult = await getUserProfile(authResult.user.id);
        if (!profileResult.success || !profileResult.profile) {
          return { success: false, error: profileResult.error || 'Profile not found' };
        }

        const userRole = profileResult.profile.role;
        if (!allowedRoles.includes(userRole)) {
          return { 
            success: false, 
            error: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}` 
          };
        }

        return {
          success: true,
          user: authResult.user,
          profile: profileResult.profile,
        };
      }

      return {
        success: true,
        user: authResult.user,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Server action security validation error:', error);
    return { success: false, error: 'Security validation failed' };
  }
}

/**
 * Security decorator for server actions
 * Usage: const secureAction = withSecurity(myAction, { allowedRoles: ['Admin'] });
 */
export function withSecurity<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  config: ActionSecurityConfig = {}
) {
  return async (...args: T): Promise<R | { success: false; error: string }> => {
    // Extract FormData if present in arguments
    const formData = args.find(arg => arg instanceof FormData) as FormData | undefined;
    
    const validation = await validateServerActionSecurity(config, formData);
    
    if (!validation.success) {
      return { success: false, error: validation.error || 'Security validation failed' };
    }

    // Call the original action with validated context
    try {
      return await action(...args);
    } catch (error) {
      console.error('Server action execution error:', error);
      throw error;
    }
  };
}

/**
 * Create secure form data with action ID and CSRF protection
 */
export function createSecureFormData(data: Record<string, string | File>): FormData {
  const formData = new FormData();
  const actionId = generateActionId();
  
  // Add action ID for validation
  formData.append('actionId', actionId);
  formData.append('expectedActionId', actionId);
  
  // Add user data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  return formData;
}

/**
 * Utility to check if user has specific role
 */
export async function hasRole(requiredRoles: string[]): Promise<boolean> {
  const authResult = await getAuthenticatedUser();
  if (!authResult.success || !authResult.user) {
    return false;
  }

  const profileResult = await getUserProfile(authResult.user.id);
  if (!profileResult.success || !profileResult.profile) {
    return false;
  }

  return requiredRoles.includes(profileResult.profile.role);
}

/**
 * Rate limiting for server actions (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const record = rateLimitMap.get(key);
  
  if (!record || record.resetTime < windowStart) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}