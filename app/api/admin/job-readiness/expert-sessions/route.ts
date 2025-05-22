import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/job-readiness/expert-sessions
 * Placeholder for expert sessions configuration
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role - use case insensitive comparison
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Modified to be case insensitive - check for "admin" or "Admin"
    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Placeholder response
    return NextResponse.json({ 
      message: 'Expert sessions configuration endpoint - Placeholder for future implementation',
      status: 'not_implemented'
    });
  } catch (error) {
    console.error('Unexpected error in expert-sessions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/job-readiness/expert-sessions
 * Placeholder for creating expert sessions configuration
 */
export async function POST(req: NextRequest) {
  try {
    // Placeholder response
    return NextResponse.json({ 
      message: 'Expert sessions configuration creation - Placeholder for future implementation',
      status: 'not_implemented'
    }, { status: 501 });
  } catch (error) {
    console.error('Unexpected error in expert-sessions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 