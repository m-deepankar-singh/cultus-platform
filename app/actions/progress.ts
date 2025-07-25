'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server'; // Assuming this is the server client
import { revalidatePath } from 'next/cache';
import { validateServerActionSecurity } from '@/lib/security/server-action-security';

// Define the schema for the input data, similar to CourseProgressUpdatePayload
const CourseProgressUpdateSchema = z.object({
  moduleId: z.string().uuid(),
  current_lesson_id: z.string().uuid().optional(),
  current_lesson_sequence: z.number().int().min(0).optional(),
  video_playback_position: z.number().min(0).finite().optional(), // Ensure no NaN or Infinity
  status: z.enum(['NotStarted', 'InProgress', 'Completed']).optional(),
  progress_percentage: z.number().int().min(0).max(100).finite().optional(), // Ensure no NaN or Infinity
  lessonVideoIdCompleted: z.string().uuid().optional(), // For marking a video as fully watched
  lesson_quiz_submission: z.object({ // For submitting in-lesson quiz results
    lessonId: z.string().uuid(),
    answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])), // Student's answers
    // score: z.number().optional(), // Score calculation might happen here or be a separate step
    time_taken_seconds: z.number().min(0).finite().optional(), // Optional: time taken in seconds, ensure no NaN
  }).optional(),
});

export type CourseProgressUpdateData = z.infer<typeof CourseProgressUpdateSchema>;

interface ActionResult {
  success: boolean;
  message?: string;
  data?: { // Can be more specific, e.g., the updated progress record
    student_module_progress: any; // The full student_module_progress record
    quiz_result?: { // Specific result for the quiz if one was submitted
      lessonId: string;
      score: number;
      total_questions_in_quiz: number;
      pass_fail_status: 'passed' | 'failed';
      answers: Record<string, string | string[]>;
      submitted_at: string;
    }
  }; 
  error?: string;
  errorDetails?: any;
}

// Interface for the raw quiz question structure from the 'lessons' table
interface RawQuizQuestion {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TF';
  options: { id: string; text: string }[];
  correct_answer: string | string[]; // string for MCQ/TF, string[] for MSQ
  // Add other fields if they exist in your DB, e.g., points, explanation
}

