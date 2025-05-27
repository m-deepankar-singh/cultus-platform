import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

// Schema for progress data validation
const ProgressDataSchema = z.object({
  progress_percentage: z.number().min(0).max(100),
  progress_details: z.record(z.any()).optional(),
  status: z.enum(['InProgress', 'Completed']).default('InProgress'),
  lesson_id: z.string().uuid().optional(),
  video_playback_position: z.number().optional(),
  lesson_completed: z.boolean().optional(),
});

const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

interface ProgressSaveResponse {
  success: boolean;
  message: string;
  progress_percentage: number;
  status: string;
  updated_at: string;
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

    const { progress_percentage, progress_details, status, lesson_id, video_playback_position, lesson_completed } = validation.data;

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

    // 9. Merge progress details
    const currentDetails = existingProgress?.progress_details || {};
    const updatedDetails = {
      ...currentDetails,
      ...progress_details,
      last_viewed_lesson_sequence: currentDetails.last_viewed_lesson_sequence || 0,
      video_playback_positions: {
        ...(currentDetails.video_playback_positions || {}),
        ...(lesson_id && video_playback_position !== undefined ? { [lesson_id]: video_playback_position } : {})
      },
      fully_watched_video_ids: currentDetails.fully_watched_video_ids || [],
      lesson_quiz_results: currentDetails.lesson_quiz_results || {},
      updated_at: new Date().toISOString(),
    };

    // Handle lesson completion
    if (lesson_completed && lesson_id) {
      if (!updatedDetails.completed_lesson_ids) {
        updatedDetails.completed_lesson_ids = [];
      }
      if (!updatedDetails.completed_lesson_ids.includes(lesson_id)) {
        updatedDetails.completed_lesson_ids.push(lesson_id);
      }
    }

    // 10. Save progress to student_module_progress
    const { data: savedProgress, error: saveError } = await supabase
      .from('student_module_progress')
      .upsert({
        student_id: studentId,
        module_id: validModuleId,
        status: status,
        progress_percentage: progress_percentage,
        progress_details: updatedDetails,
        last_updated: new Date().toISOString(),
        completed_at: status === 'Completed' ? new Date().toISOString() : null,
      })
      .select('id, progress_percentage, status, last_updated')
      .single();

    if (saveError) {
      console.error('Error saving progress:', saveError);
      return NextResponse.json(
        { error: 'Failed to save progress', details: saveError.message },
        { status: 500 }
      );
    }

    // 11. Return success response
    const response: ProgressSaveResponse = {
      success: true,
      message: `Course progress saved successfully (${progress_percentage}%)`,
      progress_percentage: savedProgress.progress_percentage,
      status: savedProgress.status,
      updated_at: savedProgress.last_updated,
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