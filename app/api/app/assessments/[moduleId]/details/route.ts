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

    // 🚀 PERFORMANCE BREAKTHROUGH: Single database function call
    // Replaces 6+ sequential queries with one optimized query
    const { data: assessmentData, error: assessmentError } = await supabase
      .rpc('get_assessment_details_with_progress', {
        p_student_id: studentId,
        p_module_id: validModuleId
      });

    if (assessmentError) {
      console.error(`Error fetching assessment details for module ${validModuleId}:`, assessmentError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment details', details: assessmentError.message },
        { status: 500 }
      );
    }

    // Handle case where function returns error object
    if (assessmentData?.error) {
      if (assessmentData.message === 'Assessment not found or access denied') {
        return NextResponse.json(
          { error: 'Assessment module not found or access denied' },
          { status: 404 }
        );
      }
      console.error('Database function error:', assessmentData.message);
      return NextResponse.json(
        { error: 'Failed to process assessment data', details: assessmentData.message },
        { status: 500 }
      );
    }

    // The function returns the complete response structure
    const response: AssessmentPageDataResponse = {
      assessment: assessmentData.assessment,
      in_progress_attempt: assessmentData.in_progress_attempt
    };

    return NextResponse.json(response, {
      headers: {
        'X-Performance-Optimized': 'true',
        'X-Query-Count': '1',
        'X-Generated-At': (assessmentData.generated_at || Date.now()).toString()
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/app/assessments/[moduleId]/details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 