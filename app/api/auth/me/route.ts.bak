import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestWithRateLimitSecure } from '@/lib/auth/api-auth';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { 
  errorHandler, 
  createErrorContext, 
  handleSecureError 
} from '@/lib/security/error-handler';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

/**
 * GET /api/auth/me
 * 
 * Returns information about the currently authenticated user
 * including their profile data and role from JWT claims.
 */
export async function GET(request: NextRequest) {
  // Log user profile access attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.AUTHENTICATION,
    endpoint: '/api/auth/me',
    method: 'GET',
    details: {
      operation: 'user_profile_access',
      stage: 'attempt'
    }
  }, request);

  // Create error context for secure logging
  const errorContext = createErrorContext('/api/auth/me', 'GET', {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  try {
    // JWT-based authentication with rate limiting (0 database queries for basic user info)
    const authResult = await authenticateApiRequestWithRateLimitSecure(
      request,
      undefined, // No role restrictions
      RATE_LIMIT_CONFIGS.AUTH_VALIDATION
    );
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: '/api/auth/me',
        method: 'GET',
        details: {
          operation: 'user_profile_access',
          error: authResult.error
        }
      }, request);
      return NextResponse.json({
        user: null,
        role: null
      }, { status: 401 });
    }
    const { user, claims, supabase } = authResult;
    
    // Update error context with authenticated user info
    errorContext.userId = user.id;

    // Get basic user info from JWT claims
    const userRole = claims.user_role;
    const clientId = claims.client_id;
    const isActive = claims.profile_is_active;
    const isStudent = claims.is_student;

         // For students, get additional data from database (minimal query)
     if (isStudent || userRole === 'student') {
       const { data: studentData } = await supabase
         .from('students')
         .select('full_name, job_readiness_background_type, job_readiness_tier, job_readiness_star_level')
         .eq('id', user.id)
         .maybeSingle();

       securityLogger.logEvent({
         eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
         severity: SecuritySeverity.INFO,
         category: SecurityCategory.AUTHENTICATION,
         userId: user.id,
         userRole: 'student',
         endpoint: '/api/auth/me',
         method: 'GET',
         details: {
           operation: 'user_profile_access',
           userType: 'student',
           stage: 'success'
         }
       }, request);

       return NextResponse.json({
         user: {
           id: user.id,
           email: user.email
         },
         role: 'student',
         profile: {
           fullName: studentData?.full_name || null,
           backgroundType: studentData?.job_readiness_background_type || null,
           tier: studentData?.job_readiness_tier || null,
           starLevel: studentData?.job_readiness_star_level || null,
           clientId: clientId || null
         }
       });
    } else if (userRole && ['Admin', 'Staff', 'Client Staff', 'Viewer'].includes(userRole)) {
      // For admin/staff users, get full_name from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      securityLogger.logEvent({
        eventType: SecurityEventType.SENSITIVE_DATA_ACCESS,
        severity: SecuritySeverity.INFO,
        category: SecurityCategory.AUTHENTICATION,
        userId: user.id,
        userRole: userRole,
        endpoint: '/api/auth/me',
        method: 'GET',
        details: {
          operation: 'user_profile_access',
          userType: 'admin_staff',
          stage: 'success'
        }
      }, request);

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email
        },
        role: userRole,
        profile: {
          fullName: profile?.full_name || null,
          clientId: clientId || null,
          isActive: isActive
        }
      });
    } else {
      // User exists but no valid role found
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email
        },
        role: null,
        profile: null
      });
    }
    
  } catch (error) {
    return handleSecureError(error, errorContext, 'generic');
  }
} 