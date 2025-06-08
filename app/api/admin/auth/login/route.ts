import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminLoginSchema } from '@/lib/schemas/auth';
// Using the proper @supabase/ssr package per project requirements

export async function POST(request: Request) {
  try {
    // Parse request body first
    const body = await request.json();

    // Validate with schema
    const validationResult = AdminLoginSchema.safeParse(body);

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

    // Create Supabase client
    const supabase = await createClient();
    
    // FIRST: Attempt to sign in with Supabase Auth directly
    // This is a more reliable way to check credentials first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    // Handle authentication failure
    if (authError) {
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
    
    // SECOND: Now check if this user ID exists in the profiles table with admin/staff role
    // This bypasses any email case-sensitivity issues by using the UUID directly
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, is_active')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      // Sign out since auth succeeded but profile lookup failed
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Error verifying admin profile' },
        { status: 500 }
      );
    }
    
    if (!profile) {
      // Sign out since auth succeeded but no profile record exists
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'User authenticated but no admin profile found. Please contact your administrator.' },
        { status: 403 }
      );
    }
    
    // Check if user has admin or staff role
    if (!profile.role || !['Admin', 'Staff'].includes(profile.role)) {
      // Sign out since user doesn't have admin/staff permissions
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Access denied. Admin or Staff role required.' },
        { status: 403 }
      );
    }
    
    // Check if profile is active
    if (!profile.is_active) {
      // Sign out since profile is inactive
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Update the last_login_at timestamp in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      // Continue anyway as this is not critical
    }
    
    // Return success response with user info and remember me preference
    return NextResponse.json(
      { 
        message: 'Login successful',
        user: {
          id: userId,
          email: authData.user.email,
          role: profile.role,
          full_name: profile.full_name
        },
        rememberMe: rememberMe,
        accessToken: authData.session?.access_token 
      }, 
      { status: 200 }
    );
  } catch (error) {
    // Try to sign the user out in case they were authenticated
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      // Silent error handling for production
    }
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred'
      }, 
      { status: 500 }
    );
  }
} 