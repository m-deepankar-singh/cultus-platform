import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ProductIdQuerySchema = z.object({
  productId: z.string().uuid(),
});

interface CourseModuleOutput {
  id: string;
  name: string;
  type: string;
  configuration?: Record<string, any> | null;
  sequence: number;
  is_unlocked: boolean;
  is_completed: boolean;
  progress: any | null;
  lessons_count: number;
  description?: string | null;
  completion_percentage?: number;
}

/**
 * GET /api/app/job-readiness/courses
 *
 * Lists available Course modules for the Job Readiness product using the module-based system.
 * Requires student authentication and considers module lock/unlock status based on student's progress.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    const queryValidation = ProductIdQuerySchema.safeParse({ productId });
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid or missing productId', details: queryValidation.error.format() },
        { status: 400 }
      );
    }

    const validProductId = queryValidation.data.productId;

    // Get student profile for access control and tier information
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        client_id,
        job_readiness_star_level,
        job_readiness_tier,
        is_active
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!student.is_active) {
      return NextResponse.json({ error: 'Student account is inactive' }, { status: 403 });
    }

    // Verify the product is a Job Readiness product assigned to student's client
    const { data: productData, error: productDataError } = await supabase
      .from('products')
      .select('id, name, type')
      .eq('id', validProductId)
      .eq('type', 'JOB_READINESS')
      .single();

    if (productDataError || !productData) {
      return NextResponse.json({ error: 'Job Readiness product not found' }, { status: 404 });
    }

    const { data: clientProduct, error: clientProductError } = await supabase
      .from('client_product_assignments')
      .select('client_id, product_id')
      .eq('client_id', student.client_id)
      .eq('product_id', validProductId)
      .maybeSingle();

    if (clientProductError) {
      console.error('Error verifying client product assignment:', clientProductError);
      return NextResponse.json({ error: 'Failed to verify product access' }, { status: 500 });
    }

    if (!clientProduct) {
      return NextResponse.json({ error: 'This Job Readiness product is not available for your client' }, { status: 403 });
    }

    // Fetch course modules for this Job Readiness product with progress data
    const { data: courses, error: coursesError } = await supabase
      .from('modules')
      .select(`
        id,
        name,
        type,
        configuration,
        sequence,
        student_module_progress (
          student_id,
          module_id,
          status,
          progress_percentage,
          progress_details,
          completed_at,
          last_updated
        ),
        lessons (
          id,
          module_id
        )
      `)
      .eq('product_id', validProductId)
      .eq('type', 'Course')
      .eq('student_module_progress.student_id', student.id)
      .order('sequence', { ascending: true });

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    // Enhanced courses with progress data and Job Readiness specific information
    const enhancedCourses: CourseModuleOutput[] = (courses || []).map(course => {
      const progress = course.student_module_progress?.[0] || null;
      const isCompleted = progress?.status === 'Completed';
      const isUnlocked = true; // Job Readiness courses are generally accessible based on tier
      
      // Extract course configuration
      const config = course.configuration || {};
      const description = config.description || null;
      const completionPercentage = progress?.progress_percentage || 0;
      
      return {
        id: course.id,
        name: course.name,
        type: course.type,
        configuration: course.configuration,
        sequence: course.sequence,
        is_unlocked: isUnlocked,
        is_completed: isCompleted,
        progress: progress,
        lessons_count: course.lessons?.length || 0,
        description,
        completion_percentage: completionPercentage,
      };
    });

    // Get completed courses count
    const { data: completedCourses, error: completedError } = await supabase
      .from('modules')
      .select(`
        id,
        student_module_progress!inner (
          status
        )
      `)
      .eq('product_id', validProductId)
      .eq('type', 'Course')
      .eq('student_module_progress.student_id', user.id)
      .eq('student_module_progress.status', 'Completed');

    // Get total course count
    const { count: totalCount, error: totalCountError } = await supabase
      .from('modules')
      .select('id', { count: 'exact' })
      .eq('product_id', validProductId)
      .eq('type', 'Course');

    return NextResponse.json({
      courses: enhancedCourses,
      current_tier: student.job_readiness_tier,
      current_star_level: student.job_readiness_star_level,
      completed_courses_count: completedCourses?.length || 0,
      total_courses_count: totalCount || 0,
      product: {
        id: productData.id,
        name: productData.name,
        type: productData.type
      }
    });

  } catch (error) {
    console.error('Unexpected error in job-readiness courses GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
      // Verify the product exists at all
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, type')
        .eq('id', validProductId)
        .maybeSingle();
      
      console.log('Regular product query result:', product);
      console.log('Regular product query error:', productError);
        
      if (productError || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      if (product.type !== 'JOB_READINESS') {
        return NextResponse.json(
          { error: 'The specified product is not a Job Readiness product' }, 
          { status: 400 }
        );
      }
      
      // Use our security definer function to ensure the job readiness product exists
      const { data: ensureResult, error: ensureError } = await supabase
        .rpc('ensure_job_readiness_product', { p_product_id: validProductId });
        
      console.log('Ensure job readiness product result:', ensureResult);
      console.log('Ensure job readiness product error:', ensureError);
        
      if (ensureError || !ensureResult) {
        console.error('Failed to ensure job readiness product exists:', ensureError);
        return NextResponse.json(
          { error: 'Job Readiness product configuration is missing and could not be created automatically' }, 
          { status: 404 }
        );
      }
      
      jrProductId = ensureResult;
      console.log('Successfully created/found job readiness product configuration with ID:', jrProductId);
    }

    // 2. Fetch all Course modules that belong to this product
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, name, type, configuration')
      .eq('product_id', validProductId)
      .eq('type', 'Course');

    if (modulesError) {
      console.error('Error fetching modules for product:', modulesError);
      return NextResponse.json({ error: 'Failed to fetch course modules' }, { status: 500 });
    }

    console.log('Found course modules:', modules);

    // Filter and format the course modules
    const courseModules = (modules || []).map(module => {
      const moduleConfig = module.configuration as any || {};
      
      return {
        id: module.id,
        name: module.name,
        description: moduleConfig?.description || null,
      };
    });

    // TODO: Implement module lock/unlock status check based on student's current star level and progress
    // For now, returning all course modules. This needs to be integrated with `checkModuleAccess` utility.

    console.log('Returning course modules:', courseModules);
    return NextResponse.json(courseModules);

  } catch (error) {
    console.error('Error fetching job readiness courses:', error);
    const err = error as Error;
    return NextResponse.json({ error: 'Failed to fetch job readiness courses', details: err.message }, { status: 500 });
  }
} 