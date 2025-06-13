import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

// Define schemas for validation
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

// Types for the response structure
interface AssessmentQuestionOutput {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TF';
  options: { id: string; text: string }[];
}

interface AssessmentDetailsOutput {
  id: string;
  name: string;
  instructions?: string | null;
  time_limit_minutes?: number | null;
  passing_threshold?: number | null;
  questions: AssessmentQuestionOutput[];
  is_submitted: boolean;
  retakes_allowed: boolean;
}

interface InProgressAttemptDetails {
  saved_answers?: Record<string, string | string[]>;
  start_time?: string | null;
  remaining_time_seconds?: number | null;
}

interface AssessmentPageDataResponse {
  assessment: AssessmentDetailsOutput;
  in_progress_attempt?: InProgressAttemptDetails | null;
}

// Define type for the question data from Supabase
interface QuestionData {
  question_id: string;
  assessment_questions: {
    id: string;
    question_text: string;
    question_type: 'MCQ' | 'MSQ' | 'TF';
    options: { id: string; text: string }[] | null;
  } | null;
}

export async function GET(
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

    // 3. Get student information
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students')
      .select('client_id, is_active')
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

    if (!studentRecord.client_id) {
      console.error(`Student ${user.id} has no assigned client_id in students table.`);
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;
    const clientId = studentRecord.client_id;

    // 4. Fetch Assessment Module Details
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, name, type, configuration')
      .eq('id', validModuleId)
      .eq('type', 'Assessment')
      .maybeSingle();

    if (moduleError) {
      console.error(`Error fetching assessment module ${validModuleId}:`, moduleError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment details', details: moduleError.message },
        { status: 500 }
      );
    }

    if (!moduleData) {
      return NextResponse.json(
        { error: 'Assessment module not found or not an assessment type' },
        { status: 404 }
      );
    }

    // 5. Verify enrollment by checking if the student's client has access to this module's product
    const { data: productData, error: productError } = await supabase
      .from('modules')
      .select('product_id')
      .eq('id', validModuleId)
      .single();

    if (productError) {
      console.error(`Error fetching product for module ${validModuleId}:`, productError);
      return NextResponse.json(
        { error: 'Failed to verify enrollment', details: productError.message },
        { status: 500 }
      );
    }

    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productData.product_id);

    if (assignmentError) {
      console.error('Error checking client enrollment:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to verify enrollment', details: assignmentError.message },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Forbidden: Student not enrolled in this assessment' },
        { status: 403 }
      );
    }

    // 6. Extract assessment configuration details
    const config = moduleData.configuration || {};
    const timeLimit = config.timeLimitMinutes || config.time_limit_minutes || null;
    const passingThreshold = config.passThreshold || config.passing_threshold || 60; // Default to 60%
    const instructions = config.instructions || null;

    // 7. Check if assessment has been submitted
    const { data: submissionData, error: submissionError } = await supabase
      .from('assessment_progress')
      .select('submitted_at, passed')
      .eq('student_id', studentId)
      .eq('module_id', validModuleId)
      .maybeSingle();

    if (submissionError && submissionError.code !== 'PGRST116') {
      console.error(`Error checking assessment submission for module ${validModuleId}:`, submissionError);
      // Continue - we'll assume not submitted
    }

    const isSubmitted = !!submissionData?.submitted_at;
    const retakesAllowed = config.retakesAllowed || config.retakes_allowed || false; // Default to false

    // 8. Fetch Assessment Questions
    const { data: questionData, error: questionError } = await supabase
      .from('assessment_module_questions')
      .select(`
        question_id,
        assessment_questions (
          id, 
          question_text, 
          question_type, 
          options
        )
      `)
      .eq('module_id', validModuleId)
      .returns<QuestionData[]>();

    if (questionError) {
      console.error(`Error fetching questions for module ${validModuleId}:`, questionError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment questions', details: questionError.message },
        { status: 500 }
      );
    }

    // Process questions, removing any null joins and formatting
    const questions: AssessmentQuestionOutput[] = questionData
      .filter(q => q.assessment_questions !== null)
      .map(q => {
        const aq = q.assessment_questions!; // Non-null assertion since we filtered nulls
        return {
          id: q.question_id,
          question_text: aq.question_text,
          question_type: aq.question_type,
          options: aq.options || []
        };
      });

    // 9. Fetch In-Progress Attempt if not submitted
    let inProgressAttempt: InProgressAttemptDetails | null = null;

    if (!isSubmitted) {
      const { data: savedProgressData, error: savedProgressError } = await supabase
        .from('assessment_progress')
        .select('saved_answers, started_at, remaining_time_seconds')
        .eq('student_id', studentId)
        .eq('module_id', validModuleId)
        .is('submitted_at', null) // Only get attempts that haven't been submitted
        .maybeSingle();

      if (savedProgressError && savedProgressError.code !== 'PGRST116') {
        console.error(`Error fetching saved progress for module ${validModuleId}:`, savedProgressError);
        // Continue - we'll assume no saved progress
      }

      if (savedProgressData) {
        inProgressAttempt = {
          saved_answers: savedProgressData.saved_answers || {},
          start_time: savedProgressData.started_at,
          remaining_time_seconds: savedProgressData.remaining_time_seconds
        };
      }
    }

    // 10. Build and return response
    const responsePayload: AssessmentPageDataResponse = {
      assessment: {
        id: moduleData.id,
        name: moduleData.name,
        instructions,
        time_limit_minutes: timeLimit,
        passing_threshold: passingThreshold,
        questions,
        is_submitted: isSubmitted,
        retakes_allowed: retakesAllowed,
      },
      in_progress_attempt: inProgressAttempt
    };

    return NextResponse.json(responsePayload);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/assessments/[moduleId]/details:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
} 