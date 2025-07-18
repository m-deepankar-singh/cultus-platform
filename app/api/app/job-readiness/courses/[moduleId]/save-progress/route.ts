import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequestUltraFast, isUserActive } from '@/lib/auth/api-auth';

// Simplified schema for completion-based progress tracking
const SimplifiedProgressSchema = z.object({
  lesson_id: z.string().uuid({ message: 'lesson_id is required for completion tracking' }),
  video_completed: z.boolean({ message: 'video_completed must be a boolean' }),
  quiz_passed: z.boolean().optional().default(false),
});

const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

interface ProgressSaveResponse {
  success: boolean;
  message: string;
  videos_completed: number;
  total_videos: number;
  course_completed: boolean;
  star_level_unlocked?: boolean;
  new_star_level?: string;
  updated_at: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    // 1. Validate moduleId
    const { moduleId } = await context.params;
    const moduleIdValidation = ModuleIdSchema.safeParse(moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validModuleId = moduleIdValidation.data;

    // 2. JWT-based authentication (single query)
    const authResult = await authenticateApiRequestUltraFast(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // 3. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = SimplifiedProgressSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid progress data',
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { lesson_id, video_completed, quiz_passed } = validation.data;

    // Check if student account is active (from JWT claims)
    if (!isUserActive(claims)) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 }
      );
    }

    const clientId = claims.client_id;
    const studentId = user.id;

    // 4. Single combined query: Fetch course module, product, enrollment, and lessons count
    const { data: courseData, error: courseError } = await supabase
      .from('modules')
      .select(`
        id, 
        name, 
        type,
        module_product_assignments!inner (
          product_id,
          products!inner (
            id, 
            name, 
            type,
            client_product_assignments!inner (
              client_id
            )
          )
        ),
        lessons (count)
      `)
      .eq('id', validModuleId)
      .eq('type', 'Course')
      .eq('module_product_assignments.products.type', 'JOB_READINESS')
      .eq('module_product_assignments.products.client_product_assignments.client_id', clientId)
      .single();

    if (courseError || !courseData) {
      console.error(`Error fetching course data ${validModuleId}:`, courseError);
      return NextResponse.json(
        { error: 'Course module not found, not a Job Readiness course, or student not enrolled' },
        { status: 404 }
      );
    }

    const totalLessons = courseData.lessons[0]?.count || 0;
    if (totalLessons === 0) {
      return NextResponse.json(
        { error: 'Course has no lessons' },
        { status: 400 }
      );
    }

    // 5. Get or create progress record (single query)
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('completed_videos, video_completion_count, status, course_completed_at')
      .eq('student_id', studentId)
      .eq('module_id', validModuleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error checking existing progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to check progress status', details: progressError.message },
        { status: 500 }
      );
    }

    // 6. Process completion (only save if video completed)
    if (!video_completed) {
      return NextResponse.json(
        { error: 'Video must be completed to save progress' },
        { status: 400 }
      );
    }

    // Update completed videos array
    const currentCompletedVideos = existingProgress?.completed_videos || [];
    const updatedCompletedVideos = currentCompletedVideos.includes(lesson_id) 
      ? currentCompletedVideos 
      : [...currentCompletedVideos, lesson_id];

    const videosCompleted = updatedCompletedVideos.length;
    
    // 🚀 ENHANCED: Check course completion properly considering quizzes
    // Get all lessons to check quiz requirements
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, has_quiz')
      .eq('module_id', validModuleId);

    let completedLessonsCount = 0;
    let courseCompleted = false;

    if (!lessonsError && allLessons && allLessons.length > 0) {
      // Get current progress details for quiz results
      const { data: currentProgressDetails, error: progressDetailsError } = await supabase
        .from('student_module_progress')
        .select('progress_details')
        .eq('student_id', studentId)
        .eq('module_id', validModuleId)
        .maybeSingle();

      const progressDetails = currentProgressDetails?.progress_details || {};

      for (const lesson of allLessons) {
        const isVideoWatched = updatedCompletedVideos.includes(lesson.id);
        let isQuizPassedOrNotRequired = true;

        // If lesson has a quiz, check if it's been passed
        if (lesson.has_quiz) {
          // Check both possible quiz result formats for maximum compatibility
          const quizResult = progressDetails.lesson_quiz_results?.[lesson.id];
          const quizAttempts = progressDetails.lesson_quiz_attempts?.[lesson.id];
          
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
    } else if (lessonsError) {
      console.error('Error fetching lessons for completion check:', lessonsError);
      // Fallback to video-only completion for backward compatibility
      courseCompleted = videosCompleted >= totalLessons;
    } else {
      // No lessons found, fallback to video-only completion
      courseCompleted = videosCompleted >= totalLessons;
    }
    const now = new Date().toISOString();

    // Build update data
    const updateData = {
      student_id: studentId,
      module_id: validModuleId,
      completed_videos: updatedCompletedVideos,
      video_completion_count: videosCompleted,
      status: courseCompleted ? 'Completed' : 'InProgress',
      progress_percentage: totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0,
      last_updated: now,
      ...(courseCompleted && !existingProgress?.course_completed_at && {
        completed_at: now,
        course_completed_at: now
      })
    };

    // 7. Save progress (single upsert)
    const { error: saveError } = await supabase
      .from('student_module_progress')
      .upsert(updateData, {
        onConflict: 'student_id,module_id'
      });

    if (saveError) {
      console.error('Error saving progress:', saveError);
      return NextResponse.json(
        { error: 'Failed to save progress', details: saveError.message },
        { status: 500 }
      );
    }

    // 8. Check for star level unlock (only if course just completed)
    let starLevelUnlocked = false;
    let newStarLevel = '';

    if (courseCompleted) {
      // Check if ALL course modules for this product are now completed
      const productId = courseData.module_product_assignments?.[0]?.product_id;
      
      // Get current star level
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('job_readiness_star_level')
        .eq('id', studentId)
        .single();

      if (!studentError && studentData) {
        const currentStarLevel = studentData.job_readiness_star_level;
        
        // Only award second star if student currently has exactly ONE star
        if (currentStarLevel === 'ONE') {
          // Check if ALL course modules for this product are completed
          const { data: completedCourses, error: completedCoursesError } = await supabase
            .from('modules')
            .select(`
              id,
              module_product_assignments!inner (
                product_id
              ),
              student_module_progress!inner (
                status
              )
            `)
            .eq('module_product_assignments.product_id', productId)
            .eq('type', 'Course')
            .eq('student_module_progress.student_id', studentId)
            .eq('student_module_progress.status', 'Completed');

          // Get total course count for this product
          const { count: totalCourseCount, error: totalCountError } = await supabase
            .from('modules')
            .select('id, module_product_assignments!inner(product_id)', { count: 'exact' })
            .eq('module_product_assignments.product_id', productId)
            .eq('type', 'Course');

          if (!completedCoursesError && !totalCountError) {
            const completedCount = completedCourses?.length || 0;
            const totalCount = totalCourseCount || 0;
            
            console.log(`Course completion check: ${completedCount}/${totalCount} courses completed for product ${productId}`);
            
            // Award second star if ALL courses are completed
            if (completedCount === totalCount && totalCount > 0) {
              console.log(`🌟 Student ${studentId} completed all ${totalCount} courses. Awarding second star!`);
              
              const { error: starUpdateError } = await supabase
                .from('students')
                .update({
                  job_readiness_star_level: 'TWO',
                  job_readiness_last_updated: now,
                })
                .eq('id', studentId);

              if (!starUpdateError) {
                starLevelUnlocked = true;
                newStarLevel = 'TWO';
                console.log('🎉 Successfully awarded second star for completing all courses!');
              } else {
                console.error('Error updating student star level:', starUpdateError);
              }
            } else {
              console.log(`Student ${studentId} completed ${completedCount}/${totalCount} courses. Second star will be awarded when all are complete.`);
            }
          } else {
            console.error('Error checking course completion:', { completedCoursesError, totalCountError });
          }
        } else {
          console.log(`Student ${studentId} already has star level ${currentStarLevel}. No second star awarding needed.`);
        }
      } else {
        console.error('Error fetching student star level:', studentError);
      }
    }

    const response: ProgressSaveResponse = {
      success: true,
      message: courseCompleted 
        ? '🎉 Course completed successfully! All lessons and quizzes finished!' 
        : `Video completed! ${completedLessonsCount}/${totalLessons} lessons finished.`,
      videos_completed: videosCompleted,
      total_videos: totalLessons,
      course_completed: courseCompleted,
      updated_at: now,
      ...(starLevelUnlocked && {
        star_level_unlocked: true,
        new_star_level: newStarLevel
      })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in simplified course progress save:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 