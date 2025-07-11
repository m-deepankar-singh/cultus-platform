import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/progress
 * View student progress across Job Readiness products
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;
    const url = new URL(req.url);
    
    // Extract query parameters for filtering
    const productId = url.searchParams.get('productId');
    const clientId = url.searchParams.get('clientId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
    const search = url.searchParams.get('search') || '';

    // Use a simpler approach: query students with their clients and join with products
    let baseQuery = supabase
      .from('students')
      .select(`
        id,
        full_name,
        email,
        job_readiness_star_level,
        job_readiness_tier,
        job_readiness_background_type,
        job_readiness_last_updated,
        job_readiness_promotion_eligible,
        client_id,
        clients!inner (
          id,
          name
        )
      `);

    // Apply filters first
    if (clientId) {
      baseQuery = baseQuery.eq('client_id', clientId);
    }
    
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      baseQuery = baseQuery.or(`full_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
    }

    // Get all students first
    const { data: allStudents, error: studentsError } = await baseQuery;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    if (!allStudents || allStudents.length === 0) {
      return NextResponse.json({ 
        students: [], 
        pagination: { page, pageSize, totalCount: 0, totalPages: 0 }
      });
    }

    // Get client IDs for the products query
    const clientIds = [...new Set(allStudents.map((s: any) => s.client_id))];

    // Get client product assignments for job readiness products
    let productQuery = supabase
      .from('client_product_assignments')
      .select(`
        client_id,
        product_id,
        products!inner (
          id,
          name,
          type
        )
      `)
      .eq('products.type', 'JOB_READINESS')
      .in('client_id', clientIds);

    if (productId) {
      productQuery = productQuery.eq('product_id', productId);
    }

    const { data: clientProducts, error: productsError } = await productQuery;

    if (productsError) {
      console.error('Error fetching client products:', productsError);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Filter students to only those whose clients have job readiness products
    const clientsWithProducts = new Set(clientProducts?.map((cp: any) => cp.client_id) || []);
    const studentsWithAccess = allStudents.filter((student: any) => 
      clientsWithProducts.has(student.client_id)
    );

    // Create a map of client products for easy lookup
    const clientProductMap = new Map();
    clientProducts?.forEach((cp: any) => {
      if (!clientProductMap.has(cp.client_id)) {
        clientProductMap.set(cp.client_id, []);
      }
      clientProductMap.get(cp.client_id).push(cp.products);
    });

    // Transform students to match frontend expectations
    const transformedStudents = studentsWithAccess.map((student: any) => {
      const products = clientProductMap.get(student.client_id) || [];
      const primaryProduct = products[0]; // Use first product, or handle multiple products differently
      
      // Split full_name into first_name and last_name for compatibility
      const nameParts = student.full_name?.split(' ') || ['Unknown'];
      const first_name = nameParts[0] || 'Unknown';
      const last_name = nameParts.slice(1).join(' ') || '';

      return {
        id: student.id,
        student_id: student.id,
        product_id: primaryProduct?.id || '',
        job_readiness_star_level: student.job_readiness_star_level,
        job_readiness_tier: student.job_readiness_tier || 'BRONZE',
        job_readiness_background_type: student.job_readiness_background_type,
        job_readiness_last_updated: student.job_readiness_last_updated,
        job_readiness_promotion_eligible: student.job_readiness_promotion_eligible,
        created_at: null,
        updated_at: student.job_readiness_last_updated,
        // Student information in expected format
        student: {
          id: student.id,
          first_name,
          last_name,
          email: student.email || '',
        },
        // Product information in expected format
        product: primaryProduct ? {
          id: primaryProduct.id,
          name: primaryProduct.name,
          description: primaryProduct.description || '',
        } : {
          id: '',
          name: 'No Product Assigned',
          description: '',
        },
        // Module progress placeholder - you can enhance this later
        module_progress: {
          total_modules: 0,
          completed_modules: 0,
          completion_percentage: 0,
        },
        // Keep client information for reference
        client: student.clients,
      };
    });

    // Apply pagination
    const finalTotalCount = transformedStudents.length;
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedStudents = transformedStudents.slice(from, to);

    return NextResponse.json({ 
      students: paginatedStudents, 
      pagination: {
        page,
        pageSize,
        totalCount: finalTotalCount,
        totalPages: Math.ceil(finalTotalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Unexpected error in progress GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 