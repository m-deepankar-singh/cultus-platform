import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

// Define schemas for validation
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

const SubmissionSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  time_spent_seconds: z.number().optional(),
  started_at: z.string().optional(),
});

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

    // 2. Authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // 4. Get student information
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

    const studentId = user.id;
    const clientId = studentRecord.client_id;

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
        assessment_questions (
          id, 
          question_text, 
          question_type, 
          options,
          correct_answer
        )
      `)
      .eq('module_id', validModuleId);

    if (questionError) {
      console.error(`Error fetching questions for module ${validModuleId}:`, questionError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment questions', details: questionError.message },
        { status: 500 }
      );
    }

    // 10. Calculate score
    let correctAnswers = 0;
    const totalQuestions = questionData.length;

    for (const questionItem of questionData) {
      const question = questionItem.assessment_questions;
      if (!question) continue;

      const questionId = questionItem.question_id;
      const userAnswer = answers[questionId];
      const correctAnswer = (question as any).correct_answer;

      if (!userAnswer || !correctAnswer) continue;

      // Handle different question types based on correct_answer format
      if ((question as any).question_type === 'MCQ' || (question as any).question_type === 'TF') {
        // Single correct answer - could be string or { answer: "value" }
        const correctValue = typeof correctAnswer === 'string' 
          ? correctAnswer 
          : correctAnswer.answer || correctAnswer;
        
        if (userAnswer === correctValue) {
          correctAnswers++;
        }
      } else if ((question as any).question_type === 'MSQ') {
        // Multiple correct answers - could be array or { answers: [...] }
        let correctAnswersArray: string[] = [];
        
        if (Array.isArray(correctAnswer)) {
          correctAnswersArray = correctAnswer;
        } else if (correctAnswer.answers && Array.isArray(correctAnswer.answers)) {
          correctAnswersArray = correctAnswer.answers;
        }
        
        if (Array.isArray(userAnswer) && correctAnswersArray.length > 0) {
          const sortedUserAnswers = [...userAnswer].sort();
          const sortedCorrectAnswers = [...correctAnswersArray].sort();
          if (JSON.stringify(sortedUserAnswers) === JSON.stringify(sortedCorrectAnswers)) {
            correctAnswers++;
          }
        }
      }
    }

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passingThreshold = config.passThreshold || config.passing_threshold || 60;
    const passed = percentage >= passingThreshold;

    // 11. Get Job Readiness tier configuration
    const { data: tierConfig, error: tierConfigError } = await supabase
      .from('job_readiness_products')
      .select('*')
      .eq('product_id', productData.id)
      .maybeSingle();

    const defaultTierConfig = {
      bronze_assessment_min_score: 0,
      bronze_assessment_max_score: 60,
      silver_assessment_min_score: 61,
      silver_assessment_max_score: 80,
      gold_assessment_min_score: 81,
      gold_assessment_max_score: 100
    };

    const finalTierConfig = tierConfig || defaultTierConfig;

    // 12. Determine tier achieved based on score
    let tierAchieved: 'BRONZE' | 'SILVER' | 'GOLD' | null = null;
    
    if (percentage >= finalTierConfig.gold_assessment_min_score) {
      tierAchieved = 'GOLD';
    } else if (percentage >= finalTierConfig.silver_assessment_min_score) {
      tierAchieved = 'SILVER';
    } else if (percentage >= finalTierConfig.bronze_assessment_min_score) {
      tierAchieved = 'BRONZE';
    }

    // 13. Save submission to student_module_progress
    const progressDetails = {
      answers,
      score: percentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      tier_achieved: tierAchieved,
      time_spent_seconds,
      started_at,
      submitted_at: new Date().toISOString(),
    };

    const { data: submissionRecord, error: submissionError } = await supabase
      .from('student_module_progress')
      .upsert({
        student_id: studentId,
        module_id: validModuleId,
        status: 'Completed',
        progress_percentage: percentage,
        progress_details: progressDetails,
        completed_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
      .select('student_id, module_id')
      .single();

    if (submissionError) {
      console.error('Error saving submission:', submissionError);
      return NextResponse.json(
        { error: 'Failed to save submission', details: submissionError.message },
        { status: 500 }
      );
    }

    // 14. Update student's job readiness tier if improved
    let tierChanged = false;
    let starLevelUnlocked = false;
    
    const currentTier = studentRecord.job_readiness_tier;
    const currentStarLevel = studentRecord.job_readiness_star_level;

    // Tier hierarchy: BRONZE < SILVER < GOLD
    const tierHierarchy = { 'BRONZE': 1, 'SILVER': 2, 'GOLD': 3 };
    const currentTierLevel = tierHierarchy[currentTier as keyof typeof tierHierarchy] || 0;
    const achievedTierLevel = tierAchieved ? tierHierarchy[tierAchieved] : 0;

    if (achievedTierLevel > currentTierLevel) {
      tierChanged = true;
      
      // Update student's tier
      const { error: updateTierError } = await supabase
        .from('students')
        .update({
          job_readiness_tier: tierAchieved,
          job_readiness_last_updated: new Date().toISOString(),
        })
        .eq('id', studentId);

      if (updateTierError) {
        console.error('Error updating student tier:', updateTierError);
        // Continue - don't fail the submission
      }

      // Check if this unlocks Star 1 (first completion)
      if (!currentStarLevel || currentStarLevel === null) {
        starLevelUnlocked = true;
        
        const { error: updateStarError } = await supabase
          .from('students')
          .update({
            job_readiness_star_level: 'ONE',
            job_readiness_last_updated: new Date().toISOString(),
          })
          .eq('id', studentId);

        if (updateStarError) {
          console.error('Error updating student star level:', updateStarError);
          // Continue - don't fail the submission
        }
      }
    }

    // 15. Generate feedback
    let feedback = `Assessment completed with ${percentage}% (${correctAnswers}/${totalQuestions} correct). `;
    
    if (passed) {
      feedback += `Congratulations! You passed the assessment. `;
      if (tierAchieved) {
        feedback += `You achieved ${tierAchieved} tier performance. `;
      }
      if (tierChanged) {
        feedback += `Your Job Readiness tier has been upgraded to ${tierAchieved}! `;
      }
      if (starLevelUnlocked) {
        feedback += `You've unlocked Star Level ONE! `;
      }
    } else {
      feedback += `You need ${passingThreshold}% to pass. `;
      if (retakesAllowed) {
        feedback += `You can retake this assessment to improve your score. `;
      }
    }

    // 16. Return response
    const response: AssessmentSubmissionResponse = {
      success: true,
      score: correctAnswers,
      percentage,
      passed,
      tier_achieved: tierAchieved,
      tier_changed: tierChanged,
      star_level_unlocked: starLevelUnlocked,
      feedback,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      submission_id: `${submissionRecord.student_id}-${submissionRecord.module_id}`,
    };

    return NextResponse.json(response);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/job-readiness/assessments/[moduleId]/submit:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
} 