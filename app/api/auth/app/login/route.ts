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

    // 3. Verify the user exists in the 'students' table and is active
    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from('students')
      .select('id, is_active')
      .eq('id', userId)
      .single();

    if (studentError) {
      // Handle cases like student record not found (PGRST116)
      console.error('Student Verification Error:', studentError);
      return NextResponse.json(
        { error: 'User not authorized for this application' },
        { status: 403 } // Forbidden access
      );
    }

    if (!studentData || !studentData.is_active) {
      // Student record exists but is marked inactive
      console.warn(`Inactive student login attempt: ${userId}`);
      return NextResponse.json(
        { error: 'Account is inactive or not authorized' },
        { status: 403 }
      );
    }

    // 4. Both checks passed - Login successful for Main App
    // Note: The session cookie is automatically handled by the Supabase client (via middleware)
    console.log(`Student login successful: ${userId}`);
    return NextResponse.json({ message: 'Login successful' }, { status: 200 });

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 