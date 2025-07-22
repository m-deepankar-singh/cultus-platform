'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache'; // May not be needed for save, but good practice if UI might reflect save state elsewhere
import { SELECTORS } from '@/lib/api/selectors';
import { validateServerActionSecurity } from '@/lib/security/server-action-security';

// Schema for input data when saving assessment progress
const AssessmentProgressSaveDataSchema = z.object({
  moduleId: z.string().uuid(),
  saved_answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  remaining_time_seconds: z.number().int().min(0).optional(), // Allow 0 for timer expired but not submitted
  timer_paused: z.boolean().optional(),
});

export type AssessmentProgressSaveData = z.infer<typeof AssessmentProgressSaveDataSchema>;

interface SaveAssessmentActionResult {
  success: boolean;
  message?: string;
  data?: { // Contains the saved assessment_progress record
    assessment_progress_id: string;
    student_id: string;
    module_id: string;
    saved_answers?: any | null;
    started_at: string;
    last_updated: string;
    submitted_at?: string | null;
    remaining_time_seconds?: number | null;
    timer_paused?: boolean | null;
    // Add other fields from assessment_progress if needed
  };
  error?: string;
  errorDetails?: any;
}

export async function saveAssessmentProgressAction(
  data: AssessmentProgressSaveData
): Promise<SaveAssessmentActionResult> {
  // Security validation
  const validation = await validateServerActionSecurity({
    requireAuth: true,
    requireCSRF: true,
    allowedRoles: ['Student'], // Only students can save assessment progress
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error || 'Security validation failed',
    };
  }

  // Progress saving is disabled - assessments must be completed in one session
  return {
    success: false,
    error: 'Progress saving is disabled. Please complete the assessment in one session.'
  };
}

// --- Submit Assessment Action ---

// Schema for input data when submitting an assessment
const AssessmentSubmissionDataSchema = z.object({
  moduleId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.union([z.string(), z.array(z.string())])), // question_id: answer
});

export type AssessmentSubmissionData = z.infer<typeof AssessmentSubmissionDataSchema>;

// Refined type using a discriminated union
type SuccessfulSubmitResult = {
  success: true;
  message?: string;
  score: number; 
  passed: boolean; 
  correct_answers: number; 
  total_questions: number; 
  submitted_at: string;
};

type FailedSubmitResult = {
  success: false;
  error: string;
  message?: string;
  errorDetails?: any;
};

export type SubmitAssessmentActionResult = SuccessfulSubmitResult | FailedSubmitResult;

// Type for question structure from DB for grading
type AssessmentQuestionWithCorrectAnswer = {
  question_id: string; 
  assessment_questions: {
    id: string; 
    question_text: string; 
    question_type: 'MCQ' | 'MSQ' | 'TF';
    options: { id: string; text: string }[] | null;
    correct_answer: { answer: string } | { answers: string[] } | string | string[] | null;
  } | null;
};

