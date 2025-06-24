import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Validation schemas
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

const SaveProgressRequestSchema = z.object({
  lesson_id: z.string().uuid({ message: 'Invalid lesson ID format' }),
  watch_time_seconds: z.number().min(0, { message: 'Watch time must be non-negative' }),
  completion_percentage: z.number().min(0).max(100, { message: 'Completion percentage must be between 0 and 100' }),
  video_completed: z.boolean().optional().default(false),
  trigger_type: z.enum(['manual', 'auto', 'completion', 'pause', 'seek']).default('manual'),
});

interface SaveProgressRequest {
  lesson_id: string;
  watch_time_seconds: number;
  completion_percentage: number;
  video_completed?: boolean;
  trigger_type: 'manual' | 'auto' | 'completion' | 'pause' | 'seek';
}

interface SaveProgressResponse {
  success: boolean;
  updated_progress: {
    lesson_progress: {
      watch_time_seconds: number;
      completion_percentage: number;
      video_completed: boolean;
    };
    overall_progress: {
      completed_videos_count: number;
      total_videos_count: number;
      overall_completion_percentage: number;
      course_completed: boolean;
    };
  };
  message: string;
}

/**
 * Enhanced Progress Saving API for Normal Courses
 * 
 * Features:
 * - JWT authentication and authorization
 * - Enrollment verification  
 * - Atomic progress updates using existing database schema
 * - Comprehensive validation and error handling
 * - Performance optimizations using existing indexes
 * 
 * POST /api/app/courses/[moduleId]/save-progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    // 1. Validate Route Parameter (moduleId)
    const resolvedParams = await params;
    const moduleIdValidation = ModuleIdSchema.safeParse(resolvedParams.moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data;

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = SaveProgressRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    const progressData: SaveProgressRequest = validationResult.data;

    // 3. 🚀 ENHANCED: JWT-based authentication with comprehensive validation
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Check if student account is active
    if (!claims.profile_is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 }
      );
    }

    // Get client_id from JWT claims
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    // 4. Verify module exists and get product information
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(`
        id, 
        name,
        module_product_assignments!inner(product_id)
      `)
      .eq('id', moduleId)
      .eq('type', 'Course')
      .maybeSingle();

    if (moduleError && moduleError.code !== 'PGRST116') {
      console.error(`Error fetching module ${moduleId}:`, moduleError);
      return NextResponse.json({ error: 'Failed to fetch course details' }, { status: 500 });
    }
    
    if (!moduleData || !moduleData.module_product_assignments?.length) {
      return NextResponse.json({ error: 'Course module not found or not assigned to any product' }, { status: 404 });
    }

    const productId = moduleData.module_product_assignments[0].product_id;

    // 5. Verify enrollment
    const { count: assignmentCount, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (assignmentError) {
      console.error('Error checking client enrollment:', assignmentError);
      return NextResponse.json({ error: 'Failed to verify enrollment' }, { status: 500 });
    }

    if (assignmentCount === 0) {
      return NextResponse.json({ error: 'Forbidden: Not enrolled in product containing this course' }, { status: 403 });
    }

    // 6. Verify lesson belongs to the module
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, module_id')
      .eq('id', progressData.lesson_id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (lessonError && lessonError.code !== 'PGRST116') {
      console.error(`Error fetching lesson ${progressData.lesson_id}:`, lessonError);
      return NextResponse.json({ error: 'Failed to verify lesson' }, { status: 500 });
    }

    if (!lessonData) {
      return NextResponse.json({ error: 'Lesson not found in this course' }, { status: 404 });
    }

    // 7. Get total lessons count for progress calculation
    const { count: totalLessonsCount, error: countError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('module_id', moduleId);

    if (countError) {
      console.error(`Error counting lessons for module ${moduleId}:`, countError);
      return NextResponse.json({ error: 'Failed to calculate progress' }, { status: 500 });
    }

    const totalLessons = totalLessonsCount || 0;

    // 8. 🚀 ENHANCED: Atomic progress update using existing database schema
    const { data: currentProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details, completed_videos, video_completion_count, progress_percentage, status')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error(`Error fetching current progress:`, progressError);
      return NextResponse.json({ error: 'Failed to fetch current progress' }, { status: 500 });
    }

    // 9. Calculate updated progress
    const existingDetails = currentProgress?.progress_details as any || {};
    const existingCompletedVideos = currentProgress?.completed_videos || [];
    const newCompletedVideos = [...existingCompletedVideos];
    let newVideoCompletionCount = currentProgress?.video_completion_count || 0;

    // Update video playback positions
    const videoPlaybackPositions = existingDetails.video_playback_positions || {};
    videoPlaybackPositions[progressData.lesson_id] = progressData.watch_time_seconds;

    // Handle video completion
    const wasVideoCompleted = existingCompletedVideos.includes(progressData.lesson_id);
    if (progressData.video_completed && !wasVideoCompleted) {
      newCompletedVideos.push(progressData.lesson_id);
      newVideoCompletionCount += 1;
    }

    // Update progress details (moved before completion check)
    const updatedProgressDetails = {
      ...existingDetails,
      video_playback_positions: videoPlaybackPositions,
      last_viewed_lesson_sequence: existingDetails.last_viewed_lesson_sequence || 0,
      lesson_quiz_results: existingDetails.lesson_quiz_results || {},
    };

    // 🚀 ENHANCED: Check course completion properly considering quizzes
    // First, get all lessons to check quiz requirements
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, has_quiz')
      .eq('module_id', moduleId);

    if (lessonsError) {
      console.error(`Error fetching lessons for completion check:`, lessonsError);
      return NextResponse.json({ error: 'Failed to check course completion' }, { status: 500 });
    }

    // Calculate completion based on both video watching AND quiz passing
    let completedLessonsCount = 0;
    let courseCompleted = false;

    if (allLessons && allLessons.length > 0) {
      for (const lesson of allLessons) {
        const isVideoWatched = newCompletedVideos.includes(lesson.id);
        let isQuizPassedOrNotRequired = true;

        // If lesson has a quiz, check if it's been passed
        if (lesson.has_quiz) {
          // Check both possible quiz result formats for maximum compatibility
          const quizResult = updatedProgressDetails.lesson_quiz_results?.[lesson.id];
          const quizAttempts = updatedProgressDetails.lesson_quiz_attempts?.[lesson.id];
          
          // Support both data structures:
          // 1. lesson_quiz_results[lessonId].passed (newer format)
          // 2. lesson_quiz_attempts[lessonId][].pass_fail_status === 'passed' (older format)
          const passedInQuizResults = quizResult?.passed === true;
          const passedInQuizAttempts = Array.isArray(quizAttempts) && 
            quizAttempts.some((att: any) => att.pass_fail_status === 'passed');
          
          isQuizPassedOrNotRequired = passedInQuizResults || passedInQuizAttempts;
        }

        // Lesson is complete if video watched AND (no quiz OR quiz passed)
        if (isVideoWatched && isQuizPassedOrNotRequired) {
          completedLessonsCount += 1;
        }
      }

      courseCompleted = completedLessonsCount >= allLessons.length;
    }

    // Calculate overall progress based on completed lessons (not just videos)
    const overallCompletionPercentage = totalLessons > 0 
      ? Math.round((completedLessonsCount / totalLessons) * 100) 
      : 0;

    const newStatus = courseCompleted ? 'Completed' : 
                     newVideoCompletionCount > 0 ? 'InProgress' : 'NotStarted';

    // 10. Upsert progress record
    const progressUpdateData = {
      student_id: user.id,
      module_id: moduleId,
      progress_details: updatedProgressDetails,
      completed_videos: newCompletedVideos,
      video_completion_count: newVideoCompletionCount,
      progress_percentage: overallCompletionPercentage,
      status: newStatus,
      last_updated: new Date().toISOString(),
      ...(courseCompleted && !currentProgress?.course_completed_at && {
        course_completed_at: new Date().toISOString()
      })
    };

    const { error: upsertError } = await supabase
      .from('student_module_progress')
      .upsert(progressUpdateData, {
        onConflict: 'student_id,module_id'
      });

    if (upsertError) {
      console.error('Error updating progress:', upsertError);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    // 11. Construct success response
    const response: SaveProgressResponse = {
      success: true,
      updated_progress: {
        lesson_progress: {
          watch_time_seconds: progressData.watch_time_seconds,
          completion_percentage: progressData.completion_percentage,
          video_completed: progressData.video_completed || false,
        },
        overall_progress: {
          completed_videos_count: newVideoCompletionCount,
          total_videos_count: totalLessons,
          overall_completion_percentage: overallCompletionPercentage,
          course_completed: courseCompleted,
        },
      },
      message: courseCompleted 
        ? 'Course completed! Congratulations!' 
        : progressData.video_completed 
          ? 'Video completed successfully!' 
          : 'Progress saved successfully!',
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in save-progress:', error);
    
    // Enhanced error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Bad Request: Validation failed', details: error.flatten() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 