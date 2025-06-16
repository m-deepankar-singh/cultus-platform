import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Define schemas for validation
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

const SubmissionSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  time_spent_seconds: z.number().optional(),
  started_at: z.string().optional(),
});

// Type for question data from database
interface QuestionData {
  question_id: string;
  sequence: number;
  assessment_questions: {
    id: string;
    question_text: string;
    question_type: 'MCQ' | 'MSQ' | 'TF';
    options: { id: string; text: string }[];
    correct_answer: any;
  } | null;
}

interface AssessmentSubmissionResponse {
  success: boolean;
  score: number;
  percentage: number;
  passed: boolean;
  tier_achieved?: 'BRONZE' | 'SILVER' | 'GOLD' | null;
  tier_changed?: boolean;
  star_level_unlocked?: boolean;
  feedback: string;
  correct_answers: number;
  total_questions: number;
  submission_id: string;
}

export async function POST(
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

    // 2. JWT-based authentication (replaces getUser() + student record lookup)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // 3. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = SubmissionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid submission data',
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { answers, time_spent_seconds, started_at } = validation.data;

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
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

    // 5. Fetch Assessment Module Details (must be Job Readiness assessment)
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

    // 6. Verify this is a Job Readiness product
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

    // 7. Verify enrollment
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

    // 8. Check if already submitted (for retakes handling)
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('status, progress_percentage, progress_details')
      .eq('student_id', studentId)
      .eq('module_id', validModuleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error checking existing progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to check submission status', details: progressError.message },
        { status: 500 }
      );
    }

    const config = moduleData.configuration || {};
    const retakesAllowed = config.retakesAllowed || config.retakes_allowed || true;

    if (existingProgress?.status === 'Completed' && !retakesAllowed) {
      return NextResponse.json(
        { error: 'Assessment already submitted and retakes are not allowed' },
        { status: 409 }
      );
    }

    // 9. Fetch assessment questions with correct answers
    const { data: questionData, error: questionError } = await supabase
      .from('assessment_module_questions')
      .select(`
        question_id,
        sequence,
        assessment_questions (
          id,
          question_text,
          question_type,
          options,
          correct_answer
        )
      `)
      .eq('module_id', validModuleId)
      .order('sequence', { ascending: true });

    if (questionError) {
      console.error(`Error fetching questions for assessment ${validModuleId}:`, questionError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment questions', details: questionError.message },
        { status: 500 }
      );
    }

    // Process questions and calculate score
    const questions = (questionData || []).filter((q: QuestionData) => q.assessment_questions !== null);
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    if (totalQuestions === 0) {
      return NextResponse.json(
        { error: 'No questions found for this assessment' },
        { status: 404 }
      );
    }

    // Calculate score
    for (const questionEntry of questions) {
      const question = questionEntry.assessment_questions!;
      const studentAnswer = answers[question.id];
      const correctAnswer = question.correct_answer;

      if (studentAnswer && correctAnswer) {
        // Handle different question types
        if (question.question_type === 'MCQ' || question.question_type === 'TF') {
          // Single correct answer
          if (studentAnswer === correctAnswer) {
            correctAnswers++;
          }
        } else if (question.question_type === 'MSQ') {
          // Multiple correct answers - compare arrays
          const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer.sort() : [studentAnswer].sort();
          const correctAnswers_arr = Array.isArray(correctAnswer) ? correctAnswer.sort() : [correctAnswer].sort();
          
          if (JSON.stringify(studentAnswers) === JSON.stringify(correctAnswers_arr)) {
            correctAnswers++;
          }
        }
      }
    }

    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const passingThreshold = config.passing_threshold || config.passingThreshold || 60;
    const passed = percentage >= passingThreshold;

    // 10. Get Job Readiness tier configuration and determine tier
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

    // Determine tier achieved based on score
    let tierAchieved: 'BRONZE' | 'SILVER' | 'GOLD' | null = null;
    if (percentage >= finalTierConfig.gold_assessment_min_score) {
      tierAchieved = 'GOLD';
    } else if (percentage >= finalTierConfig.silver_assessment_min_score) {
      tierAchieved = 'SILVER';
    } else if (percentage >= finalTierConfig.bronze_assessment_min_score) {
      tierAchieved = 'BRONZE';
    }

    // Get current tier from JWT claims
    const currentTier = claims.job_readiness_tier;
    const tierChanged = currentTier !== tierAchieved;

    // 11. Create submission record in student_module_progress
    const submissionId = crypto.randomUUID();
    const submissionData = {
      student_id: studentId,
      module_id: validModuleId,
      status: 'Completed',
      progress_percentage: percentage,
      completed_at: new Date().toISOString(),
      progress_details: {
        submission_id: submissionId,
        answers: answers,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        score_percentage: percentage,
        tier_achieved: tierAchieved,
        time_spent_seconds: time_spent_seconds,
        started_at: started_at,
        submitted_at: new Date().toISOString(),
      },
      last_updated: new Date().toISOString()
    };

    const { error: submissionError } = await supabase
      .from('student_module_progress')
      .upsert(submissionData, { 
        onConflict: 'student_id,module_id',
        ignoreDuplicates: false 
      });

    if (submissionError) {
      console.error('Error saving assessment submission:', submissionError);
      return NextResponse.json(
        { error: 'Failed to save assessment submission', details: submissionError.message },
        { status: 500 }
      );
    }

    // 12. Update student tier if tier changed and it's higher
    let starLevelUnlocked = false;
    if (tierChanged && tierAchieved) {
      // Only update if new tier is "higher" than current tier
      const tierOrder = { 'BRONZE': 1, 'SILVER': 2, 'GOLD': 3 };
      const currentTierOrder = currentTier ? tierOrder[currentTier as keyof typeof tierOrder] : 0;
      const newTierOrder = tierOrder[tierAchieved];

      if (newTierOrder > currentTierOrder) {
        const { error: tierUpdateError } = await supabase
          .from('students')
          .update({ 
            job_readiness_tier: tierAchieved,
            updated_at: new Date().toISOString()
          })
          .eq('id', studentId);

        if (tierUpdateError) {
          console.error('Error updating student tier:', tierUpdateError);
          // Continue - don't fail the whole submission
        }
      }
    }

    // 13. Check if student should get their first star (after completing ALL assessments)
    // Check the current database state, not JWT claims which might be stale
    const { data: currentStudentData, error: studentDataError } = await supabase
      .from('students')
      .select('job_readiness_star_level')
      .eq('id', studentId)
      .single();

    if (studentDataError) {
      console.error('Error fetching current student star level:', studentDataError);
    }

    const currentStarLevel = currentStudentData?.job_readiness_star_level;
    
    // Only check for first star if student doesn't have one yet and assessment passed
    if (passed && !currentStarLevel) {
      // Check if ALL assessments for this product are now completed
      const { data: completedAssessments, error: completedCountError } = await supabase
        .from('modules')
        .select(`
          id,
          student_module_progress!inner (
            status
          )
        `)
        .eq('product_id', productData.id)
        .eq('type', 'Assessment')
        .eq('student_module_progress.student_id', studentId)
        .eq('student_module_progress.status', 'Completed');

      // Get total assessment count for this product
      const { count: totalAssessmentCount, error: totalCountError } = await supabase
        .from('modules')
        .select('id', { count: 'exact' })
        .eq('product_id', productData.id)
        .eq('type', 'Assessment');

      if (!completedCountError && !totalCountError) {
        const completedCount = completedAssessments?.length || 0;
        const totalCount = totalAssessmentCount || 0;
        
        console.log(`Assessment completion check: ${completedCount}/${totalCount} assessments completed for product ${productData.id}`);
        
        // Award first star if ALL assessments are completed
        if (completedCount === totalCount && totalCount > 0) {
          console.log(`🌟 Student ${studentId} completed all ${totalCount} assessments. Awarding first star!`);
          
          const { error: starUpdateError } = await supabase
            .from('students')
            .update({
              job_readiness_star_level: 'ONE',
              job_readiness_last_updated: new Date().toISOString(),
            })
            .eq('id', studentId);

          if (!starUpdateError) {
            starLevelUnlocked = true;
            console.log('🎉 Successfully awarded first star for completing all assessments!');
          } else {
            console.error('Error updating student star level:', starUpdateError);
          }
        } else {
          console.log(`Student ${studentId} completed ${completedCount}/${totalCount} assessments. First star will be awarded when all are complete.`);
        }
      } else {
        console.error('Error checking assessment completion:', { completedCountError, totalCountError });
      }
    } else if (currentStarLevel) {
      console.log(`Student ${studentId} already has star level ${currentStarLevel}, skipping star awarding logic.`);
    }

    // 14. Generate feedback
    let feedback = '';
    if (passed) {
      feedback = `Congratulations! You scored ${percentage}% and passed the assessment.`;
      if (tierAchieved) {
        feedback += ` You have achieved ${tierAchieved} tier.`;
      }
      if (starLevelUnlocked) {
        feedback += ` You have unlocked a new star level!`;
      }
    } else {
      feedback = `You scored ${percentage}%. The passing threshold is ${passingThreshold}%. Please review the material and try again.`;
    }

    const response: AssessmentSubmissionResponse = {
      success: true,
      score: correctAnswers,
      percentage: percentage,
      passed: passed,
      tier_achieved: tierAchieved,
      tier_changed: tierChanged,
      star_level_unlocked: starLevelUnlocked,
      feedback: feedback,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      submission_id: submissionId,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in Job Readiness assessment submission:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 