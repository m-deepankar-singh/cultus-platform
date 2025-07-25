import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/progress/export
 * Export detailed progress data
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    const url = new URL(req.url);
    
    // Extract query parameters for filtering
    const productId = url.searchParams.get('productId');
    const clientId = url.searchParams.get('clientId');
    const format = url.searchParams.get('format') || 'csv'; // csv or xlsx

    // Build the query to get all student data for export (no pagination)
    let query = supabase
      .from('students')
      .select(`
        id,
        first_name,
        last_name,
        email,
        job_readiness_star_level,
        job_readiness_tier,
        job_readiness_background_type,
        job_readiness_last_updated,
        job_readiness_promotion_eligible,
        clients (
          id,
          name
        ),
        student_product_assignments!inner (
          id,
          product_id,
          products (
            id,
            name,
            type
          )
        )
      `)
      .eq('student_product_assignments.products.type', 'JOB_READINESS');

    // Apply filters
    if (productId) {
      query = query.eq('student_product_assignments.product_id', productId);
    }
    
    if (clientId) {
      query = query.eq('clients.id', clientId);
    }
    
    // Execute query to get all data
    const { data: students, error } = await query
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching student progress for export:', error);
      return NextResponse.json({ error: 'Failed to fetch data for export' }, { status: 500 });
    }

    // For now, just return the data as JSON with a note that this is a placeholder
    // In the actual implementation, this would transform the data and return a CSV/XLSX file
    return NextResponse.json({ 
      message: 'Job Readiness progress export endpoint - Placeholder for future implementation',
      status: 'partially_implemented',
      format,
      data: students,
      note: 'In the full implementation, this endpoint would return a downloadable file in the requested format'
    });
  } catch (error) {
    console.error('Unexpected error in progress export GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 