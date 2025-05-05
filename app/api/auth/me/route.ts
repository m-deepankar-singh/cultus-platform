import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/me
 * 
 * Returns information about the currently authenticated user
 * including their profile data and role.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get auth user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        user: null,
        role: null
      }, { status: 401 });
    }
    
    // Get user profile including role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, client_id')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'Failed to fetch user profile'
      }, { status: 500 });
    }
    
    // Return user data with profile information
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      role: profile?.role || null,
      profile: {
        fullName: profile?.full_name,
        clientId: profile?.client_id
      }
    });
    
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred'
    }, { status: 500 });
  }
} 