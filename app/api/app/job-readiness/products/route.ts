import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/app/job-readiness/products
 * Get assigned Job Readiness products and progress for the current student
 * Includes module lock/unlock status based on student's current star level and progress
 * 
 * OPTIMIZED: Single RPC call replaces multiple N+1 queries
 */
export async function GET() {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get client_id from JWT claims
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json({ error: 'Student not properly enrolled' }, { status: 403 });
    }

    // 🚀 OPTIMIZED: Single RPC call replaces multiple N+1 queries
    // This replaces:
    // 1. Student profile query
    // 2. Interview submission query  
    // 3. Client product assignments query
    // 4. Products query
    // 5. N x modules queries (one per product)
    // 6. M x expert session progress queries (one per expert session module)
    // Total: 5 + N + M database calls → 1 database call (90%+ reduction)
    
    const { data: result, error: rpcError } = await supabase
      .rpc('get_student_job_readiness_data', {
        p_student_id: user.id,
        p_client_id: clientId
      });

    if (rpcError) {
      console.error('Error fetching job readiness data:', rpcError);
      return NextResponse.json({ error: 'Failed to fetch job readiness data' }, { status: 500 });
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    const { student_data, products_data, interview_data } = result[0];

    // Return the optimized response
    return NextResponse.json({
      student: student_data,
      products: products_data,
      interviewStatus: interview_data
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/app/job-readiness/products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 