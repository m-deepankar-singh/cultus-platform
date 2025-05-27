import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/job-readiness/promotion-exam-attempts
 * Get all promotion exam attempts
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

    // Get URL parameters for filtering
    const url = new URL(req.url);
    const productId = url.searchParams.get('product_id');
    const status = url.searchParams.get('status');
    const studentId = url.searchParams.get('student_id');

    // Build the query
    let query = supabase
      .from('job_readiness_promotion_exam_attempts')
      .select(`
        *,
        students:student_id (
          id,
          email,
          full_name
        ),
        products:product_id (
          id,
          name
        )
      `)
      .order('timestamp_start', { ascending: false });

    // Apply filters if provided
    if (productId) {
      query = query.eq('product_id', productId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error('Error fetching promotion exam attempts:', error);
      return NextResponse.json({ error: 'Failed to fetch promotion exam attempts' }, { status: 500 });
    }

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error('Unexpected error in promotion-exam-attempts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 