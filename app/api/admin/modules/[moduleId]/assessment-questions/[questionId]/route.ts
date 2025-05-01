import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ModuleIdSchema } from '@/lib/schemas/module';
import { z } from 'zod';

// Create a QuestionIdSchema directly following the same pattern as ModuleIdSchema
const QuestionIdSchema = z.object({
  questionId: z.string().uuid({ message: 'Invalid Question ID format' })
});

/**
 * DELETE /api/admin/modules/[moduleId]/assessment-questions/[questionId]
 * 
 * Unlinks an assessment question from a specific 'Assessment' module.
 * Requires admin authentication.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { moduleId: string; questionId: string } }
) {
  try {
    // Await params to ensure moduleId and questionId are available
    const { moduleId: rawModuleId, questionId: rawQuestionId } = await params;
    
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
    const moduleIdValidation = ModuleIdSchema.safeParse({ moduleId: rawModuleId });
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Module ID format', details: moduleIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data.moduleId;

    const questionIdValidation = QuestionIdSchema.safeParse({ questionId: rawQuestionId });
    if (!questionIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid Question ID format', details: questionIdValidation.error.format() }, 
        { status: 400 }
      );
    }
    const questionId = questionIdValidation.data.questionId;

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

    // Delete the link
    const { error: deleteError, count } = await supabase
      .from('assessment_module_questions')
      .delete({ count: 'exact' }) // Request count to check if a row was actually deleted
      .eq('module_id', moduleId)
      .eq('question_id', questionId);

    if (deleteError) {
      console.error('Error unlinking question from module:', deleteError);
      return NextResponse.json({ error: 'Server Error', message: 'Error unlinking question from module' }, { status: 500 });
    }

    // Check if any row was actually deleted
    if (count === 0) {
      return NextResponse.json({ error: 'Not Found', message: 'Question is not linked to this module' }, { status: 404 });
    }

    // No content response for successful deletion
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Unexpected error in DELETE assessment question link:', error);
    return NextResponse.json({ error: 'Server Error', message: 'An unexpected error occurred' }, { status: 500 });
  }
}
