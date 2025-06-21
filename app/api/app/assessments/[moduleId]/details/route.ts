import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

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
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    // Validate moduleId
    const { moduleId } = await context.params;
    const moduleIdValidation = ModuleIdSchema.safeParse(moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validModuleId = moduleIdValidation.data;

    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get student information from JWT claims
    const clientId = claims?.client_id;
    const isActive = claims?.profile_is_active;

    if (!isActive) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 },
      );
    }

    if (!clientId) {
      console.error(`Student ${user.id} has no assigned client_id in JWT claims.`);
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

    // Fetch Assessment Module Details
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

    // Verify enrollment by checking if the student's client has access to this module's product
    const { data: productData, error: productError } = await supabase
      .from('module_product_assignments')
      .select('product_id')
      .eq('module_id', validModuleId)
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

    // Extract assessment configuration details
    const config = moduleData.configuration || {};
    const timeLimit = config.timeLimitMinutes || config.time_limit_minutes || null;
    const passingThreshold = config.passThreshold || config.passing_threshold || 60; // Default to 60%
    const instructions = config.instructions || null;

    // Check if assessment has been submitted
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

    // Fetch Assessment Questions
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
      .order('sequence', { ascending: true });

    if (questionError) {
      console.error(`Error fetching questions for module ${validModuleId}:`, questionError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment questions', details: questionError.message },
        { status: 500 }
      );
    }

    // Transform question data
    const questions: AssessmentQuestionOutput[] = (questionData as QuestionData[])
      .filter(q => q.assessment_questions !== null)
      .map(q => {
        const question = q.assessment_questions!;
        return {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.options || []
        };
      });

    // Check for in-progress attempt (if not submitted)
    let inProgressAttempt: InProgressAttemptDetails | null = null;
    if (!isSubmitted) {
      const { data: attemptData, error: attemptError } = await supabase
        .from('assessment_progress')
        .select('saved_answers, started_at, remaining_time_seconds')
        .eq('student_id', studentId)
        .eq('module_id', validModuleId)
        .is('submitted_at', null)
        .maybeSingle();

      if (attemptError && attemptError.code !== 'PGRST116') {
        console.error(`Error fetching in-progress attempt for module ${validModuleId}:`, attemptError);
        // Continue without in-progress data
      } else if (attemptData) {
        inProgressAttempt = {
          saved_answers: attemptData.saved_answers || {},
          start_time: attemptData.started_at,
          remaining_time_seconds: attemptData.remaining_time_seconds
        };
      }
    }

    // Build response
    const assessmentDetails: AssessmentDetailsOutput = {
      id: moduleData.id,
      name: moduleData.name,
      instructions,
      time_limit_minutes: timeLimit,
      passing_threshold: passingThreshold,
      questions,
      is_submitted: isSubmitted,
      retakes_allowed: retakesAllowed
    };

    const response: AssessmentPageDataResponse = {
      assessment: assessmentDetails,
      in_progress_attempt: inProgressAttempt
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in GET /api/app/assessments/[moduleId]/details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 