export async function submitAssessmentAction(
  data: AssessmentSubmissionData
): Promise<SubmitAssessmentActionResult> { 
  // Security validation
  const validation = await validateServerActionSecurity({
    requireAuth: true,
    requireCSRF: true,
    allowedRoles: ['Student'], // Only students can submit assessments
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error || 'Security validation failed',
    };
  }

  try {
    const validationResult = AssessmentSubmissionDataSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false, 
        error: 'Invalid input data for submission',
        errorDetails: validationResult.error.flatten(),
      };
    }
    const { moduleId, answers: submittedAnswers } = validationResult.data;
    const supabase = await createClient();
    const user = validation.user!;
    const studentId = user.id;

    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students').select('client_id, is_active').eq('id', studentId).single();
    if (studentFetchError) return { success: false, error: studentFetchError.code === 'PGRST116' ? 'Student record not found' : `DB error (student): ${studentFetchError.message}` };
    if (!studentRecord.is_active) return { success: false, error: 'Student account is inactive' };
    if (!studentRecord.client_id) return { success: false, error: 'Student not linked to a client' };

    const { data: moduleData, error: moduleFetchError } = await supabase
      .from('modules')
      .select(`
        id, 
        type, 
        configuration,
        module_product_assignments!inner(product_id)
      `)
      .eq('id', moduleId)
      .single();
      
    if (moduleFetchError) return { success: false, error: moduleFetchError.code === 'PGRST116' ? 'Module not found' : `DB error (module): ${moduleFetchError.message}` };
    if (!moduleData) return { success: false, error: 'Module data not found after fetch.' }; 
    if (moduleData.type !== 'Assessment') return { success: false, error: 'Module is not an assessment' };
    if (!moduleData.module_product_assignments?.length) return { success: false, error: 'Module not assigned to any product' };

    const productId = moduleData.module_product_assignments[0].product_id;

    const { count, error: enrollmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', studentRecord.client_id)
      .eq('product_id', productId);
    if (enrollmentError) return { success: false, error: `Error checking enrollment: ${enrollmentError.message}` };
    if (count === 0) return { success: false, error: 'Student not enrolled in this assessment' };

    // Check if assessment has already been submitted (no retakes allowed)
    const { data: existingSubmission, error: submissionCheckError } = await supabase
      .from('assessment_submissions')
      .select('student_id, assessment_id')
      .eq('student_id', studentId)
      .eq('assessment_id', moduleId)
      .maybeSingle();

    if (submissionCheckError && submissionCheckError.code !== 'PGRST116') {
      console.error('Error checking existing submission:', submissionCheckError);
      return { 
        success: false, 
        error: 'Error checking existing submission', 
        errorDetails: { 
          message: submissionCheckError.message, 
          code: submissionCheckError.code, 
          details: submissionCheckError.details 
        } 
      };
    }

    if (existingSubmission) {
      return { success: false, error: 'Assessment already submitted. Retakes are not allowed.' };
    }
    
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
      .eq('module_id', moduleId)
      .returns<AssessmentQuestionWithCorrectAnswer[]>();

    if (questionError || !questionData) {
      console.error('Error fetching or no questions for grading:', questionError);
      return { success: false, error: 'Error fetching questions for grading or no questions found.' };
    }
    const questions = questionData.filter(q => q.assessment_questions !== null);
    const totalQuestions = questions.length;
    if (totalQuestions === 0) {
      return { success: false, error: 'No questions found for this assessment' };
    }
    let correctAnswers = 0;
    questions.forEach(question => {
      const questionId = question.question_id;
      const assessmentQuestion = question.assessment_questions!;
      const submittedAnswer = submittedAnswers[questionId];
      if (submittedAnswer === undefined) return;
      let isCorrect = false;
      switch (assessmentQuestion.question_type) {
        case 'MCQ':
          const correctMCQ = typeof assessmentQuestion.correct_answer === 'string' 
            ? assessmentQuestion.correct_answer 
            : (assessmentQuestion.correct_answer as any)?.answer || '';
          isCorrect = submittedAnswer === correctMCQ;
          break;
        case 'MSQ':
          let correctMSQ: string[] = [];
          if (Array.isArray(assessmentQuestion.correct_answer)) {
            correctMSQ = assessmentQuestion.correct_answer;
          } else if (typeof assessmentQuestion.correct_answer === 'object' && 
                    assessmentQuestion.correct_answer !== null &&
                    Array.isArray((assessmentQuestion.correct_answer as any).answers)) {
            correctMSQ = (assessmentQuestion.correct_answer as any).answers;
          }
          const submittedMSQAnswers = Array.isArray(submittedAnswer) ? submittedAnswer : [submittedAnswer].flat();
          isCorrect = correctMSQ.length === submittedMSQAnswers.length &&
                      submittedMSQAnswers.every(ans => correctMSQ.includes(ans));
          break;
        case 'TF':
          const correctTF = typeof assessmentQuestion.correct_answer === 'string' 
            ? assessmentQuestion.correct_answer 
            : String((assessmentQuestion.correct_answer as any)?.answer || '');
          isCorrect = submittedAnswer === correctTF;
          break;
      }
      if (isCorrect) correctAnswers++;
    });
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const config = moduleData.configuration || {};
    const passingThreshold = config.passingThreshold || config.passing_threshold || 60;
    const passed = score >= passingThreshold;
    const submissionTime = new Date().toISOString();

    // Record the assessment submission (no progress saving, direct submission only)
    const { error: progressInsertError } = await supabase
      .from('assessment_progress')
      .insert({
        student_id: studentId,
        module_id: moduleId,
        submitted_at: submissionTime,
        score,
        passed,
        answers: submittedAnswers,
        started_at: submissionTime,
        last_updated: submissionTime,
      });

    if (progressInsertError) {
      console.error('Error recording assessment submission:', progressInsertError);
      return { success: false, error: 'Failed to record assessment submission.' };
    }
    
    // Record in assessment_submissions table (no retakes allowed - insert only)
    const { error: submissionError } = await supabase
      .from('assessment_submissions')
      .insert({
        student_id: studentId,
        assessment_id: moduleId,
        score: score,
        passed: passed,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        submitted_at: submissionTime,
      });

    if (submissionError) {
      console.error('Error inserting into assessment_submissions:', submissionError);
      
      // Try using admin client if regular client fails
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminSupabase = createAdminClient();
        
        await adminSupabase
          .from('assessment_submissions')
          .insert({
            student_id: studentId,
            assessment_id: moduleId,
            score: score,
            passed: passed,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            submitted_at: submissionTime,
          });
      } catch (adminError) {
        console.error('Failed to insert using admin client:', adminError);
        // Not a fatal error - assessment_progress was recorded successfully
        console.warn('Assessment recorded in progress table but failed to sync to submissions table');
      }
    }
    
    await supabase
      .from('student_module_progress')
      .upsert({
        student_id: studentId,
        module_id: moduleId,
        status: 'Completed', // Always mark as Completed when submitted
        score,
        progress_percentage: 100,
        last_updated: submissionTime,
        completed_at: submissionTime // Always update completed_at since submission is complete
      }, { onConflict: 'student_id, module_id' });

    // Handle Job Readiness progression if this is a job readiness assessment
    await handleJobReadinessProgression(supabase, studentId, moduleId, score, passed);

    revalidatePath('/app/dashboard');
    revalidatePath(`/app/assessment/${moduleId}`);
    revalidatePath(`/app/assessment/${moduleId}/take`);
    // Also revalidate product details page where the modal is used
    revalidatePath(`/app/product-details/${productId}`);

    return {
      success: true,
      score: Math.round(score),
      passed,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      submitted_at: submissionTime,
    };

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in submitAssessmentAction:', error);
    return { success: false, error: 'An unexpected error occurred during submission.', errorDetails: { name: error.name, message: error.message, stack: error.stack } };
  }
}

