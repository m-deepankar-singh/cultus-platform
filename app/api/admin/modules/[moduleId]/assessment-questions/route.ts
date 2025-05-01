import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema, AssessmentQuestionLinkSchema } from '@/lib/schemas/module';

/**
 * GET /api/admin/modules/[moduleId]/assessment-questions
 * 
 * Retrieves all questions linked to a specific 'Assessment' module.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    // Await params to ensure moduleId is available
    const { moduleId: rawModuleId } = await params;
    
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

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    // Verify the module exists and is of type 'Assessment'
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

    if (module.type !== 'Assessment') {
      return NextResponse.json(
        { error: 'Bad Request', message: `Assessment questions are only applicable to 'Assessment' modules. This module is of type '${module.type}'.` },
        { status: 400 }
      );
    }

    // Fetch linked questions
    const { data: linkedQuestions, error: questionsError } = await supabase
      .from('assessment_module_questions')
      .select('question:assessment_questions(*)')
      .eq('module_id', moduleId);

    if (questionsError) {
      console.error('Error fetching linked questions:', questionsError);
      return NextResponse.json({ error: 'Server Error', message: 'Error fetching linked questions' }, { status: 500 });
    }

    // Extract just the question objects from the joined results
    const questions = linkedQuestions?.map(item => item.question) || [];
    
    return NextResponse.json(questions);

  } catch (error) {
    console.error('Unexpected error in GET assessment questions:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * POST /api/admin/modules/[moduleId]/assessment-questions
 * 
 * Links an assessment question to a specific 'Assessment' module.
 * Requires admin authentication.
 */
export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    // Await params to ensure moduleId is available
    const { moduleId: rawModuleId } = await params;
    
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

    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    // Verify the module exists and is of type 'Assessment'
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

    if (module.type !== 'Assessment') {
      return NextResponse.json(
        { error: 'Bad Request', message: `Questions can only be linked to 'Assessment' modules. This module is type '${module.type}'.` },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const linkValidation = AssessmentQuestionLinkSchema.safeParse(body);

    if (!linkValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid question link data', details: linkValidation.error.format() },
        { status: 400 }
      );
    }

    const { question_id } = linkValidation.data;

    // Verify the question exists
    const { data: question, error: questionCheckError } = await supabase
      .from('assessment_questions')
      .select('id')
      .eq('id', question_id)
      .single();

    if (questionCheckError) {
      if (questionCheckError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not Found', message: 'Assessment question not found' }, { status: 404 });
      } else {
        console.error('Error checking question existence:', questionCheckError);
        return NextResponse.json({ error: 'Server Error', message: 'Error verifying question' }, { status: 500 });
      }
    }

    // Check if the link already exists
    const { data: existingLink, error: linkCheckError } = await supabase
      .from('assessment_module_questions')
      .select('module_id, question_id')
      .eq('module_id', moduleId)
      .eq('question_id', question_id)
      .maybeSingle();

    if (linkCheckError) {
      console.error('Error checking existing link:', linkCheckError);
      return NextResponse.json({ error: 'Server Error', message: 'Error checking existing question link' }, { status: 500 });
    }

    if (existingLink) {
      // Link already exists - we can either return a 409 Conflict or a 200 OK with existing data
      return NextResponse.json(
        { message: 'Question is already linked to this module', module_id: existingLink.module_id, question_id: existingLink.question_id },
        { status: 200 }
      );
    }

    // Create the link
    const { data: newLink, error: insertError } = await supabase
      .from('assessment_module_questions')
      .insert({
        module_id: moduleId,
        question_id: question_id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error linking question to module:', insertError);
      return NextResponse.json({ error: 'Server Error', message: 'Error linking question to module' }, { status: 500 });
    }

    return NextResponse.json(newLink, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Unexpected error in POST assessment question link:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}
