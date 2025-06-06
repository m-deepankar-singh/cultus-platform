import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

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

    // 2. Authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // 4. Get student information
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students')
      .select('id, client_id, is_active')
      .eq('id', user.id)
      .single();

    if (studentFetchError) {
      console.error('Student Fetch Error:', studentFetchError);
      if (studentFetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Forbidden: Student record not found' },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: 'Internal Server Error: Could not fetch student record' },
        { status: 500 },
      );
    }

    if (!studentRecord.is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 },
      );
    }

    const studentId = user.id;
    const clientId = studentRecord.client_id;

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
    
    // Update video playback positions
    const updatedVideoPositions = {
      ...(currentDetails.video_playback_positions || {}),
      ...(lesson_id && video_playback_position !== undefined ? { [lesson_id]: video_playback_position } : {})
    };

    // Update fully watched video IDs
    const updatedFullyWatchedIds = [...(currentDetails.fully_watched_video_ids || [])];
    if (video_fully_watched && lesson_id && !updatedFullyWatchedIds.includes(lesson_id)) {
      updatedFullyWatchedIds.push(lesson_id);
    }

    // Update last viewed lesson sequence
    const updatedLastViewedSequence = last_viewed_lesson_sequence !== undefined 
      ? Math.max(last_viewed_lesson_sequence, currentDetails.last_viewed_lesson_sequence || 0)
      : currentDetails.last_viewed_lesson_sequence || 0;

    const updatedDetails = {
      ...currentDetails,
      ...progress_details,
      last_viewed_lesson_sequence: updatedLastViewedSequence,
      video_playback_positions: updatedVideoPositions,
      fully_watched_video_ids: updatedFullyWatchedIds,
      lesson_quiz_results: currentDetails.lesson_quiz_results || {},
      completed_lesson_ids: currentDetails.completed_lesson_ids || [],
      updated_at: new Date().toISOString(),
    };

    // Handle lesson completion
    if (lesson_completed && lesson_id) {
      if (!updatedDetails.completed_lesson_ids.includes(lesson_id)) {
        updatedDetails.completed_lesson_ids.push(lesson_id);
      }
    }

    // Handle video completion (separate from lesson completion)
    if (video_completed && lesson_id) {
      // Mark video as fully watched if not already marked
      if (!updatedDetails.fully_watched_video_ids.includes(lesson_id)) {
        updatedDetails.fully_watched_video_ids.push(lesson_id);
      }
      
      // Set video position to end (assuming 100% completion)
      updatedDetails.video_playback_positions[lesson_id] = -1; // -1 indicates completed
    }

    // 9.5. Calculate progress and check if module should be auto-completed based on lesson completion
    let finalStatus = status;
    let finalProgressPercentage = progress_percentage;
    
    // Get total lesson count for this module
    const { count: totalLessons, error: lessonCountError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('module_id', validModuleId);
    
    if (!lessonCountError && totalLessons) {
      const completedLessonsCount = updatedDetails.completed_lesson_ids?.length || 0;
      
      // Calculate progress percentage if not explicitly provided
      if (progress_percentage === undefined || progress_percentage === 0) {
        finalProgressPercentage = Math.round((completedLessonsCount / totalLessons) * 100);
      }
      
      // Auto-complete module if all lessons are completed
      if (completedLessonsCount >= totalLessons) {
        finalStatus = 'Completed';
        finalProgressPercentage = 100;
      }
    }

    // 10. Save progress to student_module_progress
    const { data: savedProgress, error: saveError } = await supabase
      .from('student_module_progress')
      .upsert({
        student_id: studentId,
        module_id: validModuleId,
        status: finalStatus,
        progress_percentage: finalProgressPercentage,
        progress_details: updatedDetails,
        last_updated: new Date().toISOString(),
        completed_at: finalStatus === 'Completed' ? new Date().toISOString() : null,
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

    // 10.5. Check for star level progression AFTER saving progress
    let starLevelUnlocked = false;
    
    if (finalStatus === 'Completed') {
      console.log(`Course module ${validModuleId} completed for student ${studentId}. Checking for star level progression...`);
      
      // Get student's current star level
      const { data: currentStudentData, error: studentDataError } = await supabase
        .from('students')
        .select('job_readiness_star_level')
        .eq('id', studentId)
        .single();

      if (!studentDataError && currentStudentData) {
        const currentStarLevel = currentStudentData.job_readiness_star_level;
        console.log(`Current star level: ${currentStarLevel}`);

        // Only check for 2nd star if student has 1st star but not 2nd star yet
        if (currentStarLevel === 'ONE') {
          console.log('Student has first star, checking if all course modules are completed...');
          
          // Get ALL course modules for this product
          const { data: allCourseModules, error: allModulesError } = await supabase
            .from('modules')
            .select('id')
            .eq('product_id', productData.id)
            .eq('type', 'Course');

          if (!allModulesError && allCourseModules && allCourseModules.length > 0) {
            console.log(`Found ${allCourseModules.length} course modules for product ${productData.id}`);
            
            // Get completed course modules for this student (NOW includes the just-saved module)
            const { data: completedModules, error: completedError } = await supabase
              .from('student_module_progress')
              .select('module_id, status')
              .eq('student_id', studentId)
              .eq('status', 'Completed')
              .in('module_id', allCourseModules.map(m => m.id));

            if (!completedError) {
              console.log(`Found ${completedModules?.length || 0} completed course modules`);
              
              // Check if ALL course modules are now completed (including the current one)
              const completedModuleIds = completedModules?.map(m => m.module_id) || [];
              const allModuleIds = allCourseModules.map(m => m.id);
              const allCompleted = allModuleIds.every(id => completedModuleIds.includes(id));

              console.log(`All course modules: [${allModuleIds.join(', ')}]`);
              console.log(`Completed course modules: [${completedModuleIds.join(', ')}]`);
              console.log(`All courses completed: ${allCompleted}`);

              if (allCompleted) {
                console.log('🌟 All course modules completed! Awarding second star...');
                
                starLevelUnlocked = true;
                
                console.log(`Updating student ${studentId} with star level: TWO`);
                
                const { error: updateStudentError } = await supabase
                  .from('students')
                  .update({
                    job_readiness_star_level: 'TWO',
                    job_readiness_last_updated: new Date().toISOString(),
                  })
                  .eq('id', studentId);

                if (updateStudentError) {
                  console.error('Error updating student star level:', updateStudentError);
                  // Continue - don't fail the progress save
                  starLevelUnlocked = false;
                } else {
                  console.log('🎉 Successfully awarded second star!');
                }
              } else {
                console.log('Not all course modules completed yet. Missing modules:', 
                  allModuleIds.filter(id => !completedModuleIds.includes(id)));
              }
            } else {
              console.error('Error fetching completed course modules:', completedError);
            }
          } else {
            console.log('No course modules found for this product or error fetching them');
          }
        } else {
          console.log(`Student already has star level ${currentStarLevel}, no progression needed for courses`);
        }
      } else {
        console.error('Error fetching current student data:', studentDataError);
      }
    }

    // 11. Return success response
    let message = `Course progress saved successfully (${savedProgress.progress_percentage}%)`;
    if (starLevelUnlocked) {
      message += ` 🌟 Congratulations! You've completed all courses and unlocked your second star!`;
    }

    const response: ProgressSaveResponse = {
      success: true,
      message,
      progress_percentage: savedProgress.progress_percentage,
      status: savedProgress.status,
      updated_at: savedProgress.last_updated,
      star_level_unlocked: starLevelUnlocked,
      new_star_level: starLevelUnlocked ? 'TWO' : undefined,
    };

    return NextResponse.json(response);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/job-readiness/courses/[moduleId]/save-progress:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
} 