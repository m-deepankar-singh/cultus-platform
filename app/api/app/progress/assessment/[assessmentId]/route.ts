import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { AssessmentSubmissionSchema } from '@/lib/schemas/progress';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Define a schema for UUID validation (reuse or define locally)
const UuidSchema = z.string().uuid({ message: 'Invalid Assessment ID format' });

/**
 * POST handler for submitting assessment answers.
 * - Validates input.
 * - Authenticates and authorizes the student.
 * - Fetches assessment details.
 * - Verifies student enrollment.
 * - Calculates the score.
 * - Records the attempt.
 * - Returns the submission result.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    // 1. Validate Route Parameter (assessmentId)
    const resolvedParams = await params;
    const assessmentIdValidation = UuidSchema.safeParse(resolvedParams.assessmentId);
    if (!assessmentIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Assessment ID format', details: assessmentIdValidation.error.flatten().formErrors },
        { status: 400 },
      );
    }
    const assessmentId = assessmentIdValidation.data; // Use validated ID

    // 2. Parse and Validate Request Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
    }

    const bodyValidation = AssessmentSubmissionSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid request body', details: bodyValidation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    // Use validated submission data
    const submissionData = bodyValidation.data;

    // 3. 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
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
        { error: 'Forbidden: Student not associated with a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

    // 4. Fetch Assessment & Correct Answers
    // Assuming 'assessments' table has 'id', 'module_id', and 'questions' (JSONB) columns
    // 'questions' JSONB structure assumed: [{ id: string, type: string, ..., correctAnswer: string | string[] }, ...]
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('module_id, questions')
      .eq('id', assessmentId)
      .maybeSingle(); // Handle cases where assessment might not exist

    if (assessmentError) {
      console.error('Error fetching assessment:', assessmentError);
      return NextResponse.json({ error: 'Internal Server Error fetching assessment data' }, { status: 500 });
    }

    if (!assessment) {
      return NextResponse.json({ error: 'Not Found: Assessment does not exist' }, { status: 404 });
    }

    // Validate the structure of assessment.questions if necessary, especially correct answers
    if (!assessment.module_id || !assessment.questions || !Array.isArray(assessment.questions)) {
      console.error(`Assessment ${assessmentId} is missing module_id or questions array.`);
      return NextResponse.json({ error: 'Internal Server Error: Invalid assessment configuration' }, { status: 500 });
    }

    const moduleId = assessment.module_id;
    const correctAnswers = assessment.questions; // Contains array of question objects with answers

    // 5. Verify Enrollment (Requires product_id from module)
    // 5a. Get product_id from module
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('product_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (moduleError) {
      console.error('Error fetching module for enrollment check:', moduleError);
      return NextResponse.json({ error: 'Internal Server Error fetching module data' }, { status: 500 });
    }
    if (!moduleData || !moduleData.product_id) {
        // This case should ideally not happen if assessment.module_id is a valid FK, but good to check
      console.error(`Module ${moduleId} linked to assessment ${assessmentId} not found or has no product.`);
      return NextResponse.json({ error: 'Internal Server Error: Inconsistent assessment/module link' }, { status: 500 });
    }
    const productId = moduleData.product_id;

    // 5b. Check client assignment to the product
    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (assignmentError) {
      console.error('Error checking product assignment for assessment:', assignmentError);
      return NextResponse.json({ error: 'Internal Server Error checking enrollment' }, { status: 500 });
    }
    if (count === null || count === 0) {
      return NextResponse.json(
        { error: 'Forbidden: Student is not enrolled in the product containing this assessment' },
        { status: 403 },
      );
    }

    console.log('Enrollment verified for assessment:', assessmentId);

    // 6. Calculate Score
    const submittedAnswers = submissionData.answers;
    // Type assertion for clarity, assuming questions array structure with id and correctAnswer
    const questions = assessment.questions as Array<{ id: string; correctAnswer: string | string[] }>;

    let correctCount = 0;
    const totalQuestions = questions.length;

    if (totalQuestions === 0) {
        console.warn(`Assessment ${assessmentId} has no questions. Score set to 0.`);
    } else {
        for (const question of questions) {
            const questionId = question.id;
            const correctAnswer = question.correctAnswer;
            const submittedAnswer = submittedAnswers[questionId]; // Might be undefined

            if (submittedAnswer !== undefined) {
                if (Array.isArray(correctAnswer) && Array.isArray(submittedAnswer)) {
                    // Simple array comparison (order matters)
                    // TODO: Consider order-independent comparison (sort arrays first)
                    if (correctAnswer.length === submittedAnswer.length &&
                        correctAnswer.every((val, index) => val === submittedAnswer[index])) {
                        correctCount++;
                    }
                } else if (!Array.isArray(correctAnswer) && !Array.isArray(submittedAnswer)) {
                    // Simple string/value comparison
                    if (correctAnswer === submittedAnswer) {
                        correctCount++;
                    }
                }
                // Mismatched types (array vs non-array) are considered incorrect
            }
            // Undefined submittedAnswer is considered incorrect
        }
    }

    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    console.log(`Score calculated for assessment ${assessmentId}: ${scorePercentage}% (${correctCount}/${totalQuestions})`);

    // 7. Upsert Attempt
    const attemptData = {
        student_id: studentId,
        assessment_id: assessmentId,
        score: scorePercentage,
        answers_submitted: submissionData.answers, // Store the submitted answers
        duration_seconds: submissionData.duration_seconds, // Optional from schema
        // submitted_at is assumed to default to NOW() in the database schema
    };

    const { error: upsertError } = await supabase
        .from('student_assessment_attempts')
        .upsert(attemptData, { onConflict: 'student_id, assessment_id' }); // Specify conflict target

    if (upsertError) {
        console.error('Error saving assessment attempt:', upsertError);
        // Provide more context if possible, e.g., check for FK constraint issues
        return NextResponse.json({ error: 'Internal Server Error saving attempt' }, { status: 500 });
    }

    console.log(`Assessment attempt recorded for student ${studentId}, assessment ${assessmentId}`);

    // 7b. (Optional) Update Module Progress if Assessment Score is 100%
    if (scorePercentage === 100) {
        const moduleProgressData = {
            student_id: studentId,
            module_id: moduleId, // Fetched earlier
            status: 'Completed' as const,
            // score: scorePercentage, // Decide if module score should be updated too
            // updated_at defaults to NOW()
        };

        const { error: moduleUpsertError } = await supabase
            .from('student_module_progress')
            .upsert(moduleProgressData, { onConflict: 'student_id, module_id' });

        if (moduleUpsertError) {
            // Log the error but proceed; assessment submission is the primary goal
            console.error(`Failed to update module ${moduleId} progress to Completed for student ${studentId}:`, moduleUpsertError);
        } else {
            console.log(`Module ${moduleId} marked as Completed for student ${studentId} due to 100% assessment score.`);
        }
    }

    // 8. Return Result
    return NextResponse.json(
        {
            message: 'Assessment submitted successfully',
            score: scorePercentage,
            correctCount: correctCount,
            totalQuestions: totalQuestions,
        },
        { status: 200 }, // Use 200 OK for successful submission
    );

  } catch (error) {
    console.error('Unexpected Error in POST /assessment/[assessmentId]:', error);

    // Check if the error is a Zod validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Bad Request: Validation failed', details: error.flatten() },
        { status: 400 },
      );
    }
    // Generic error response
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}