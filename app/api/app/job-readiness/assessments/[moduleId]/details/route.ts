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

interface JobReadinessAssessmentDetailsOutput {
  id: string;
  name: string;
  instructions?: string | null;
  time_limit_minutes?: number | null;
  passing_threshold?: number | null;
  questions: AssessmentQuestionOutput[];
  is_submitted: boolean;
  retakes_allowed: boolean;
  tier_assessment_config?: {
    bronze_min_score: number;
    bronze_max_score: number;
    silver_min_score: number;
    silver_max_score: number;
    gold_min_score: number;
    gold_max_score: number;
  };
  current_student_tier?: string | null;
  current_star_level?: string | null;
}

interface InProgressAttemptDetails {
  saved_answers?: Record<string, string | string[]>;
  start_time?: string | null;
  remaining_time_seconds?: number | null;
}

interface JobReadinessAssessmentPageDataResponse {
  assessment: JobReadinessAssessmentDetailsOutput;
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
      .select('client_id, is_active, job_readiness_tier, job_readiness_star_level')
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

    // 4. Fetch Assessment Module Details (must be Job Readiness assessment)
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, name, type, configuration, product_id')
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

    // 5. Verify this is a Job Readiness product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, name, type')
      .eq('id', moduleData.product_id)
      .eq('type', 'JOB_READINESS')
      .single();

    if (productError || !productData) {
      return NextResponse.json(
        { error: 'This assessment is not part of a Job Readiness product' },
        { status: 404 }
      );
    }

    // 6. Verify enrollment by checking if the student's client has access to this Job Readiness product
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
        { error: 'Forbidden: Student not enrolled in this Job Readiness assessment' },
        { status: 403 }
      );
    }

    // 7. Get Job Readiness tier configuration
    const { data: tierConfig, error: tierConfigError } = await supabase
      .from('job_readiness_products')
      .select('*')
      .eq('product_id', productData.id)
      .maybeSingle();

    if (tierConfigError && tierConfigError.code !== 'PGRST116') {
      console.error('Error fetching tier config:', tierConfigError);
      // Continue with default values
    }

    const defaultTierConfig = {
      bronze_assessment_min_score: 0,
      bronze_assessment_max_score: 60,
      silver_assessment_min_score: 61,
      silver_assessment_max_score: 80,
      gold_assessment_min_score: 81,
      gold_assessment_max_score: 100
    };

    const finalTierConfig = tierConfig || defaultTierConfig;

    // 8. Extract assessment configuration details
    const config = moduleData.configuration || {};
    const timeLimit = config.timeLimitMinutes || config.time_limit_minutes || null;
    const passingThreshold = config.passThreshold || config.passing_threshold || 60; // Default to 60%
    const instructions = config.instructions || null;

    // 9. Check if assessment has been submitted (check student_module_progress for Job Readiness)
    const { data: submissionData, error: submissionError } = await supabase
      .from('student_module_progress')
      .select('status, progress_percentage, completed_at, progress_details')
      .eq('student_id', studentId)
      .eq('module_id', validModuleId)
      .maybeSingle();

    if (submissionError && submissionError.code !== 'PGRST116') {
      console.error(`Error checking assessment submission for module ${validModuleId}:`, submissionError);
      // Continue - we'll assume not submitted
    }

    const isSubmitted = submissionData?.status === 'Completed';
    const retakesAllowed = config.retakesAllowed || config.retakes_allowed || true; // Default to true for Job Readiness

    // 10. Fetch Assessment Questions
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

    // 11. Fetch In-Progress Attempt if not submitted (use student_module_progress for Job Readiness)
    let inProgressAttempt: InProgressAttemptDetails | null = null;

    if (!isSubmitted && submissionData?.progress_details) {
      inProgressAttempt = {
        saved_answers: submissionData.progress_details.saved_answers || {},
        start_time: submissionData.progress_details.started_at || null,
        remaining_time_seconds: submissionData.progress_details.remaining_time_seconds || null
      };
    }

    // 12. Build and return response
    const responsePayload: JobReadinessAssessmentPageDataResponse = {
      assessment: {
        id: moduleData.id,
        name: moduleData.name,
        instructions,
        time_limit_minutes: timeLimit,
        passing_threshold: passingThreshold,
        questions,
        is_submitted: isSubmitted,
        retakes_allowed: retakesAllowed,
        tier_assessment_config: {
          bronze_min_score: finalTierConfig.bronze_assessment_min_score,
          bronze_max_score: finalTierConfig.bronze_assessment_max_score,
          silver_min_score: finalTierConfig.silver_assessment_min_score,
          silver_max_score: finalTierConfig.silver_assessment_max_score,
          gold_min_score: finalTierConfig.gold_assessment_min_score,
          gold_max_score: finalTierConfig.gold_assessment_max_score,
        },
        current_student_tier: studentRecord.job_readiness_tier,
        current_star_level: studentRecord.job_readiness_star_level,
      },
      in_progress_attempt: inProgressAttempt
    };

    return NextResponse.json(responsePayload);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/job-readiness/assessments/[moduleId]/details:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
} 
 