import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema } from '@/lib/schemas/module';
import { z } from 'zod';

const AssessmentQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      sequence: z.number().int().min(1),
      question_text: z.string().optional(),
      question_type: z.enum(['MCQ', 'MSQ']).optional(),
      options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
      correct_answer: z.union([
        z.string(),
        z.object({ answers: z.array(z.string()) })
      ]).optional()
    })
  )
});

/**
 * GET /api/admin/modules/[moduleId]/assessment-questions
 * 
 * Retrieves all questions associated with a specific assessment module.
 * Requires admin authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
    const { moduleId: rawModuleId } = resolvedParams;
    
    const supabase = await createClient();

    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to verify user permissions' }, { status: 403 });
    }

    if (profile.role !== 'Admin' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Validate the module ID format
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Module ID format', details: moduleIdValidation.error.format() },
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    // Check if the module exists and is an assessment
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, type')
      .eq('id', moduleId)
      .single();

    if (moduleError) {
      console.error('Error fetching module:', moduleError);
      return NextResponse.json(
        { error: 'Failed to fetch module', details: moduleError.message },
        { status: 500 }
      );
    }

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    if (module.type !== 'Assessment') {
      return NextResponse.json(
        { error: 'This endpoint is only for Assessment modules' },
        { status: 400 }
      );
    }

    // Fetch assessment questions
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_module_questions')
      .select(`
        module_id,
        question_id,
        sequence,
        assessment_questions (
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          topic,
          difficulty
        )
      `)
      .eq('module_id', moduleId)
      .order('sequence', { ascending: true });

    if (questionsError) {
      console.error('Error fetching assessment questions:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment questions', details: questionsError.message },
        { status: 500 }
      );
    }

    // Transform the data structure to flatten it
    const formattedQuestions = (questions || []).map(q => ({
      id: q.question_id,
      sequence: q.sequence,
      ...(q.assessment_questions || {}),
    }));

    return NextResponse.json(formattedQuestions);
  } catch (error) {
    console.error('Error in GET assessment questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment questions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/modules/[moduleId]/assessment-questions
 * 
 * Updates the assessment questions for a module.
 * Allows reordering, adding, and removing questions.
 * Requires admin authentication.
 */
export async function PUT(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    // Await params before destructuring to fix Next.js warning
    const resolvedParams = await Promise.resolve(params);
    const { moduleId: rawModuleId } = resolvedParams;
    
    const supabase = await createClient();

    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to verify user permissions' }, { status: 403 });
    }

    if (profile.role !== 'Admin' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Validate the module ID format
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Module ID format', details: moduleIdValidation.error.format() },
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    // Check if the module exists and is an assessment
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, type')
      .eq('id', moduleId)
      .single();

    if (moduleError) {
      console.error('Error fetching module:', moduleError);
      return NextResponse.json(
        { error: 'Failed to fetch module', details: moduleError.message },
        { status: 500 }
      );
    }

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    if (module.type !== 'Assessment') {
      return NextResponse.json(
        { error: 'This endpoint is only for Assessment modules' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('Received request body:', body);
    
    const validationResult = AssessmentQuestionsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { questions } = validationResult.data;

    // Skip RPC and use direct approach
    const useDirectApproach = true;
    let updateSuccess = false;

    if (!useDirectApproach) {
      // Start a transaction to update the assessment questions
      const { error: transactionError } = await supabase.rpc('update_assessment_questions', {
        p_module_id: moduleId,
        p_questions: questions
      });

      if (!transactionError) {
        updateSuccess = true;
      } else {
        console.error('Error updating assessment questions using RPC:', transactionError);
      }
    }

    // If RPC failed or we're using direct approach
    if (!updateSuccess) {
      console.log('Using direct insert/delete approach');
      
      // First, delete all existing associations
      const { error: deleteError } = await supabase
        .from('assessment_module_questions')
        .delete()
        .eq('module_id', moduleId);
      
      if (deleteError) {
        console.error('Error deleting existing questions:', deleteError);
        return NextResponse.json(
          { error: 'Failed to update assessment questions', details: deleteError.message },
          { status: 500 }
        );
      }
      
      // Then, insert the new associations
      const associations = questions.map(q => ({
        module_id: moduleId,
        question_id: q.id,
        sequence: q.sequence
      }));
      
      console.log('Inserting associations:', associations);
      
      const { error: insertError } = await supabase
        .from('assessment_module_questions')
        .insert(associations);
      
      if (insertError) {
        console.error('Error inserting new questions:', insertError);
        return NextResponse.json(
          { error: 'Failed to update assessment questions', details: insertError.message },
          { status: 500 }
        );
      }
    }

    // Fetch the updated questions to return
    const { data: updatedQuestions, error: fetchError } = await supabase
      .from('assessment_module_questions')
      .select(`
        module_id,
        question_id,
        sequence,
        assessment_questions (
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          topic,
          difficulty
        )
      `)
      .eq('module_id', moduleId)
      .order('sequence', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated questions:', fetchError);
      return NextResponse.json(
        { error: 'Questions updated but failed to fetch the result', details: fetchError.message },
        { status: 207 } // Multi-Status response
      );
    }

    // Transform the data structure to flatten it
    const formattedQuestions = (updatedQuestions || []).map(q => ({
      id: q.question_id,
      sequence: q.sequence,
      ...(q.assessment_questions || {}),
    }));

    return NextResponse.json(formattedQuestions);
  } catch (error) {
    console.error('Error in PUT assessment questions:', error);
    return NextResponse.json(
      { error: 'Failed to update assessment questions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
