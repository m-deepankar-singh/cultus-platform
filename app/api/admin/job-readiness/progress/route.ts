import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/job-readiness/progress
 * View student progress across Job Readiness products
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    
    // Extract query parameters for filtering
    const productId = url.searchParams.get('productId');
    const clientId = url.searchParams.get('clientId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const search = url.searchParams.get('search') || '';
    
    // Verify admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Start building the query
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
        clients!inner (
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
    
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Execute query with pagination
    const { data: students, error, count } = await query
      .range(from, to)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching student progress:', error);
      return NextResponse.json({ error: 'Failed to fetch student progress' }, { status: 500 });
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('student_product_assignments.products.type', 'JOB_READINESS');

    if (countError) {
      console.error('Error getting count:', countError);
    }

    return NextResponse.json({ 
      students, 
      pagination: {
        page,
        pageSize,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      }
    });
  } catch (error) {
    console.error('Unexpected error in progress GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 