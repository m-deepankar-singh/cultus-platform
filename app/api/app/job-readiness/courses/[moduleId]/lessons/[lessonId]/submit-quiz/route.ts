import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateQuizForLesson, getFallbackQuestions } from '@/lib/ai/quiz-generator';

const QuizSubmissionAnswerSchema = z.object({
  question_id: z.string(),
  selected_option_id: z.string().optional(),
  selected_option_ids: z.array(z.string()).optional(),
  question_type: z.enum(['MCQ', 'MSQ']).default('MCQ'),
}).refine(data => {
  // Ensure that we have either selected_option_id (for MCQ) or selected_option_ids (for MSQ)
  if (data.question_type === 'MCQ') {
    return !!data.selected_option_id;
  } else if (data.question_type === 'MSQ') {
    return !!data.selected_option_ids && data.selected_option_ids.length > 0;
  }
  return false;
}, {
  message: "MCQ questions must have selected_option_id, MSQ questions must have selected_option_ids array"
});

const QuizSubmissionSchema = z.object({
  answers: z.array(QuizSubmissionAnswerSchema),
});

// Define interfaces for quiz questions
interface QuizOption {
  id: string;
  text: string;
}

// Add a specific type for MSQ answers
interface MSQAnswer {
  answers: string[];
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: QuizOption[];
  correct_option_id?: string;
  correct_answer?: string | MSQAnswer; // Updated to use the MSQ answer interface
  text?: string; // Alternative field name sometimes used
  question_type?: string;
}

interface AssessmentQuestion {
  id: string;
  question_text: string;
  options: QuizOption[];
  correct_answer: string | MSQAnswer; // Updated to use the MSQ answer interface
  question_type: string;
}

interface QuestionBankMapping {
  question_id: string;
  sequence: number;
  is_fallback: boolean;
  is_required: boolean;
  assessment_questions: AssessmentQuestion;
}

// Same cache as in content route - ideally share this or use a proper cache service
// TODO: Replace with a more robust caching mechanism if needed (e.g., Redis)
const serverSideQuizCache = new Map<string, { questions: QuizQuestion[], studentId: string, moduleId: string, lessonId: string, timestamp: number, is_fallback?: boolean }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (same as in content route)
const QUIZ_PASSING_CRITERIA_CORRECT = 4;
const QUIZ_TOTAL_QUESTIONS = 5;

