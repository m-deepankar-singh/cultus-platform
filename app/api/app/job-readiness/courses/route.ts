import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

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
    // JWT-based authentication (replaces getUser() + student record lookup)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

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

    // Check if student account is active (from JWT claims)
    if (!claims.profile_is_active) {
      return NextResponse.json({ error: 'Student account is inactive' }, { status: 403 });
    }

    // Get client_id and tier information from JWT claims instead of database lookup
    const clientId = claims.client_id;
    const currentTier = claims.job_readiness_tier || 'BRONZE';
    const currentStarLevel = claims.job_readiness_star_level || 'NONE';
    
    if (!clientId) {
      return NextResponse.json({ error: 'Student not linked to a client' }, { status: 403 });
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
      .eq('client_id', clientId)
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
          completed_videos,
          video_completion_count,
          course_completed_at,
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
      .eq('student_module_progress.student_id', user.id)
      .order('sequence', { ascending: true });

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    // Enhanced courses with simplified progress data and Job Readiness specific information
    const enhancedCourses: CourseModuleOutput[] = (courses || []).map((course: any) => {
      const progress = course.student_module_progress?.[0] || null;
      const totalLessons = course.lessons?.length || 0;
      
      // Use new simplified progress tracking columns
      const videosCompleted = progress?.video_completion_count || 0;
      const completedVideos = progress?.completed_videos || [];
      const isCompletedByStatus = progress?.status === 'Completed';
      const isCompletedByVideos = totalLessons > 0 && videosCompleted >= totalLessons;
      const isCompleted = isCompletedByStatus || isCompletedByVideos;
      
      // Calculate completion percentage based on videos completed
      const completionPercentage = totalLessons > 0 
        ? Math.round((videosCompleted / totalLessons) * 100) 
        : (progress?.progress_percentage || 0);
      
      const isUnlocked = true; // Job Readiness courses are generally accessible based on tier
      
      // Extract course configuration
      const config = course.configuration || {};
      const description = config.description || null;
      
      return {
        id: course.id,
        name: course.name,
        type: course.type,
        configuration: course.configuration,
        sequence: course.sequence,
        is_unlocked: isUnlocked,
        is_completed: isCompleted,
        progress: progress,
        lessons_count: totalLessons,
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
      current_tier: currentTier,
      current_star_level: currentStarLevel,
      completed_courses_count: completedCourses?.length || 0,
      total_courses_count: totalCount || 0,
    });

  } catch (error) {
    console.error('Unexpected error in Job Readiness courses API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 