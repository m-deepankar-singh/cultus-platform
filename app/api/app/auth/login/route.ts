import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AppLoginSchema } from '@/lib/schemas/auth';

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

    // Attempt Supabase authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    // Handle authentication failure
    if (authError) {
      return NextResponse.json(
        { 
          error: authError.message || 'Invalid login credentials' 
        }, 
        { status: 401 }
      );
    }

    // Defensive check for user data
    if (!authData || !authData.user) {
      return NextResponse.json(
        { 
          error: 'Authentication failed' 
        }, 
        { status: 500 }
      );
    }

    // Get user ID for verification
    const userId = authData.user.id;

    // Fetch student record to verify client_id and active status
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students') // Query the students table
      .select('client_id, is_active') // Select relevant fields from students
      .eq('id', userId)
      .single();

    // Handle student record fetch errors
    if (studentFetchError) {
      console.error('Student record fetch error after login:', studentFetchError);

      // Sign out the potentially logged-in user
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          error: 'Error verifying user status'
        },
        { status: 500 }
      );
    }

    // Verify the user is an active student with a client_id in the students table
    const isVerifiedStudent =
      studentRecord &&
      studentRecord.client_id &&
      studentRecord.is_active === true;

    // Handle verification result
    if (isVerifiedStudent) {
      // Login successful and verified - return token for testing
      return NextResponse.json(
        { 
          message: 'Login successful',
          accessToken: authData.session?.access_token // Include the access token
        }, 
        { status: 200 }
      );
    } else {
      // Verification failed - sign the user out immediately
      await supabase.auth.signOut();
      
      return NextResponse.json(
        { 
          error: 'Access denied. User is not an active, enrolled student.' 
        }, 
        { status: 403 }
      );
    }
  } catch (error) {
    // Top-level error handling
    console.error('Unexpected error during login:', error);
    
    // Try to sign the user out in case they were authenticated
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('Error during sign-out after exception:', signOutError);
    }
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred' 
      }, 
      { status: 500 }
    );
  }
}
