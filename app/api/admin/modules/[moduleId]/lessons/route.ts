import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, CourseLessonSchema } from '@/lib/schemas/module';

/**
 * GET /api/admin/modules/[moduleId]/lessons
 * 
 * Retrieves all lessons for a specific 'Course' module, ordered by sequence.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
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

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: params.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

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

    // Fetch Lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('course_lessons')
      .select('*') // Select all columns for lessons
      .eq('module_id', moduleId)
      .order('sequence', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching course lessons:', lessonsError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching lessons for the module' }, { status: 500 });
    }

    return NextResponse.json(lessons);

  } catch (error) {
    console.error('Unexpected error in GET module lessons:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * POST /api/admin/modules/[moduleId]/lessons
 * 
 * Creates a new lesson for a specific 'Course' module.
 * Automatically assigns the next sequence number.
 * Requires admin authentication.
 */
export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
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

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: params.moduleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

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
        { error: 'Bad Request', message: `Lessons can only be added to 'Course' modules. This module is type '${module.type}'.` },
        { status: 400 }
      );
    }

    // Parse and Validate Request Body
    const body = await request.json();
    const lessonValidation = CourseLessonSchema.safeParse(body);

    if (!lessonValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid lesson data', details: lessonValidation.error.format() },
        { status: 400 }
      );
    }

    const lessonData = lessonValidation.data;

    // Determine the next sequence number
    const { data: maxSequenceResult, error: sequenceError } = await supabase
      .from('course_lessons')
      .select('sequence')
      .eq('module_id', moduleId)
      .order('sequence', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle in case there are no lessons yet

    if (sequenceError) {
      console.error('Error fetching max sequence:', sequenceError);
      return NextResponse.json({ error: 'Server Error', message: 'Error determining lesson sequence' }, { status: 500 });
    }

    const nextSequence = (maxSequenceResult?.sequence ?? 0) + 1;

    // Insert the new lesson
    const { data: newLesson, error: insertError } = await supabase
      .from('course_lessons')
      .insert({
        ...lessonData,
        module_id: moduleId, // Ensure module_id is set
        sequence: nextSequence, // Set the calculated sequence
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting course lesson:', insertError);
      // Consider specific error handling (e.g., unique constraint violation if applicable)
      return NextResponse.json({ error: 'Server Error', message: 'Error creating the lesson' }, { status: 500 });
    }

    return NextResponse.json(newLesson, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Unexpected error in POST module lesson:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}
