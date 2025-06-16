import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Schema for progress data validation
const ProgressDataSchema = z.object({
  progress_percentage: z.number().min(0).max(100).optional().default(0),
  progress_details: z.record(z.any()).optional(),
  status: z.enum(['InProgress', 'Completed']).optional().default('InProgress'),
  lesson_id: z.string().uuid().optional(),
  video_playback_position: z.number().optional(),
  lesson_completed: z.boolean().optional(),
  video_completed: z.boolean().optional(),
  video_fully_watched: z.boolean().optional(),
  last_viewed_lesson_sequence: z.number().optional(),
});

const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

interface ProgressSaveResponse {
  success: boolean;
  message: string;
  progress_percentage: number;
  status: string;
  updated_at: string;
  star_level_unlocked?: boolean;
  new_star_level?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: { moduleId: string } }
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

    // 2. JWT-based authentication (replaces getUser() + student record lookup)
    const authResult = await authenticateApiRequest(['student']);
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

    const validation = ProgressDataSchema.safeParse(body);
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

    const { 
      progress_percentage, 
      progress_details, 
      status, 
      lesson_id, 
      video_playback_position, 
      lesson_completed,
      video_completed,
      video_fully_watched,
      last_viewed_lesson_sequence 
    } = validation.data;

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

    // 5. Fetch Course Module Details (must be Job Readiness course)
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, name, type, product_id')
      .eq('id', validModuleId)
      .eq('type', 'Course')
      .maybeSingle();

    if (moduleError) {
      console.error(`Error fetching course module ${validModuleId}:`, moduleError);
      return NextResponse.json(
        { error: 'Failed to fetch course details', details: moduleError.message },
        { status: 500 }
      );
    }

    if (!moduleData) {
      return NextResponse.json(
        { error: 'Course module not found or not a course type' },
        { status: 404 }
      );
    }

    // 6. Verify this is a Job Readiness product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, name, type')
      .eq('id', moduleData.product_id)
      .eq('type', 'JOB_READINESS')
      .single();

    if (productError || !productData) {
      return NextResponse.json(
        { error: 'This course is not part of a Job Readiness product' },
        { status: 404 }
      );
    }

    // 7. Verify enrollment
    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productData.id);

    if (assignmentError) {
      console.error('Error checking client enrollment:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to verify enrollment', details: assignmentError.message },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Forbidden: Student not enrolled in this Job Readiness course' },
        { status: 403 }
      );
    }

    // 8. Get existing progress
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details, progress_percentage, status')
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

    // 9. Merge progress details with enhanced video tracking
    const currentDetails = existingProgress?.progress_details || {};
    
    // Initialize arrays if they don't exist
    if (!currentDetails.video_playback_positions) {
      currentDetails.video_playback_positions = {};
    }
    if (!currentDetails.fully_watched_video_ids) {
      currentDetails.fully_watched_video_ids = [];
    }
    if (!currentDetails.completed_lesson_ids) {
      currentDetails.completed_lesson_ids = [];
    }

    // Process lesson-specific updates
    if (lesson_id) {
      // Update video playback position
      if (video_playback_position !== undefined) {
        currentDetails.video_playback_positions[lesson_id] = video_playback_position;
      }

      // Mark video as fully watched
      if (video_fully_watched === true) {
        if (!currentDetails.fully_watched_video_ids.includes(lesson_id)) {
          currentDetails.fully_watched_video_ids.push(lesson_id);
        }
      }

      // Mark lesson as completed
      if (lesson_completed === true) {
        if (!currentDetails.completed_lesson_ids.includes(lesson_id)) {
          currentDetails.completed_lesson_ids.push(lesson_id);
        }
      }
    }

    // Update global progress indicators
    if (last_viewed_lesson_sequence !== undefined) {
      currentDetails.last_viewed_lesson_sequence = last_viewed_lesson_sequence;
    }

    // Merge additional progress_details if provided
    if (progress_details) {
      Object.assign(currentDetails, progress_details);
    }

    // Calculate progress percentage based on completed lessons if not provided
    let finalProgressPercentage = progress_percentage;
    if (finalProgressPercentage === undefined || finalProgressPercentage === 0) {
      // Get total lessons count for this module
      const { count: totalLessonsCount, error: lessonsCountError } = await supabase
        .from('lessons')
        .select('id', { count: 'exact' })
        .eq('module_id', validModuleId);

      if (!lessonsCountError && totalLessonsCount > 0) {
        const completedLessonsCount = currentDetails.completed_lesson_ids?.length || 0;
        finalProgressPercentage = Math.round((completedLessonsCount / totalLessonsCount) * 100);
      } else {
        finalProgressPercentage = progress_percentage || 0;
      }
    }

    // Determine final status
    let finalStatus = status || existingProgress?.status || 'InProgress';
    if (finalProgressPercentage >= 100) {
      finalStatus = 'Completed';
    }

    // Build the final progress object to save
    const progressToSave = {
      student_id: studentId,
      module_id: validModuleId,
      progress_percentage: finalProgressPercentage,
      status: finalStatus,
      progress_details: currentDetails,
      last_updated: new Date().toISOString()
    };

    // 10. Save progress
    const { data: savedProgress, error: saveError } = await supabase
      .from('student_module_progress')
      .upsert(progressToSave, {
        onConflict: 'student_id,module_id',
        returning: 'minimal'
      })
      .select('progress_percentage, status, last_updated')
      .single();

    if (saveError) {
      console.error('Error saving progress:', saveError);
      return NextResponse.json(
        { error: 'Failed to save progress', details: saveError.message },
        { status: 500 }
      );
    }

    // 11. Check for star level unlock (if applicable for courses)
    let starLevelUnlocked = false;
    let newStarLevel = '';

    // Only check for star level progression if the course is completed
    if (finalStatus === 'Completed') {
      // Get current star level from database to ensure we have the latest state
      const { data: currentStudentData, error: studentDataError } = await supabase
        .from('students')
        .select('job_readiness_star_level')
        .eq('id', studentId)
        .single();

      if (studentDataError) {
        console.error('Error fetching current student star level:', studentDataError);
      }

      const currentStarLevel = currentStudentData?.job_readiness_star_level;
      
      // Only check for second star if student has first star and doesn't have second star yet
      if (currentStarLevel === 'ONE') {
        // Check if ALL courses for this product are now completed
        const { data: allCourses, error: coursesError } = await supabase
          .from('modules')
          .select('id')
          .eq('product_id', productData.id)
          .eq('type', 'Course');

        const { data: completedCourses, error: completedCoursesError } = await supabase
          .from('student_module_progress')
          .select('module_id')
          .eq('student_id', studentId)
          .eq('status', 'Completed')
          .in('module_id', allCourses?.map((c: { id: string }) => c.id) || []);

        if (!coursesError && !completedCoursesError) {
          const totalCourses = allCourses?.length || 0;
          const completedCoursesCount = completedCourses?.length || 0;
          
          console.log(`Course completion check: ${completedCoursesCount}/${totalCourses} courses completed for product ${productData.id}`);
          
          // Award second star if ALL courses are completed
          if (completedCoursesCount === totalCourses && totalCourses > 0) {
            console.log(`🌟 Student ${studentId} completed all ${totalCourses} courses. Awarding second star!`);
            
            const { error: starUpdateError } = await supabase
              .from('students')
              .update({
                job_readiness_star_level: 'TWO',
                job_readiness_last_updated: new Date().toISOString(),
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
            console.log(`Student ${studentId} completed ${completedCoursesCount}/${totalCourses} courses. Second star will be awarded when all are complete.`);
          }
        } else {
          console.error('Error checking course completion:', { coursesError, completedCoursesError });
        }
      } else if (currentStarLevel) {
        console.log(`Student ${studentId} already has star level ${currentStarLevel}, skipping second star awarding logic.`);
      }
    }

    const response: ProgressSaveResponse = {
      success: true,
      message: 'Progress saved successfully',
      progress_percentage: savedProgress?.progress_percentage || finalProgressPercentage,
      status: savedProgress?.status || finalStatus,
      updated_at: savedProgress?.last_updated || progressToSave.last_updated,
      star_level_unlocked: starLevelUnlocked ? starLevelUnlocked : undefined,
      new_star_level: starLevelUnlocked ? newStarLevel : undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in course progress save:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 