/**
 * Handle Job Readiness progression when assessment is completed
 */
async function handleJobReadinessProgression(
  supabase: any,
  studentId: string,
  moduleId: string,
  score: number,
  passed: boolean
) {
  try {
    // Check if this is a job readiness assessment
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(`
        id,
        type,
        module_product_assignments!inner (
          product_id,
          products!inner (
            id,
            type
          )
        )
      `)
      .eq('id', moduleId)
      .eq('type', 'Assessment')
      .eq('module_product_assignments.products.type', 'JOB_READINESS')
      .maybeSingle();

    if (moduleError || !moduleData) {
      // Not a job readiness assessment, skip progression
      return;
    }

    const productId = moduleData.module_product_assignments[0].product_id;

    // Get job readiness tier configuration
    const { data: tierConfig, error: tierConfigError } = await supabase
      .from('job_readiness_products')
      .select('*')
      .eq('product_id', productId)
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

    // Determine tier based on score
    let tierAchieved: 'BRONZE' | 'SILVER' | 'GOLD' | null = null;
    if (passed) {
      if (score >= finalTierConfig.gold_assessment_min_score) {
        tierAchieved = 'GOLD';
      } else if (score >= finalTierConfig.silver_assessment_min_score) {
        tierAchieved = 'SILVER';
      } else if (score >= finalTierConfig.bronze_assessment_min_score) {
        tierAchieved = 'BRONZE';
      }
    }

    // Get current student data
    const { data: currentStudentData, error: studentDataError } = await supabase
      .from('students')
      .select('job_readiness_star_level, job_readiness_tier')
      .eq('id', studentId)
      .single();

    if (studentDataError) {
      console.error('Error fetching current student job readiness data:', studentDataError);
      return;
    }

    const currentStarLevel = currentStudentData?.job_readiness_star_level;
    
    // Check if student should get their first star and tier (either from this submission or existing completions)
    if (!currentStarLevel) {
      // Check all completed assessments for this job readiness product
      const { data: completedAssessments, error: completedError } = await supabase
        .from('modules')
        .select(`
          id,
          module_product_assignments!inner (
            product_id
          ),
          student_module_progress!inner (
            status,
            progress_percentage,
            progress_details,
            completed_at
          )
        `)
        .eq('module_product_assignments.product_id', productId)
        .eq('type', 'Assessment')
        .eq('student_module_progress.student_id', studentId)
        .eq('student_module_progress.status', 'Completed');

      if (!completedError && completedAssessments && completedAssessments.length > 0) {
        // Calculate average score from all completed assessments
        let totalScore = 0;
        let assessmentCount = 0;
        let hasPassedAssessment = false;

        for (const assessment of completedAssessments) {
          const progressData = assessment.student_module_progress[0];
          if (progressData?.progress_percentage !== undefined) {
            totalScore += progressData.progress_percentage;
            assessmentCount++;
            
            // Check if this assessment passed (60% or higher by default)
            if (progressData.progress_percentage >= 60) {
              hasPassedAssessment = true;
            }
          }
        }

        // Award star and tier if student has completed at least one assessment
        if (assessmentCount > 0) {
          const averageScore = totalScore / assessmentCount;
          
          // Determine tier based on average score
          let finalTierAchieved: 'BRONZE' | 'SILVER' | 'GOLD' = 'BRONZE'; // Default to BRONZE for any completion
          if (averageScore >= finalTierConfig.gold_assessment_min_score) {
            finalTierAchieved = 'GOLD';
          } else if (averageScore >= finalTierConfig.silver_assessment_min_score) {
            finalTierAchieved = 'SILVER';
          } else if (averageScore >= finalTierConfig.bronze_assessment_min_score) {
            finalTierAchieved = 'BRONZE';
          }

          // Always award first star and tier for any completed assessment
          const updateData = {
            job_readiness_star_level: 'ONE',
            job_readiness_tier: finalTierAchieved,
            job_readiness_last_updated: new Date().toISOString(),
          };
          
          const { error: updateError } = await supabase
            .from('students')
            .update(updateData)
            .eq('id', studentId);

          if (updateError) {
            console.error('Error updating student job readiness progression:', updateError);
          } else {
            console.log(`Job readiness progression updated for student ${studentId}: Star ONE, Tier ${finalTierAchieved} (retroactive based on ${assessmentCount} completed assessments, avg score: ${Math.round(averageScore)}%)`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in handleJobReadinessProgression:', error);
    // Don't throw error to avoid breaking the main assessment submission
  }
} 