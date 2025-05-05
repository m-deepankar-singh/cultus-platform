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
    const { email, password } = validationResult.data;
    
    console.log(`Student login attempt for email: ${email}`);

    // First check if this email exists in the students table
    console.log(`Checking student record for email: ${email}`);
    
    // Create a service client to bypass RLS policies for checking if the student exists
    const serviceClient = await createServiceClient();
    
    // Use the service client to check for student existence - this bypasses RLS
    const { data: allMatchingStudents, error: listError } = await serviceClient
      .from('students')
      .select('id, email, client_id, is_active')
      .ilike('email', email);
    
    if (listError) {
      console.error('Error listing students by email:', listError);
      return NextResponse.json(
        { error: 'Error verifying student email' },
        { status: 500 }
      );
    }
    
    console.log(`Found ${allMatchingStudents?.length || 0} students matching email: ${email}`);
    
    // If no student records found with this email
    if (!allMatchingStudents || allMatchingStudents.length === 0) {
      console.warn(`No student record found for email: ${email}`);
      return NextResponse.json(
        { error: 'Invalid credentials or user is not a student' },
        { status: 401 }
      );
    }
    
    // Find exact match first (case insensitive)
    const studentByEmail = allMatchingStudents.find(
      student => student.email.toLowerCase() === email.toLowerCase()
    ) || allMatchingStudents[0]; // Fallback to first match if no exact match
    
    console.log('Selected student record:', studentByEmail?.id, studentByEmail?.email);
    
    // Check if student is active
    if (!studentByEmail.is_active) {
      console.warn(`Inactive student login attempt: ${email}`);
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Now attempt Supabase authentication
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

    // Get user ID
    const userId = authData.user.id;
    
    // Additional verification to ensure the authenticated user ID matches the student ID
    if (userId !== studentByEmail.id) {
      console.error(`User ID mismatch: Auth ID ${userId} != Student ID ${studentByEmail.id}`);
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'User verification failed' },
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
          email: email,
          client_id: studentByEmail.client_id
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
