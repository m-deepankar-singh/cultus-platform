import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SELECTORS } from '@/lib/api/selectors';

// Import the correct schema for module updates
import type { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Define a schema for UUID validation
const UuidSchema = z.string().uuid({ message: 'Invalid Module ID format' });

// Types for the expected request payload
interface CourseProgressUpdatePayload {
  current_lesson_id?: string;
  current_lesson_sequence?: number;
  video_playback_position?: number;
  saved_quiz_answers?: Record<string, any>;
  status?: 'NotStarted' | 'InProgress' | 'Completed';
  progress_percentage?: number;
}

// Define PATCH handler
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    // Extract moduleId and validate
    const resolvedParams = await params;
    const moduleId = resolvedParams?.moduleId;
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    // Parse request body
    const body: CourseProgressUpdatePayload = await request.json();

    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    // Get the detailed module information first 
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(SELECTORS.MODULE.DETAIL)
      .eq('id', moduleId)
      .eq('type', 'Course')
      .maybeSingle();

    if (moduleError && moduleError.code !== 'PGRST116') {
      console.error(`Error fetching module ${moduleId}:`, moduleError);
      return NextResponse.json({ 
        error: 'Failed to fetch module data', 
        details: moduleError.message 
      }, { status: 500 });
    }

    if (!moduleData) {
      return NextResponse.json({ 
        error: 'Course module not found or not a course type' 
      }, { status: 404 });
    }

    // Get current progress record if it exists
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select(SELECTORS.STUDENT_MODULE_PROGRESS.DETAIL)
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error(`Error fetching progress for module ${moduleId}, student ${user.id}:`, progressError);
      return NextResponse.json({ 
        error: 'Failed to check existing progress', 
        details: progressError.message 
      }, { status: 500 });
    }

    // Build the progress_details JSONB object
    const progress_details: Record<string, any> = {
      ...(existingProgress?.progress_details || {}),
      last_viewed_lesson_sequence: body.current_lesson_sequence,
      last_completed_lesson_id: body.current_lesson_id,
      video_playback_position: body.video_playback_position,
      saved_quiz_answers: body.saved_quiz_answers,
      // Add other progress details as needed
    };

    // Clean undefined values to avoid overwriting with nulls
    Object.keys(progress_details).forEach(key => {
      if (progress_details[key] === undefined) {
        delete progress_details[key];
      }
    });

    // Prepare the data to upsert
    const progressData: any = {
      student_id: user.id,
      module_id: moduleId,
      status: body.status || (existingProgress?.status || 'InProgress'),
      progress_details,
      progress_percentage: body.progress_percentage,
      last_updated: new Date().toISOString(),
    };

    // If "completed", set completed_at timestamp
    if (body.status === 'Completed') {
      progressData.completed_at = new Date().toISOString();
    }

    // Upsert the progress record (insert if doesn't exist, update if it does)
    const { data: updatedProgress, error: upsertError } = await supabase
      .from('student_module_progress')
      .upsert(progressData)
      .select()
      .single();

    if (upsertError) {
      console.error(`Error updating progress for module ${moduleId}, student ${user.id}:`, upsertError);
      return NextResponse.json({ 
        error: 'Failed to update progress', 
        details: upsertError.message 
      }, { status: 500 });
    }

    return NextResponse.json(updatedProgress);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in PATCH /api/app/progress/course/[moduleId]:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred.', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * GET handler for fetching a student's progress on a specific module.
 * OPTIMIZED: Uses consolidated database function to reduce query count and improve performance.
 * - Validates moduleId.
 * - Authenticates and authorizes the student.
 * - Uses single database function call for all data.
 * - Returns comprehensive course progress with lessons.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    // 1. Validate Route Parameter (moduleId)
    const { moduleId } = await params;
    const moduleIdValidation = UuidSchema.safeParse(moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 },
      );
    }

    // 2. 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Check if student account is active (from JWT claims)
    if (!claims.profile_is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 }
      );
    }

    // Get client_id from JWT claims instead of database lookup
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

    // 🚀 PERFORMANCE BREAKTHROUGH: Single database function call
    // Replaces multiple queries (module validation, enrollment check, progress fetch, lessons fetch)
    const { data: courseData, error: courseError } = await supabase
      .rpc('get_course_progress_with_lessons', {
        p_student_id: studentId,
        p_module_id: moduleId
      });

    if (courseError) {
      console.error('GET Progress - Error fetching course progress:', courseError);
      return NextResponse.json({ error: 'Internal Server Error fetching course data' }, { status: 500 });
    }

    // Handle case where function returns error object
    if (courseData?.error) {
      if (courseData.message === 'Module not found or no access') {
        return NextResponse.json({ error: 'Not Found: Module does not exist or access denied' }, { status: 404 });
      }
      console.error('Database function error:', courseData.message);
      return NextResponse.json({ error: 'Failed to process course data' }, { status: 500 });
    }

    // Transform the consolidated response to match the expected API format
    const response = {
      module: courseData.module,
      progress: {
        status: courseData.progress?.status || 'NotStarted',
        score: courseData.progress?.score || null,
        progress_percentage: courseData.progress?.progress_percentage || 0,
        completed_videos: courseData.progress?.completed_videos || [],
        video_completion_count: courseData.progress?.video_completion_count || 0,
        course_completed_at: courseData.progress?.course_completed_at || null,
        completed_at: courseData.progress?.course_completed_at || null,
        last_updated: courseData.progress?.last_updated || null,
        updated_at: courseData.progress?.last_updated || null,
        progress_details: courseData.progress?.progress_details || null,
      },
      lessons: courseData.lessons || [],
      summary: courseData.summary || {
        total_lessons: 0,
        completed_lessons: 0,
        completion_percentage: 0,
      },
      generated_at: courseData.generated_at,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Performance-Optimized': 'true',
        'X-Query-Count': '1',
        'X-Generated-At': (courseData.generated_at || Date.now()).toString()
      }
    });

  } catch (error) {
    console.error('Unexpected Error in GET /progress/course/[moduleId] (optimized):', error);
    if (error instanceof z.ZodError) { // Catch Zod errors specifically if needed
        return NextResponse.json(
          { error: 'Bad Request: Validation failed', details: error.flatten() },
          { status: 400 },
        );
      }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
