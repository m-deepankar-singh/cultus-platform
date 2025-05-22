import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema for question mapping
const QuestionMappingSchema = z.object({
  question_id: z.string().uuid(),
  is_fallback: z.boolean().default(true),
  is_required: z.boolean().default(false),
  sequence: z.number().int().nonnegative().default(0)
});

const QuestionMappingsSchema = z.object({
  mappings: z.array(QuestionMappingSchema)
});

// GET - Retrieve all question bank mappings for a lesson
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const { moduleId, lessonId } = params;
    
    if (!moduleId || !lessonId) {
      return NextResponse.json({ error: 'Module ID and Lesson ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Verify authentication and authorization
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not retrieve user role.' }, { status: 403 });
    }

    const userRole = profile.role;
    if (userRole !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the lesson belongs to the module
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .single();

    if (lessonError) {
      return NextResponse.json({ 
        error: 'Lesson not found or does not belong to specified module'
      }, { status: 404 });
    }

    // Get the question mappings for this lesson
    const { data: mappings, error: mappingError } = await supabase
      .from('lesson_question_bank_mappings')
      .select(`
        question_id,
        is_fallback,
        is_required,
        sequence,
        assessment_questions(id, question_text, options, correct_option_id, question_type, tags)
      `)
      .eq('lesson_id', lessonId)
      .order('sequence', { ascending: true });

    if (mappingError) {
      return NextResponse.json({ 
        error: 'Failed to fetch question mappings',
        details: mappingError.message
      }, { status: 500 });
    }

    return NextResponse.json({ mappings });

  } catch (error) {
    console.error('Unexpected error in lesson question mapping GET:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST - Add or update question mappings for a lesson
export async function POST(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const { moduleId, lessonId } = params;
    
    if (!moduleId || !lessonId) {
      return NextResponse.json({ error: 'Module ID and Lesson ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Verify authentication and authorization
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not retrieve user role.' }, { status: 403 });
    }

    const userRole = profile.role;
    if (userRole !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the lesson belongs to the module
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .single();

    if (lessonError) {
      return NextResponse.json({ 
        error: 'Lesson not found or does not belong to specified module'
      }, { status: 404 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const validation = QuestionMappingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request format',
        details: validation.error.format()
      }, { status: 400 });
    }

    const mappingsToAdd = validation.data.mappings;

    // First, delete all existing mappings for this lesson
    await supabase
      .from('lesson_question_bank_mappings')
      .delete()
      .eq('lesson_id', lessonId);

    // Then, add all the new mappings
    const mappingsWithLessonId = mappingsToAdd.map(mapping => ({
      ...mapping,
      lesson_id: lessonId
    }));

    const { data: newMappings, error: insertError } = await supabase
      .from('lesson_question_bank_mappings')
      .insert(mappingsWithLessonId)
      .select();

    if (insertError) {
      return NextResponse.json({
        error: 'Failed to create question mappings',
        details: insertError.message
      }, { status: 500 });
    }

    // Update the lesson to indicate it has a fallback quiz
    await supabase
      .from('lessons')
      .update({ has_quiz: true })
      .eq('id', lessonId);

    return NextResponse.json({ 
      message: 'Question mappings created successfully',
      mappings: newMappings
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in lesson question mapping POST:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE - Remove all question mappings for a lesson
export async function DELETE(
  request: Request,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const { moduleId, lessonId } = params;
    
    if (!moduleId || !lessonId) {
      return NextResponse.json({ error: 'Module ID and Lesson ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Verify authentication and authorization
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not retrieve user role.' }, { status: 403 });
    }

    const userRole = profile.role;
    if (userRole !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the lesson belongs to the module
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .single();

    if (lessonError) {
      return NextResponse.json({ 
        error: 'Lesson not found or does not belong to specified module'
      }, { status: 404 });
    }

    // Delete all mappings for this lesson
    const { error: deleteError } = await supabase
      .from('lesson_question_bank_mappings')
      .delete()
      .eq('lesson_id', lessonId);

    if (deleteError) {
      return NextResponse.json({
        error: 'Failed to delete question mappings',
        details: deleteError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Question mappings deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in lesson question mapping DELETE:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
} 