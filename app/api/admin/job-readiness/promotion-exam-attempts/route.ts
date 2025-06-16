import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/promotion-exam-attempts
 * Get all promotion exam attempts
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

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