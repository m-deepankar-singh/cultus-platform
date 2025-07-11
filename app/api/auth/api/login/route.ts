import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  errorHandler, 
  createErrorContext, 
  handleSecureError, 
  SecurityEventType 
} from '@/lib/security/error-handler';
import { 
  checkLoginLockout, 
  recordLoginAttempt, 
  LOCKOUT_CONFIGS 
} from '@/lib/security/account-lockout';
import { auditLogger, AuditEventType, logAuthEvent } from '@/lib/security/audit-logger';

// Define the schema for the login request body using Zod
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // Create error context for secure logging
  const errorContext = createErrorContext('/api/auth/api/login', 'POST', {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  try {
    // 1. Parse and validate the request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return handleSecureError(validation.error, errorContext, 'validation');
    }

    const { email, password } = validation.data;

    // 2. Check for account lockout before attempting authentication
    const lockoutStatus = checkLoginLockout(email, errorContext.ip!, {
      ip: errorContext.ip!,
      userAgent: errorContext.userAgent!,
      endpoint: errorContext.endpoint,
      method: errorContext.method,
    });

    if (lockoutStatus.emailLocked || lockoutStatus.ipLocked) {
      const lockedType = lockoutStatus.emailLocked ? 'email' : 'ip';
      const lockoutInfo = lockoutStatus.emailLocked ? lockoutStatus.emailInfo : lockoutStatus.ipInfo;
      
      return errorHandler.createSecureResponse(
        "AUTH_ACCOUNT_LOCKED",
        423,
        errorContext.requestId
      );
    }

    // 3. Attempt Supabase Authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      // Record failed login attempt
      recordLoginAttempt(email, errorContext.ip!, {
        ip: errorContext.ip!,
        userAgent: errorContext.userAgent!,
        endpoint: errorContext.endpoint,
        method: errorContext.method,
        additionalData: { email, authErrorCode: authError?.status },
      });
      
      // Update error context with user info for security logging
      const authErrorContext = {
        ...errorContext,
        additionalData: { email, authErrorCode: authError?.status },
      };
      
      return handleSecureError(authError || new Error('Authentication failed'), authErrorContext, 'auth');
    }

    const userId = authData.user.id;
    // Update error context with authenticated user info
    errorContext.userId = userId;

    // 3. Verify the user exists in the 'students' table and is active (for Main App access)
    const { data: studentData, error: studentFetchError } = await supabase
      .from('students')
      .select('id, is_active')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle as they might not be a student

    // Check for database error during student fetch (excluding not found)
    if (studentFetchError && studentFetchError.code !== 'PGRST116') {
      return handleSecureError(studentFetchError, errorContext, 'database');
    }

    // If found and active in students table, grant Main App access
    if (studentData && studentData.is_active) {
      // Log successful login
      logAuthEvent(AuditEventType.LOGIN_SUCCESS, {
        userId: userId,
        userRole: 'student',
        ip: errorContext.ip!,
        userAgent: errorContext.userAgent!,
        endpoint: errorContext.endpoint,
        details: {
          email: email,
          loginType: 'student',
          sessionId: authData.session?.access_token?.substring(0, 10) + '...',
        },
      });
      
      return NextResponse.json({ 
        message: 'Login successful (Student)',
        accessToken: authData.session?.access_token 
      }, { status: 200 });
    }

    // 4. If not an active student, check if they are an active Admin Panel user
    const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle as they might not have a profile

    // Check for database error during profile fetch (excluding not found)
    if (profileFetchError && profileFetchError.code !== 'PGRST116') {
        return handleSecureError(profileFetchError, errorContext, 'database');
    }

    // Define valid roles for the Admin Panel
    const ADMIN_PANEL_ROLES = ['Admin', 'Staff', 'Viewer', 'Client Staff'];

    // Check if found in profiles, is active, and has a valid Admin Panel role
    if (profileData && profileData.is_active && ADMIN_PANEL_ROLES.includes(profileData.role)) {
        // Log successful login
        logAuthEvent(AuditEventType.LOGIN_SUCCESS, {
          userId: userId,
          userRole: profileData.role,
          ip: errorContext.ip!,
          userAgent: errorContext.userAgent!,
          endpoint: errorContext.endpoint,
          details: {
            email: email,
            loginType: 'admin_panel',
            role: profileData.role,
            sessionId: authData.session?.access_token?.substring(0, 10) + '...',
          },
        });
        
        // Include both the access token and the refresh token
        return NextResponse.json(
          {
            message: 'Login successful (Admin Panel User)',
            accessToken: authData.session?.access_token,
            refreshToken: authData.session?.refresh_token,
            role: profileData.role
          },
          { status: 200 }
        );
    }

    // 5. If neither check passed, deny access
    await supabase.auth.signOut(); 
    return handleSecureError(
      new Error('User not authorized for access'), 
      errorContext, 
      'forbidden'
    );

  } catch (error) {
    return handleSecureError(error, errorContext, 'generic');
  }
} 