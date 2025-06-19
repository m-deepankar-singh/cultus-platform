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
  context: { params: Promise<{ moduleId: string }> }
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

    // 2. JWT-based authentication (replaces getUser() + student record lookup)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Check if student account is active (from JWT claims)
    if (!claims.profile_is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 }
      );
    }

    // Get client_id from JWT claims instead of database lookup
    const clientId = claims.client_id;
    if (!clientId) {
      console.error(`Student ${user.id} has no assigned client_id in JWT claims.`);
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

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

    // Get student tier and star level from JWT claims instead of database query
    const currentStudentTier = claims.job_readiness_tier || null;
    const currentStarLevel = claims.job_readiness_star_level || null;

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

    // 8. Get assessment questions for this module WITHOUT correct answers for security
    const { data: questionsData, error: questionsError } = await supabase
      .from('assessment_module_questions')
      .select(`
        question_id,
        sequence,
        assessment_questions (
          id,
          question_text,
          question_type,
          options
        )
      `)
      .eq('module_id', validModuleId)
      .order('sequence', { ascending: true });

    if (questionsError) {
      console.error(`Error fetching questions for assessment ${validModuleId}:`, questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment questions', details: questionsError.message },
        { status: 500 }
      );
    }

    // Filter out questions where assessment_questions is null and map to expected format
    const formattedQuestions: AssessmentQuestionOutput[] = (questionsData || [])
      .filter((q: QuestionData) => q.assessment_questions !== null)
      .map((q: QuestionData) => {
        const question = q.assessment_questions!;
        return {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          options: Array.isArray(question.options) ? question.options : [],
          // Note: We deliberately exclude correct_answer for security
        };
      });

    // 9. Check if assessment has been submitted and get in-progress details
    const { data: progressData, error: progressError } = await supabase
      .from('student_module_progress')
      .select('status, progress_percentage, progress_details, completed_at')
      .eq('student_id', studentId)
      .eq('module_id', validModuleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error checking assessment progress:', progressError);
      // Continue with default (not submitted) state
    }

    const isSubmitted = progressData?.status === 'Completed';

    // Extract configuration values
    const config = moduleData.configuration || {};
    const instructions = config.instructions || null;
    const timeLimitMinutes = config.time_limit_minutes || config.timeLimitMinutes || null;
    const passingThreshold = config.passing_threshold || config.passingThreshold || null;
    const retakesAllowed = config.retakes_allowed || config.retakesAllowed !== false; // Default to true

    // Create tier assessment config
    const finalTierConfig = tierConfig || defaultTierConfig;
    const tierAssessmentConfig = {
      bronze_min_score: finalTierConfig.bronze_assessment_min_score,
      bronze_max_score: finalTierConfig.bronze_assessment_max_score,
      silver_min_score: finalTierConfig.silver_assessment_min_score,
      silver_max_score: finalTierConfig.silver_assessment_max_score,
      gold_min_score: finalTierConfig.gold_assessment_min_score,
      gold_max_score: finalTierConfig.gold_assessment_max_score,
    };

    // Prepare in-progress attempt details
    let inProgressAttempt: InProgressAttemptDetails | null = null;
    if (progressData?.status === 'InProgress' && progressData.progress_details) {
      const details = progressData.progress_details as any;
      inProgressAttempt = {
        saved_answers: details.saved_answers || {},
        start_time: details.started_at || null,
        remaining_time_seconds: details.remaining_time_seconds || null,
      };
    }

    const assessmentDetails: JobReadinessAssessmentDetailsOutput = {
      id: moduleData.id,
      name: moduleData.name,
      instructions,
      time_limit_minutes: timeLimitMinutes,
      passing_threshold: passingThreshold,
      questions: formattedQuestions,
      is_submitted: isSubmitted,
      retakes_allowed: retakesAllowed,
      tier_assessment_config: tierAssessmentConfig,
      current_student_tier: currentStudentTier,
      current_star_level: currentStarLevel,
    };

    const response: JobReadinessAssessmentPageDataResponse = {
      assessment: assessmentDetails,
      in_progress_attempt: inProgressAttempt,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in Job Readiness assessment details endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 
 