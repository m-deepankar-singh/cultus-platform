import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AppLoginSchema } from '@/lib/schemas/auth';
// Using the proper @supabase/ssr package per project requirements

export async function POST(request: Request) {
  try {
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
    const { email: rawEmail, password } = validationResult.data;
    const email = rawEmail.trim(); // Explicitly trim the email
    
    console.log(`Student login attempt for email: ${email}`);
    console.log(`Supabase URL being used: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

    // FIRST: Attempt to sign in with Supabase Auth directly
    // This is a more reliable way to check credentials first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    // Handle authentication failure
    if (authError) {
      console.error('Authentication error:', authError.message);
      return NextResponse.json(
        { error: authError.message || 'Invalid login credentials' }, 
        { status: 401 }
      );
    }

    // Defensive check for user data
    if (!authData || !authData.user) {
      console.error('Authentication succeeded but no user data returned');
      return NextResponse.json(
        { error: 'Authentication failed' }, 
        { status: 500 }
      );
    }

    // Get user ID from successful auth
    const userId = authData.user.id;
    console.log(`Auth succeeded for user ID: ${userId}`);
    
    // SECOND: Now check if this user ID exists in the students table
    // This bypasses any email case-sensitivity issues by using the UUID directly
    const serviceClient = await createServiceClient();
    const { data: student, error: studentError } = await serviceClient
      .from('students')
      .select('id, email, client_id, is_active, full_name')
      .eq('id', userId)
      .single();
    
    if (studentError) {
      console.error('Error finding student by ID:', studentError);
      // Sign out since auth succeeded but student lookup failed
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Error verifying student record' },
        { status: 500 }
      );
    }
    
    if (!student) {
      console.warn(`No student record found for authenticated user ID: ${userId}`);
      // Sign out since auth succeeded but no student record exists
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'User authenticated but no student record found. Please contact your administrator.' },
        { status: 403 }
      );
    }
    
    console.log(`Found student record:`, student);
    
    // Check if student is active
    if (!student.is_active) {
      console.warn(`Inactive student login attempt: ${email} (${userId})`);
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
      console.error('Failed to update last_login_at:', updateError);
      // Continue anyway as this is not critical
    }

    console.log(`Student login successful: ${email} (${userId})`);
    
    // Return success response
    return NextResponse.json(
      { 
        message: 'Login successful',
        user: {
          id: userId,
          email: student.email,
          client_id: student.client_id,
          full_name: student.full_name
        },
        accessToken: authData.session?.access_token 
      }, 
      { status: 200 }
    );
  } catch (error) {
    // Top-level error handling
    console.error('Unexpected error during student login:', error);
    
    // Try to sign the user out in case they were authenticated
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('Error during sign-out after exception:', signOutError);
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}
