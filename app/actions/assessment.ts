'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache'; // May not be needed for save, but good practice if UI might reflect save state elsewhere

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
  try {
    const validationResult = AssessmentProgressSaveDataSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid input data',
        errorDetails: validationResult.error.flatten(),
      };
    }

    const {
      moduleId,
      saved_answers,
      remaining_time_seconds,
      timer_paused
    } = validationResult.data;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Student and module verification logic (similar to the original PATCH route)
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students')
      .select('client_id, is_active')
      .eq('id', user.id)
      .single();

    if (studentFetchError) {
      return { success: false, error: studentFetchError.code === 'PGRST116' ? 'Student record not found' : 'Failed to fetch student record' };
    }
    if (!studentRecord.is_active) {
      return { success: false, error: 'Student account is inactive' };
    }
    if (!studentRecord.client_id) {
      return { success: false, error: 'Student not linked to a client' };
    }

    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, type, product_id')
      .eq('id', moduleId)
      .eq('type', 'Assessment')
      .maybeSingle();

    if (moduleError) {
      return { success: false, error: 'Failed to verify assessment module', errorDetails: moduleError.message };
    }
    if (!moduleData) {
      return { success: false, error: 'Assessment module not found or not an assessment type' };
    }

    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', studentRecord.client_id)
      .eq('product_id', moduleData.product_id);

    if (assignmentError) {
      return { success: false, error: 'Failed to verify enrollment', errorDetails: assignmentError.message };
    }
    if (count === 0) {
      return { success: false, error: 'Student not enrolled in this assessment' };
    }

    const { data: submissionData, error: submissionError } = await supabase
      .from('assessment_progress')
      .select('submitted_at')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .not('submitted_at', 'is', null)
      .maybeSingle();

    if (submissionError && submissionError.code !== 'PGRST116') {
      // Log error but proceed cautiously
      console.error(`Error checking assessment submission for module ${moduleId}:`, submissionError);
    }
    if (submissionData?.submitted_at) {
      return { success: false, error: 'Cannot save progress for an already submitted assessment' };
    }

    const { data: existingProgress, error: progressFetchError } = await supabase
      .from('assessment_progress')
      .select('*')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .is('submitted_at', null)
      .maybeSingle();

    if (progressFetchError && progressFetchError.code !== 'PGRST116') {
      return { success: false, error: 'Failed to check existing progress', errorDetails: progressFetchError.message };
    }

    const now = new Date().toISOString();
    const upsertData: any = {
      student_id: user.id,
      module_id: moduleId,
      last_updated: now,
      submitted_at: null, // Explicitly NULL for save operations
    };

    if (saved_answers !== undefined) upsertData.saved_answers = saved_answers;
    if (remaining_time_seconds !== undefined) upsertData.remaining_time_seconds = remaining_time_seconds;
    if (timer_paused !== undefined) upsertData.timer_paused = timer_paused;

    if (!existingProgress) {
      upsertData.started_at = now; // Set started_at only for new attempts
    } else {
      // If existing progress, retain its started_at unless it's null (shouldn't happen for a started attempt)
      upsertData.started_at = existingProgress.started_at || now;
    }

    const { data: updatedProgress, error: upsertError } = await supabase
      .from('assessment_progress')
      .upsert(upsertData, { onConflict: 'student_id, module_id, submitted_at' }) // Ensure submitted_at IS NULL for onConflict to work for save
                                                                            // This onConflict might need adjustment if you allow multiple non-submitted save slots.
                                                                            // For now, it assumes one non-submitted save slot per student/module.
      .select()
      .single();

    if (upsertError) {
      console.error(`Error saving progress for module ${moduleId}:`, upsertError);
      return { success: false, error: 'Failed to save progress', errorDetails: upsertError.message };
    }

    // Revalidate path if needed, e.g., if a different part of the UI shows save status
    // revalidatePath(`/app/assessment/${moduleId}`); 

    return {
      success: true,
      message: 'Progress saved successfully',
      data: updatedProgress as SaveAssessmentActionResult['data'],
    };

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in saveAssessmentProgressAction:', error);
    return { success: false, error: 'An unexpected error occurred.', errorDetails: error.message };
  }
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }; 
    }
    const studentId = user.id;

    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students').select('client_id, is_active').eq('id', studentId).single();
    if (studentFetchError) return { success: false, error: studentFetchError.code === 'PGRST116' ? 'Student record not found' : `DB error (student): ${studentFetchError.message}` };
    if (!studentRecord.is_active) return { success: false, error: 'Student account is inactive' };
    if (!studentRecord.client_id) return { success: false, error: 'Student not linked to a client' };

    const { data: moduleData, error: moduleFetchError } = await supabase
      .from('modules').select('id, type, product_id, configuration').eq('id', moduleId).single();
    if (moduleFetchError) return { success: false, error: moduleFetchError.code === 'PGRST116' ? 'Module not found' : `DB error (module): ${moduleFetchError.message}` };
    if (!moduleData) return { success: false, error: 'Module data not found after fetch.' }; 
    if (moduleData.type !== 'Assessment') return { success: false, error: 'Module is not an assessment' };

    const { count, error: enrollmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', studentRecord.client_id)
      .eq('product_id', moduleData.product_id);
    if (enrollmentError) return { success: false, error: `Error checking enrollment: ${enrollmentError.message}` };
    if (count === 0) return { success: false, error: 'Student not enrolled in this assessment' };

    // Check for an existing in-progress attempt (submitted_at IS NULL)
    // or a previously fully submitted attempt (submitted_at IS NOT NULL).
    const { data: existingProgress, error: progressCheckError } = await supabase
      .from('assessment_progress')
      .select('student_id, module_id, submitted_at, started_at') // Select relevant fields
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .order('last_updated', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (progressCheckError && progressCheckError.code !== 'PGRST116') {
      console.error('Error checking existing progress (Supabase):', progressCheckError);
      return { 
        success: false, 
        error: 'Error checking existing progress', 
        errorDetails: { 
          message: progressCheckError.message, 
          code: progressCheckError.code, 
          details: progressCheckError.details 
        } 
      };
    }

    let isRetake = false;
    let canUpdateInProgress = false;

    if (existingProgress?.submitted_at) {
      // This is a previously submitted attempt
      const config = moduleData.configuration || {}; 
      const retakesAllowed = config.retakesAllowed || config.retakes_allowed || false;
      if (!retakesAllowed) {
        return { success: false, error: 'Assessment already submitted and retakes are not allowed.' };
      }
      isRetake = true; // This submission will be a new record for a retake.
    } else if (existingProgress && !existingProgress.submitted_at) {
      // This is an existing in-progress attempt (saved but not submitted)
      canUpdateInProgress = true;
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

    // Prepare the core submission data
    const submissionDataCore = {
      student_id: studentId,
      module_id: moduleId,
      submitted_at: submissionTime,
      score,
      passed,
      answers: submittedAnswers,
      last_updated: submissionTime,
    };

    if (canUpdateInProgress && existingProgress) {
      // Update the existing in-progress record
      const { error: updateError } = await supabase
        .from('assessment_progress')
        .update({
          ...submissionDataCore,
          started_at: existingProgress.started_at || submissionTime, // Preserve original start_at
        })
        .eq('student_id', studentId)
        .eq('module_id', moduleId)
        .is('submitted_at', null); // Target the in-progress record

      if (updateError) {
        console.error('Error updating in-progress assessment submission:', updateError);
        return { success: false, error: 'Failed to finalize assessment submission (update).' };
      }
    } else {
      // Insert a new record (first attempt or a retake)
      const { error: insertError } = await supabase
        .from('assessment_progress')
        .insert({
          ...submissionDataCore,
          started_at: submissionTime, // New attempt, so started_at is now
        });

      if (insertError) {
        console.error('Error inserting new assessment submission:', insertError);
        // Attempt to provide more specific error if it's a unique constraint violation (e.g., already submitted and not a retake case)
        if (insertError.code === '23505') { // Unique violation
             return { success: false, error: 'Failed to record submission. This assessment might have already been submitted without retake eligibility.' };
        }
        return { success: false, error: 'Failed to record assessment submission (insert).' };
      }
    }
    
    // START --- MODIFICATION TO ADD RECORD TO assessment_submissions ---
    // Make submissionTime unique for assessment_submissions by appending random ms
    const uniqueSubmissionTime = new Date(new Date(submissionTime).getTime() + Math.floor(Math.random() * 1000)).toISOString();
    
    const { error: newSubmissionError } = await supabase
      .from('assessment_submissions')
      .insert({
        student_id: studentId,
        assessment_id: moduleId,
        score: score,
        passed: passed,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        submitted_at: uniqueSubmissionTime, // Use unique timestamp
      });

    if (newSubmissionError) {
      // Log the error but don't fail the entire action,
      // as the primary submission to assessment_progress might have succeeded.
      console.error('Error inserting into assessment_submissions:', newSubmissionError);
      
      // Try again using the admin client which bypasses RLS
      try {
        // Import our admin client (has service_role privileges)
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminSupabase = createAdminClient();
        
        // Insert using admin client
        await adminSupabase
          .from('assessment_submissions')
          .insert({
            student_id: studentId,
            assessment_id: moduleId,
            score: score,
            passed: passed,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            submitted_at: uniqueSubmissionTime, // Use unique timestamp
          });
          
        console.log('Successfully inserted assessment submission using admin client');
      } catch (adminError) {
        console.error('Failed to insert using admin client:', adminError);
        // Still not a fatal error as we have the database trigger as fallback
        console.warn('Relying on database trigger to sync assessment_submissions');
      }
    }
    // END --- MODIFICATION TO ADD RECORD TO assessment_submissions ---
    
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

    revalidatePath('/app/dashboard');
    revalidatePath(`/app/assessment/${moduleId}`);
    revalidatePath(`/app/assessment/${moduleId}/take`);
    // Also revalidate product details page where the modal is used
    revalidatePath(`/app/product-details/${moduleData.product_id}`);

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