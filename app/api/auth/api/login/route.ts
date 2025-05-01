import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Define the schema for the login request body using Zod
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    // 1. Parse and validate the request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // 2. Attempt Supabase Authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      console.error('Supabase Auth Error:', authError);
      // Return a generic error message for security
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    // Log session token information (masked for security)
    console.log(`Auth successful for ${email}, session token length: ${authData.session?.access_token?.length || 0} characters`);

    // 3. Verify the user exists in the 'students' table and is active (for Main App access)
    const { data: studentData, error: studentFetchError } = await supabase
      .from('students')
      .select('id, is_active')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle as they might not be a student

    // Check for database error during student fetch (excluding not found)
    if (studentFetchError && studentFetchError.code !== 'PGRST116') {
      console.error('Student Verification DB Error:', studentFetchError);
      return NextResponse.json({ error: 'Error verifying user status' }, { status: 500 });
    }

    // If found and active in students table, grant Main App access
    if (studentData && studentData.is_active) {
      console.log(`Student login successful: ${userId}`);
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
        console.error('Profile Verification DB Error:', profileFetchError);
        return NextResponse.json({ error: 'Error verifying user status' }, { status: 500 });
    }

    // Define valid roles for the Admin Panel
    const ADMIN_PANEL_ROLES = ['Admin', 'Staff', 'Viewer', 'Client Staff'];

    // Check if found in profiles, is active, and has a valid Admin Panel role
    if (profileData && profileData.is_active && ADMIN_PANEL_ROLES.includes(profileData.role)) {
        console.log(`Admin Panel user login successful: ${userId} (Role: ${profileData.role})`);
        
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
    console.warn(`Login failed for user ${userId}: Not an active student or authorized admin panel user.`);
    // Sign out the user as they are authenticated but not authorized for either app
    await supabase.auth.signOut(); 
    return NextResponse.json(
      { error: 'User not authorized for access' },
      { status: 403 } // Forbidden access
    );

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 