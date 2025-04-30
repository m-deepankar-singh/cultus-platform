import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, LessonIdSchema, UpdateCourseLessonSchema } from '@/lib/schemas/module';

/**
 * GET /api/admin/modules/[moduleId]/lessons/[lessonId]
 * 
 * Retrieves detailed information for a specific lesson in a course module.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching user profile' }, { status: 500 });
    }
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin role required' }, { status: 403 });
    }

    // Validate route parameters
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: params.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    const lessonIdValidation = LessonIdSchema.safeParse({ lessonId: params.lessonId });
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Lesson ID format', details: lessonIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const lessonId = lessonIdValidation.data.lessonId;

    // Verify the module exists and is of type 'Course'
    const { data: module, error: moduleCheckError } = await supabase
      .from('modules')
      .select('id, type')
      .eq('id', moduleId)
      .single();

    if (moduleCheckError) {
      if (moduleCheckError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not Found', message: 'Module not found' }, { status: 404 });
      } else {
        console.error('Error checking module type:', moduleCheckError);
        return NextResponse.json({ error: 'Server Error', message: 'Error verifying module' }, { status: 500 });
      }
    }

    if (module.type !== 'Course') {
      return NextResponse.json(
        { error: 'Bad Request', message: `Lessons are only applicable to 'Course' modules. This module is of type '${module.type}'.` },
        { status: 400 }
      );
    }

    // Fetch the specific lesson (ensuring it belongs to the correct module)
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('module_id', moduleId) // Important: ensure lesson belongs to specified module
      .single();

    if (lessonError) {
      if (lessonError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not Found', message: 'Lesson not found in this module' }, { status: 404 });
      } else {
        console.error('Error fetching lesson:', lessonError);
        return NextResponse.json({ error: 'Server Error', message: 'Error fetching lesson details' }, { status: 500 });
      }
    }

    return NextResponse.json(lesson);

  } catch (error) {
    console.error('Unexpected error in GET lesson details:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/modules/[moduleId]/lessons/[lessonId]
 * 
 * Updates a specific lesson in a course module.
 * Requires admin authentication.
 */
export async function PUT(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching user profile' }, { status: 500 });
    }
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin role required' }, { status: 403 });
    }

    // Validate route parameters
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: params.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    const lessonIdValidation = LessonIdSchema.safeParse({ lessonId: params.lessonId });
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Lesson ID format', details: lessonIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const lessonId = lessonIdValidation.data.lessonId;

    // Parse and validate request body
    const body = await request.json();
    const updateValidation = UpdateCourseLessonSchema.safeParse(body);

    if (!updateValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid update data', details: updateValidation.error.format() },
        { status: 400 }
      );
    }

    const updateData = updateValidation.data;

    // Check if there's actually anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Bad Request', message: 'No update fields provided' }, { status: 400 });
    }

    // Verify the lesson exists and belongs to the specified module
    const { data: existingLesson, error: checkError } = await supabase
      .from('course_lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not Found', message: 'Lesson not found in this module' }, { status: 404 });
      } else {
        console.error('Error checking lesson existence:', checkError);
        return NextResponse.json({ error: 'Server Error', message: 'Error verifying lesson' }, { status: 500 });
      }
    }

    // Update the lesson
    const { data: updatedLesson, error: updateError } = await supabase
      .from('course_lessons')
      .update(updateData)
      .eq('id', lessonId)
      .eq('module_id', moduleId) // Ensure we only update if the lesson belongs to this module
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lesson:', updateError);
      return NextResponse.json({ error: 'Server Error', message: 'Error updating lesson' }, { status: 500 });
    }

    return NextResponse.json(updatedLesson);

  } catch (error) {
    console.error('Unexpected error in PUT lesson:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/modules/[moduleId]/lessons/[lessonId]
 * 
 * Deletes a specific lesson from a course module.
 * Requires admin authentication.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching user profile' }, { status: 500 });
    }
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin role required' }, { status: 403 });
    }

    // Validate route parameters
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: params.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    const lessonIdValidation = LessonIdSchema.safeParse({ lessonId: params.lessonId });
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Lesson ID format', details: lessonIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const lessonId = lessonIdValidation.data.lessonId;

    // Delete the lesson (ensuring it belongs to the correct module)
    const { error: deleteError, count } = await supabase
      .from('course_lessons')
      .delete({ count: 'exact' }) // Request count to check if a row was actually deleted
      .eq('id', lessonId)
      .eq('module_id', moduleId); // Ensure we only delete if the lesson belongs to this module

    if (deleteError) {
      console.error('Error deleting lesson:', deleteError);
      return NextResponse.json({ error: 'Server Error', message: 'Error deleting lesson' }, { status: 500 });
    }

    // Check if any row was actually deleted
    if (count === 0) {
      return NextResponse.json({ error: 'Not Found', message: 'Lesson not found in this module' }, { status: 404 });
    }

    // No content response for successful deletion
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Unexpected error in DELETE lesson:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}
