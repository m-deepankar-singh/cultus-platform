// This login route is intentionally left as-is since it's the endpoint that creates the JWT authentication session
// No JWT authentication optimization needed here as this endpoint handles the login process itself
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AppLoginSchema } from '@/lib/schemas/auth';
import { RATE_LIMIT_CONFIGS, rateLimitGuard } from '@/lib/rate-limit';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';
// Using the proper @supabase/ssr package per project requirements

export async function POST(request: NextRequest) {
  try {
    // Log student login attempt
    securityLogger.logEvent({
      eventType: SecurityEventType.STUDENT_API_ACCESS,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.STUDENT_ACTIVITY,
      endpoint: '/api/app/auth/login',
      method: 'POST',
      details: { operation: 'student_login_attempt' }
    }, request);

    // Check rate limit before processing login attempt
    const rateLimitResponse = await rateLimitGuard(
      request,
      undefined, // No user ID yet since this is login
      undefined, // No user role yet
      RATE_LIMIT_CONFIGS.AUTH_LOGIN
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Create Supabase client
    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = AppLoginSchema.safeParse(body);

    // Handle validation errors
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validationResult.error.flatten() 
        }, 
        { status: 400 }
      );
    }

    // Get validated data
    const { email: rawEmail, password, rememberMe } = validationResult.data;
    const email = rawEmail.trim(); // Explicitly trim the email

    // FIRST: Attempt to sign in with Supabase Auth directly
    // This is a more reliable way to check credentials first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    // Handle authentication failure
    if (authError) {
      securityLogger.logEvent({
        eventType: SecurityEventType.STUDENT_AUTH_FAILURE,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHENTICATION,
        endpoint: '/api/app/auth/login',
        method: 'POST',
        details: { 
          operation: 'student_login_failed',
          error: authError.message,
          email: email
        }
      }, request);
      
      return NextResponse.json(
        { error: authError.message || 'Invalid login credentials' }, 
        { status: 401 }
      );
    }

    // Defensive check for user data
    if (!authData || !authData.user) {
      return NextResponse.json(
        { error: 'Authentication failed' }, 
        { status: 500 }
      );
    }

    // Get user ID from successful auth
    const userId = authData.user.id;
    
    // SECOND: Now check if this user ID exists in the students table
    // This bypasses any email case-sensitivity issues by using the UUID directly
    const serviceClient = await createServiceClient();
    const { data: student, error: studentError } = await serviceClient
      .from('students')
      .select('id, email, client_id, is_active, full_name')
      .eq('id', userId)
      .single();
    
    if (studentError) {
      // Sign out since auth succeeded but student lookup failed
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Error verifying student record' },
        { status: 500 }
      );
    }
    
    if (!student) {
      // Sign out since auth succeeded but no student record exists
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'User authenticated but no student record found. Please contact your administrator.' },
        { status: 403 }
      );
    }
    
    // Check if student is active
    if (!student.is_active) {
      // Sign out since student is inactive
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Update the last_login_at timestamp
    const { error: updateError } = await supabase
      .from('students')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      // Continue anyway as this is not critical
    }
    
    // Log successful student login
    securityLogger.logEvent({
      eventType: SecurityEventType.STUDENT_AUTH_SUCCESS,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.AUTHENTICATION,
      userId: userId,
      userRole: 'student',
      endpoint: '/api/app/auth/login',
      method: 'POST',
      details: { 
        operation: 'student_login_success',
        email: student.email,
        clientId: student.client_id,
        fullName: student.full_name
      }
    }, request);
    
    // Return success response with remember me preference
    return NextResponse.json(
      { 
        message: 'Login successful',
        user: {
          id: userId,
          email: student.email,
          client_id: student.client_id,
          full_name: student.full_name
        },
        rememberMe: rememberMe,
        accessToken: authData.session?.access_token 
      }, 
      { status: 200 }
    );
  } catch (error) {
    // Log system error for student login
    securityLogger.logEvent({
      eventType: SecurityEventType.SYSTEM_ERROR,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.AUTHENTICATION,
      endpoint: '/api/app/auth/login',
      method: 'POST',
      details: { 
        operation: 'student_login_system_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, request);
    
    // Try to sign the user out in case they were authenticated
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      // Silent fail - don't expose errors
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}
