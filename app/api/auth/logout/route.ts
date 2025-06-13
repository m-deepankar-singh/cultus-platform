import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user for logging purposes
    const { data: { user } } = await supabase.auth.getUser();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      );
    }

    // Log successful logout (optional)
    if (user) {
      console.log(`User ${user.email} logged out successfully`);
    }

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}

// Also support GET for direct navigation to /api/auth/logout
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Redirect to homepage after logout
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);

  } catch (error) {
    console.error('GET logout error:', error);
    // Still redirect even if there's an error
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }
} 