export async function POST(
  request: NextRequest,
  { params }: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const { moduleId, lessonId } = params;
    if (!moduleId || !lessonId) {
      return NextResponse.json({ error: 'Module ID and Lesson ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const submissionValidation = QuizSubmissionSchema.safeParse(body);
    if (!submissionValidation.success) {
      return NextResponse.json(
        { error: 'Invalid submission format', details: submissionValidation.error.format() },
        { status: 400 }
      );
    }

    const studentAnswers = submissionValidation.data.answers;

    // Get the student tier for this user
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, job_readiness_tier')
      .eq('user_id', user.id)
      .maybeSingle();

    let studentTier = 'beginner'; // Default tier
    let studentId = user.id; // Default to user ID if student record not found
    
    if (!studentError && studentData) {
      if (studentData.job_readiness_tier) {
        studentTier = studentData.job_readiness_tier;
      }
      if (studentData.id) {
        studentId = studentData.id;
      }
    }

    // 1. Retrieve the full quiz (with correct answers) from the server-side cache or regenerate
    const cacheKey = `quiz_${moduleId}_${lessonId}_${user.id}`;
    const cachedQuizData = serverSideQuizCache.get(cacheKey);

    // First query to get lesson info to determine quiz type and prompt
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('quiz_questions, quiz_data')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .single();

    if (lessonError) {
      console.error(`Error fetching lesson data for lesson ${lessonId}:`, lessonError);
      return NextResponse.json({ error: 'Failed to fetch lesson details' }, { status: 500 });
    }

    const lessonConfig = lessonData?.quiz_data as any || {};
    const quizGenerationPrompt = lessonConfig?.quiz_generation_prompt as string | null;
    let usedFallbackQuestions = false;

    let fullQuizQuestions: QuizQuestion[] = [];

    // Valid cached quiz exists and is not expired
    if (cachedQuizData && (Date.now() - cachedQuizData.timestamp < CACHE_TTL_MS)) {
      if (cachedQuizData.studentId !== user.id || cachedQuizData.moduleId !== moduleId || cachedQuizData.lessonId !== lessonId) {
        // This should ideally not happen if cacheKey is unique enough, but as a safeguard:
        return NextResponse.json({ error: 'Quiz cache mismatch. Please refresh and try again.' }, { status: 400 });
      }
      fullQuizQuestions = cachedQuizData.questions;
      usedFallbackQuestions = cachedQuizData.is_fallback === true;
      console.log(`Using cached quiz for grading submission for lesson ${lessonId}`);
    }
    // No cache or expired cache, determine quiz source
    else {
      // First check for predefined quiz questions
      if (lessonData?.quiz_questions && Array.isArray(lessonData.quiz_questions) && lessonData.quiz_questions.length > 0) {
        fullQuizQuestions = lessonData.quiz_questions as QuizQuestion[];
      }
      // Then check if we should use AI-generated questions
      else if (quizGenerationPrompt) {
        try {
          // Regenerate the same quiz with the identical prompt and settings
          // Critical: Use isDeterministicAttempt=true to ensure identical generation
          const regeneratedQuestions = await generateQuizForLesson(
            lessonId,
            moduleId,
            studentTier as 'beginner' | 'intermediate' | 'advanced',
            true // This is a deterministic attempt (for grading)
          );
          
          if (!regeneratedQuestions || regeneratedQuestions.length === 0) {
            throw new Error('Failed to regenerate quiz questions for grading');
          }
          
          fullQuizQuestions = regeneratedQuestions;
          console.log(`Successfully regenerated AI quiz for grading submission for lesson ${lessonId}`);
        } catch (error) {
          console.error(`Error regenerating AI quiz for grading lesson ${lessonId}:`, error);
          console.log(`Falling back to question bank for grading lesson ${lessonId}`);
          
          // Get fallback questions from question bank
          const fallbackQuestions = await getFallbackQuestions(lessonId, supabase);
          
          if (fallbackQuestions && fallbackQuestions.length > 0) {
            fullQuizQuestions = fallbackQuestions;
            usedFallbackQuestions = true;
            console.log(`Using ${fallbackQuestions.length} fallback questions for grading lesson ${lessonId}`);
          } else {
            return NextResponse.json({ error: 'Failed to retrieve quiz questions for grading. Please try again.' }, { status: 500 });
          }
        }
      }
      // Finally, try fallback questions from question bank
      else {
        const fallbackQuestions = await getFallbackQuestions(lessonId, supabase);
        
        if (fallbackQuestions && fallbackQuestions.length > 0) {
          fullQuizQuestions = fallbackQuestions;
          usedFallbackQuestions = true;
          console.log(`Using ${fallbackQuestions.length} fallback questions for grading lesson ${lessonId}`);
        }
      }
      
      // If we still don't have questions, return an error
      if (fullQuizQuestions.length === 0) {
        serverSideQuizCache.delete(cacheKey); // Clean up expired entry
        return NextResponse.json({ error: 'Quiz questions not found. Please refresh and try again.' }, { status: 404 });
      }
    }

    // 2. Grade the submission
    let score = 0;
    const correctAnswersForReview: { question_id: string; correct_option_id: string; correct_option_ids?: string[] }[] = [];

    for (const studentAnswer of studentAnswers) {
      const question = fullQuizQuestions.find(q => q.id === studentAnswer.question_id);
      if (question) {
        // Handle both MCQ and MSQ question types
        let isCorrect = false;
        const questionType = question.question_type || 'MCQ';
        
        if (questionType === 'MCQ') {
          // MCQ - Single answer checking
          if (question.correct_option_id && studentAnswer.selected_option_id) {
            isCorrect = question.correct_option_id === studentAnswer.selected_option_id;
          } else if (question.correct_answer && studentAnswer.selected_option_id) {
            if (typeof question.correct_answer === 'string') {
              isCorrect = question.correct_answer === studentAnswer.selected_option_id;
            }
          }
          
          // Record correct answer for MCQ
          let correctOptionId = '';
          if (question.correct_option_id) {
            correctOptionId = question.correct_option_id;
          } else if (question.correct_answer && typeof question.correct_answer === 'string') {
            correctOptionId = question.correct_answer;
          }
          
          correctAnswersForReview.push({ 
            question_id: question.id, 
            correct_option_id: correctOptionId
          });
        } else if (questionType === 'MSQ') {
          // MSQ - Multiple answer checking
          if (studentAnswer.selected_option_ids && studentAnswer.selected_option_ids.length > 0) {
            if (question.correct_answer && typeof question.correct_answer !== 'string') {
              // For MSQ, all selected options must be correct and all correct options must be selected
              const correctAnswers = (question.correct_answer as MSQAnswer).answers;
              
              // Check if arrays have same elements (order doesn't matter)
              const studentSelection = [...studentAnswer.selected_option_ids].sort();
              const correctSelection = [...correctAnswers].sort();
              
              isCorrect = studentSelection.length === correctSelection.length && 
                          studentSelection.every((value, index) => value === correctSelection[index]);
            }
          }
          
          // Record correct answers for MSQ
          let correctOptionIds: string[] = [];
          if (question.correct_answer && typeof question.correct_answer !== 'string') {
            correctOptionIds = (question.correct_answer as MSQAnswer).answers;
          }
          
          correctAnswersForReview.push({ 
            question_id: question.id, 
            correct_option_id: correctOptionIds[0] || '', // For backward compatibility
            correct_option_ids: correctOptionIds // New field for MSQ
          });
        }
        
        if (isCorrect) {
          score++;
        }
      }
    }

    const passed = score >= QUIZ_PASSING_CRITERIA_CORRECT;

    // Fetch module info to get product_id for job_readiness_course_quiz_attempts
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('product_id')
      .eq('id', moduleId)
      .single();

    if (moduleError) {
      console.error('Error fetching module product_id:', moduleError);
      return NextResponse.json({ error: 'Failed to record quiz attempt' }, { status: 500 });
    }

    // 3. Save the quiz attempt in job_readiness_course_quiz_attempts (if needed)
    // First check if this is a job readiness product
    const { data: jrProduct, error: jrProductError } = await supabase
      .from('job_readiness_products')
      .select('id')
      .eq('product_id', moduleData.product_id)
      .maybeSingle();

    // Only log to job_readiness_course_quiz_attempts if this is a job readiness product
    if (jrProduct) {
      // Record the quiz attempt in job_readiness_course_quiz_attempts
      await supabase
        .from('job_readiness_course_quiz_attempts')
        .insert({
          student_id: studentId,
          course_module_id: moduleId,
          lesson_id: lessonId,
          tier_used: studentTier,
          questions: fullQuizQuestions,
          answers: studentAnswers,
          score: score,
          passed: passed,
          submission_time: new Date().toISOString(),
          used_fallback_questions: usedFallbackQuestions
        });
    }

    // 4. Update student's lesson progress in standard student_module_progress
    // Fetch existing progress or initialize
    const { data: existingProgress, error: fetchProgressError } = await supabase
      .from('student_module_progress')
      .select('progress_details')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (fetchProgressError && fetchProgressError.code !== 'PGRST116') {
      console.error('Error fetching existing progress for quiz update:', fetchProgressError);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    let currentProgressDetails = existingProgress?.progress_details as any || {};
    let lessonQuizResults = currentProgressDetails.lesson_quiz_results || {};
    let lessonAttempts = lessonQuizResults[lessonId]?.attempts || 0;

    lessonQuizResults[lessonId] = {
      score: score,
      passed: passed,
      attempts: lessonAttempts + 1, // Increment attempt count
      last_attempted_at: new Date().toISOString(),
    };

    const updatedProgressDetails = {
      ...currentProgressDetails,
      lesson_quiz_results: lessonQuizResults,
      // Optionally update overall course completion status if this quiz was the last requirement
    };
    
    // If this quiz passes, mark the lesson as completed if it was the main blocker
    if (passed) {
        updatedProgressDetails.completed_lesson_ids = [
            ...(currentProgressDetails.completed_lesson_ids || []),
            lessonId
        ];
        // Remove duplicates if any, though ideally IDs are unique
        updatedProgressDetails.completed_lesson_ids = [...new Set(updatedProgressDetails.completed_lesson_ids)];
    }

    // Insert or update progress record
    const { error: upsertError } = await supabase
      .from('student_module_progress')
      .upsert({
        student_id: user.id,
        module_id: moduleId,
        progress_details: updatedProgressDetails,
      })
      .eq('student_id', user.id)
      .eq('module_id', moduleId);

    if (upsertError) {
      console.error('Error updating progress after quiz:', upsertError);
      return NextResponse.json({ error: 'Failed to save quiz results' }, { status: 500 });
    }
    
    // Clear the quiz from cache after submission to prevent replay with same questions
    serverSideQuizCache.delete(cacheKey);

    return NextResponse.json({
      score: score,
      total_questions: fullQuizQuestions.length,
      passed: passed,
      correct_answers_for_review: correctAnswersForReview.map(answer => {
        // For MSQ questions, ensure we return the correct_option_ids array
        if (answer.correct_option_ids && answer.correct_option_ids.length > 0) {
          return {
            question_id: answer.question_id,
            correct_option_id: answer.correct_option_id,
            correct_option_ids: answer.correct_option_ids,
            question_type: 'MSQ'
          };
        }
        // For MCQ questions, maintain backward compatibility
        return {
          question_id: answer.question_id,
          correct_option_id: answer.correct_option_id,
          question_type: 'MCQ'
        };
      }),
    });

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/job-readiness/.../submit-quiz:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
} 