export async function updateCourseProgressAction(
  data: CourseProgressUpdateData
): Promise<ActionResult> {
  // Security validation
  const validation = await validateServerActionSecurity({
    requireAuth: true,
    requireCSRF: true,
    allowedRoles: ['Student'], // Only students can update their own progress
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error || 'Security validation failed',
    };
  }

  try {
    // Validate input data with Zod
    const validationResult = CourseProgressUpdateSchema.safeParse(data);
    if (!validationResult.success) {
      console.error('Zod validation failed for course progress update:', {
        data,
        errors: validationResult.error.flatten()
      });
      return {
        success: false,
        error: 'Invalid input data',
        errorDetails: validationResult.error.flatten(),
      };
    }

    const {
      moduleId,
      current_lesson_id,
      current_lesson_sequence,
      video_playback_position,
      status,
      progress_percentage,
      lessonVideoIdCompleted,
      lesson_quiz_submission,
    } = validationResult.data;

    const supabase = await createClient();
    const user = validation.user!

    // Verify the module exists and is a course
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, type')
      .eq('id', moduleId)
      .eq('type', 'Course')
      .maybeSingle();

    if (moduleError && moduleError.code !== 'PGRST116') {
      console.error(`Error verifying module ${moduleId} in Server Action:`, moduleError);
      return { success: false, error: 'Failed to verify course module', errorDetails: moduleError.message };
    }

    if (!moduleData) {
      return { success: false, error: 'Course module not found or not a course type' };
    }

    // Get current progress record if it exists
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('*') // Select all to get existing progress_details and status
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error(`Error fetching progress for module ${moduleId}, student ${user.id} in Server Action:`, progressError);
      return { success: false, error: 'Failed to check existing progress', errorDetails: progressError.message };
    }

    // Build the progress_details JSONB object, merging with existing if any
    const progress_details: Record<string, any> = {
      ...(existingProgress?.progress_details || {}),
    };
    if (current_lesson_sequence !== undefined) progress_details.last_viewed_lesson_sequence = current_lesson_sequence;
    if (current_lesson_id !== undefined) progress_details.current_lesson_id_temp = current_lesson_id; // Temp holder, might be overwritten by quiz logic or explicit completion
    if (video_playback_position !== undefined) progress_details.video_playback_position = video_playback_position;

    if (lessonVideoIdCompleted) {
      const fullyWatched: string[] = progress_details.fully_watched_video_ids || [];
      if (!fullyWatched.includes(lessonVideoIdCompleted)) {
        fullyWatched.push(lessonVideoIdCompleted);
      }
      progress_details.fully_watched_video_ids = fullyWatched;
      // If a video for a lesson is completed, we can consider this lesson ID for `last_completed_lesson_id`
      // This is a simple way to mark lesson completion. More complex logic might involve quiz scores.
      // progress_details.last_completed_lesson_id = lessonVideoIdCompleted; // This will be set if quiz is passed, or if no quiz.
    }
    
    let quiz_result_for_response: {
      lessonId: string;
      score: number;
      total_questions_in_quiz: number;
      pass_fail_status: 'passed' | 'failed';
      answers: Record<string, string | string[]>;
      submitted_at: string;
    } | undefined = undefined;

    if (lesson_quiz_submission) {
      // Fetch the lesson to get quiz_questions with correct_answers
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('quiz_questions')
        .eq('id', lesson_quiz_submission.lessonId)
        .maybeSingle();

      if (lessonError || !lessonData || !lessonData.quiz_questions) {
        console.error(`Error fetching lesson or quiz questions for lesson ${lesson_quiz_submission.lessonId}:`, lessonError);
        return { success: false, error: 'Failed to fetch lesson details for quiz grading.' };
      }

      const rawQuizQuestions = lessonData.quiz_questions as RawQuizQuestion[];
      let score = 0;
      const total_questions_in_quiz = rawQuizQuestions.length; // Use actual number of questions

      // --- GRADING LOGIC ---
      rawQuizQuestions.forEach((question, index) => {
        const studentAnswer = lesson_quiz_submission.answers[question.id];
        if (studentAnswer === undefined) return; // Question not answered

        if (question.question_type === 'MCQ' || question.question_type === 'TF') {
          if (studentAnswer === question.correct_answer) {
            score++;
          }
        } else if (question.question_type === 'MSQ') {
          // Handle different correct_answer formats that could be in the database
          let correctAnswerArray: string[] = [];
          
          if (Array.isArray(question.correct_answer)) {
            if (question.correct_answer.length > 0 && typeof question.correct_answer[0] === 'object' && question.correct_answer[0] !== null) {
              // Format: [{"answers":["opt_a","opt_b",...]}]
              const answerObj = question.correct_answer[0] as any;
              if (answerObj.answers && Array.isArray(answerObj.answers)) {
                correctAnswerArray = answerObj.answers;
              }
            } else {
              // Format: ["opt_a", "opt_b", ...]
              correctAnswerArray = question.correct_answer as string[];
            }
          } else if (typeof question.correct_answer === 'object' && question.correct_answer !== null) {
            // Format: {"answers":["opt_a","opt_b",...]}
            const answerObj = question.correct_answer as any;
            if (answerObj.answers && Array.isArray(answerObj.answers)) {
              correctAnswerArray = answerObj.answers;
            }
          } else if (typeof question.correct_answer === 'string') {
            // Format: Single string (shouldn't happen for MSQ but handle it)
            correctAnswerArray = [question.correct_answer];
          }
          
          const studentAnswerArray = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
          
          // For MSQ, all correct options must be selected and no incorrect options.
          // The order shouldn't matter, just that all correct options are selected.
          const hasCorrectLength = studentAnswerArray.length === correctAnswerArray.length;
          const allStudentAnswersAreCorrect = studentAnswerArray.every(answer => correctAnswerArray.includes(answer));
          const allCorrectAnswersSelected = correctAnswerArray.every(answer => studentAnswerArray.includes(answer));
          
          const isCorrect = hasCorrectLength && allStudentAnswersAreCorrect && allCorrectAnswersSelected;
            
          if (isCorrect) {
            score++;
          }
        }
      });
      // --- END GRADING LOGIC ---

      // As per plan: 5 questions, 4 to pass.
      // We use total_questions_in_quiz now. For a 5q quiz, pass threshold is 4.
      // For a dynamic threshold, it could be e.g., Math.ceil(total_questions_in_quiz * 0.8)
      const pass_threshold = total_questions_in_quiz > 0 ? Math.max(1, Math.ceil(total_questions_in_quiz * 0.8) -1) : 0; // e.g. 4/5 -> (0.8*5)-1=3 -> score >=4
                                                                                                                    // if we mean 80% for general case, then it is Math.ceil(total_questions_in_quiz * 0.8)
                                                                                                                    // Plan states "4/5 to pass" which is specific.
                                                                                                                    // If fixed 5 questions: pass_threshold = 4. For now, let's be more flexible for grading part but stick to pass criteria
      const questionsToPass = 4; // Fixed as per plan for a 5-question quiz.
      const pass_fail_status = score >= questionsToPass ? 'passed' : 'failed';

      const attempts = progress_details.lesson_quiz_attempts || {};
      const lessonAttempts = attempts[lesson_quiz_submission.lessonId] || [];
      const newAttempt = {
        answers: lesson_quiz_submission.answers,
        score,
        total_questions_in_quiz, // Store total questions for context
        pass_fail_status,
        time_taken_seconds: lesson_quiz_submission.time_taken_seconds,
        submitted_at: new Date().toISOString(),
      };
      lessonAttempts.push(newAttempt);
      attempts[lesson_quiz_submission.lessonId] = lessonAttempts;
      progress_details.lesson_quiz_attempts = attempts;

      quiz_result_for_response = {
        lessonId: lesson_quiz_submission.lessonId,
        score,
        total_questions_in_quiz,
        pass_fail_status,
        answers: lesson_quiz_submission.answers,
        submitted_at: newAttempt.submitted_at,
      };

      if (pass_fail_status === 'passed') {
        progress_details.last_completed_lesson_id = lesson_quiz_submission.lessonId;
      }
    } else if (lessonVideoIdCompleted && !progress_details.lesson_quiz_attempts?.[lessonVideoIdCompleted]?.some((att: any) => att.pass_fail_status === 'passed')) {
      // If only video is completed and there's no quiz or quiz not passed yet for this lesson,
      // mark video completion as lesson completion for now for lessons without quizzes or quizzes not yet passed.
      // This allows `isLessonConsideredComplete` to work for video-only lessons or pre-quiz-pass state.
      // If a quiz exists for this lesson, `last_completed_lesson_id` will be overwritten if/when the quiz is passed.
      
      // Check if this lesson actually has a quiz
       const { data: lessonForCompletionCheck, error: lessonCheckError } = await supabase
        .from('lessons')
        .select('quiz_questions')
        .eq('id', lessonVideoIdCompleted)
        .maybeSingle();

       if (lessonCheckError) {
         console.error(`Error checking lesson ${lessonVideoIdCompleted} for quiz presence:`, lessonCheckError);
         // Proceed cautiously or return error
       }

      const hasQuiz = lessonForCompletionCheck?.quiz_questions && (lessonForCompletionCheck.quiz_questions as any[]).length > 0;

      if (!hasQuiz) {
        progress_details.last_completed_lesson_id = lessonVideoIdCompleted;
      }
    }
    
    // Clean up temp field logic needs to be aware of quiz pass status for completion
    if (progress_details.current_lesson_id_temp && progress_details.current_lesson_id_temp !== progress_details.last_completed_lesson_id) {
        // If no specific completion event happened for this current_lesson_id_temp, don't set it as last_completed
    } else if (!progress_details.last_completed_lesson_id && progress_details.current_lesson_id_temp) {
        // If no other completion event, and only current_lesson_id was passed (e.g. manual marking)
        progress_details.last_completed_lesson_id = progress_details.current_lesson_id_temp;
    }
    delete progress_details.current_lesson_id_temp;

    // Prepare the data to upsert
    // Initial status determination (will be potentially overridden by overall course completion check)
    let current_status = status; // Use incoming status if provided
    if (!current_status && !existingProgress?.status) {
      current_status = 'InProgress'; // Default for new progress
    } else if (!current_status && existingProgress?.status) {
      current_status = existingProgress.status; // Keep existing if no new one provided
    }

    let current_progress_percentage = progress_percentage; // Use incoming if provided
    if (current_progress_percentage === undefined && existingProgress?.progress_percentage !== undefined) {
      current_progress_percentage = existingProgress.progress_percentage;
    } else if (current_progress_percentage === undefined) {
      current_progress_percentage = 0; // Default for new progress if not specified
    }


    // --- Check for Overall Course Completion ---
    const { data: allLessonsForModule, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, quiz_questions') // Need quiz_questions to check if a quiz exists
      .eq('module_id', moduleId);

    if (lessonsError) {
      console.error(`Error fetching all lessons for module ${moduleId} to check completion:`, lessonsError);
      // Don't fail the whole action, but log it. Proceed with current status.
    } else if (allLessonsForModule && allLessonsForModule.length > 0) {
      let allLessonsCompleted = true;
      for (const lesson of allLessonsForModule) {
        const isVideoWatched = progress_details.fully_watched_video_ids?.includes(lesson.id) ?? false;
        let isQuizPassedOrNotApplicable = true;
        
        const lessonHasQuiz = lesson.quiz_questions && (lesson.quiz_questions as any[]).length > 0;
        if (lessonHasQuiz) {
          const attemptsForLesson = progress_details.lesson_quiz_attempts?.[lesson.id];
          isQuizPassedOrNotApplicable = attemptsForLesson?.some((att: any) => att.pass_fail_status === 'passed') ?? false;
        }

        if (!(isVideoWatched && isQuizPassedOrNotApplicable)) {
          allLessonsCompleted = false;
          break;
        }
      }

      if (allLessonsCompleted) {
        current_status = 'Completed';
        current_progress_percentage = 100;
      }
    }
    // --- End Course Completion Check ---

    const upsertData: any = {
      student_id: user.id,
      module_id: moduleId,
      progress_details,
      last_updated: new Date().toISOString(),
      status: current_status, // Use the determined status
      progress_percentage: current_progress_percentage, // Use the determined percentage
    };

    // Only update status if provided, otherwise keep existing or default to InProgress
    // if (status) {
    //   upsertData.status = status;
    // } else if (!existingProgress?.status) {
    //   upsertData.status = 'InProgress';
    // }

    // Only update progress_percentage if provided
    // if (progress_percentage !== undefined) {
    //   upsertData.progress_percentage = progress_percentage;
    // }

    // If status is being set to "Completed", also set completed_at timestamp
    if (upsertData.status === 'Completed') {
      upsertData.completed_at = new Date().toISOString();
    } else if (existingProgress?.completed_at && upsertData.status !== 'Completed') {
      // If changing status from Completed to something else, clear completed_at
      upsertData.completed_at = null;
    }

    // Upsert the progress record
    const { data: updatedProgress, error: upsertError } = await supabase
      .from('student_module_progress')
      .upsert(upsertData)
      .select()
      .single();

    if (upsertError) {
      console.error(`Error updating progress for module ${moduleId}, student ${user.id} in Server Action:`, upsertError);
      return { success: false, error: 'Failed to update progress', errorDetails: upsertError.message };
    }

    // Revalidate the path for the course page if needed, or related dashboard paths
    revalidatePath(`/app/course/${moduleId}`);
    revalidatePath('/app/dashboard'); // Assuming progress on dashboard might change

    return { 
      success: true, 
      message: 'Progress updated successfully', 
      data: { 
        student_module_progress: updatedProgress,
        quiz_result: quiz_result_for_response 
      } 
    };

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in updateCourseProgressAction:', error);
    return { success: false, error: 'An unexpected error occurred.', errorDetails: error.message };
  }
} 