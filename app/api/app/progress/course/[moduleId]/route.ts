import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
// Import the correct schema for module updates
import { ModuleProgressUpdateSchema } from '@/lib/schemas/progress';
import type { NextRequest } from 'next/server';

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
  { params }: { params: { moduleId: string } }
) {
  try {
    // Extract moduleId and validate
    const moduleId = params?.moduleId;
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    // Parse request body
    const body: CourseProgressUpdatePayload = await request.json();

    // Use the existing Supabase client
    const supabase = await createClient(); 

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the module exists and is a course
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, type')
      .eq('id', moduleId)
      .eq('type', 'Course')
      .maybeSingle();

    if (moduleError && moduleError.code !== 'PGRST116') {
      console.error(`Error verifying module ${moduleId}:`, moduleError);
      return NextResponse.json({ 
        error: 'Failed to verify course module', 
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
      .select('*')
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
 * - Validates moduleId.
 * - Authenticates and authorizes the student.
 * - Verifies student enrollment in the module's product.
 * - Fetches the progress record from student_module_progress.
 * - Returns the progress or a default 'NotStarted' state.
 */
export async function GET(
  request: Request, // Keep request parameter for consistency, though not used directly
  { params }: { params: { moduleId: string } },
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

    // 2. Authentication & Authorization (Similar to PATCH)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
       return NextResponse.json({ error: 'Forbidden: Profile not found' }, { status: 403 });
    }
    if (profile.role !== 'Student') {
       return NextResponse.json({ error: 'Forbidden: User is not a Student' }, { status: 403 });
    }
    if (!profile.client_id) {
      return NextResponse.json({ error: 'Forbidden: Student not linked to a client' }, { status: 403 });
    }
    const studentId = user.id;
    const clientId = profile.client_id;

    // 3. Verify Enrollment (Similar to PATCH)
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('product_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (moduleError) {
      console.error('GET Progress - Error fetching module:', moduleError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (!moduleData || !moduleData.product_id) {
      return NextResponse.json({ error: 'Not Found: Module does not exist' }, { status: 404 });
    }
    const productId = moduleData.product_id;

    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (assignmentError) {
      console.error('GET Progress - Error checking assignment:', assignmentError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (count === null || count === 0) {
      return NextResponse.json({ error: 'Forbidden: Not enrolled' }, { status: 403 });
    }

    // 4. Fetch Progress
    const { data: progress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('status, score, completed_at, updated_at')
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .maybeSingle(); // Use maybeSingle as progress might not exist

    if (progressError) {
      console.error('GET Progress - Error fetching progress:', progressError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // 5. Return Progress or Default State
    if (progress) {
      return NextResponse.json(progress, { status: 200 });
    } else {
      // Return a default 'NotStarted' state if no record exists
      return NextResponse.json(
        {
          status: 'NotStarted',
          score: null,
          completed_at: null,
          updated_at: null, // Or maybe current time? Null seems cleaner
        },
        { status: 200 }, // 200 OK is appropriate even if not started
      );
    }

  } catch (error) {
    console.error('Unexpected Error in GET /progress/course/[moduleId]:', error);
    if (error instanceof z.ZodError) { // Catch Zod errors specifically if needed
        return NextResponse.json(
          { error: 'Bad Request: Validation failed', details: error.flatten() },
          { status: 400 },
        );
      }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
