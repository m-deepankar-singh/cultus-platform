
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

// Schema for quiz submission validation
const QuizSubmissionSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string(),
    selected_option_id: z.union([z.string(), z.array(z.string())]) // Support both single and multiple selections
  }))
});

const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });
const LessonIdSchema = z.string().uuid({ message: 'Invalid Lesson ID format' });

interface QuizSubmissionResponse {
  success: boolean;
  score: number;
  total_questions: number;
  passed: boolean;
  passing_threshold: number;
  detailed_results: Array<{
    question_id: string;
    correct: boolean;
    selected_answer: string | string[];
    correct_answer: string | string[];
  }>;
  attempts: number;
  can_retake: boolean;
  course_completed?: boolean; // Optional field for course completion status
  completion_percentage?: number; // Optional field for overall progress
}

// Cache for server-side quiz questions - same as used in content route
const serverSideQuizCache = new Map<string, { 
  questions: any[], 
  studentId: string, 
  moduleId: string, 
  lessonId: string, 
  timestamp: number,
  is_fallback?: boolean
}>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ moduleId: string; lessonId: string }> }
) {
  try {
    // 1. Validate parameters
    const params = await context.params;
    const moduleIdValidation = ModuleIdSchema.safeParse(params.moduleId);
    const lessonIdValidation = LessonIdSchema.safeParse(params.lessonId);
    
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Lesson ID format', details: lessonIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }

    const validModuleId = moduleIdValidation.data;
    const validLessonId = lessonIdValidation.data;

    // 2. JWT-based authentication (Phase 1 optimization - 0 database queries for auth)
    const authResult = await authenticateApiRequestSecure(['student']);
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

    const validation = QuizSubmissionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid quiz submission data',
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { answers } = validation.data;

    // 4. Check student account status from JWT claims (no database query needed)
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

    // 5. Verify module is a Job Readiness course with product assignment
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(`
        id, 
        name, 
        type,
        module_product_assignments!inner (
          product_id,
          products!inner (
            id,
            name,
            type
          )
        )
      `)
      .eq('id', validModuleId)
      .eq('type', 'Course')
      .eq('module_product_assignments.products.type', 'JOB_READINESS')
      .single();

    if (moduleError || !moduleData) {
      return NextResponse.json(
        { error: 'Course module not found' },
        { status: 404 }
      );
    }

    // 6. Extract product data from junction table
    const productAssignment = moduleData.module_product_assignments?.[0];
    if (!productAssignment?.products) {
      return NextResponse.json(
        { error: 'This course is not part of a Job Readiness product' },
        { status: 404 }
      );
    }

    const productData = productAssignment.products;

    // 7. Verify enrollment using client_id from JWT claims
    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productData.id);

    if (assignmentError || count === 0) {
      return NextResponse.json(
        { error: 'Forbidden: Student not enrolled in this Job Readiness course' },
        { status: 403 }
      );
    }

    // 8. Verify lesson belongs to module
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, has_quiz, quiz_data')
      .eq('id', validLessonId)
      .eq('module_id', validModuleId)
      .single();

    if (lessonError || !lessonData) {
      return NextResponse.json(
        { error: 'Lesson not found in this module' },
        { status: 404 }
      );
    }

    if (!lessonData.has_quiz) {
      return NextResponse.json(
        { error: 'This lesson does not have a quiz' },
        { status: 400 }
      );
    }

    // 9. Get correct answers from cache or database
    const timeComponent = Math.floor(Date.now() / (CACHE_TTL_MS * 2));
    const cacheKey = `quiz_${validModuleId}_${validLessonId}_${user.id}_${timeComponent}`;
    const cachedQuiz = serverSideQuizCache.get(cacheKey);

    let correctQuestions: any[] = [];

    if (cachedQuiz && (Date.now() - cachedQuiz.timestamp < CACHE_TTL_MS)) {
      correctQuestions = cachedQuiz.questions;
    } else {
      // If no cached questions, try to get from lesson quiz_questions or fallback
      const { data: lessonWithQuiz, error: quizError } = await supabase
        .from('lessons')
        .select('quiz_questions')
        .eq('id', validLessonId)
        .single();

      if (quizError || !lessonWithQuiz?.quiz_questions || !Array.isArray(lessonWithQuiz.quiz_questions)) {
        return NextResponse.json(
          { error: 'Quiz questions not found. Please reload the page and try again.' },
          { status: 400 }
        );
      }

      correctQuestions = lessonWithQuiz.quiz_questions;
    }

    // 10. Calculate score
    const totalQuestions = correctQuestions.length;
    let correctAnswers = 0;
    const detailedResults: Array<{
      question_id: string;
      correct: boolean;
      selected_answer: string | string[];
      correct_answer: string | string[];
    }> = [];

    for (const question of correctQuestions) {
      const studentAnswer = answers.find(a => a.question_id === question.id);
      
      if (!studentAnswer) {
        detailedResults.push({
          question_id: question.id,
          correct: false,
          selected_answer: [],
          correct_answer: question.correct_answer || question.correct_option_id || ''
        });
        continue;
      }

      const isCorrect = checkAnswer(question, studentAnswer.selected_option_id);
      if (isCorrect) {
        correctAnswers++;
      }

      detailedResults.push({
        question_id: question.id,
        correct: isCorrect,
        selected_answer: studentAnswer.selected_option_id,
        correct_answer: question.correct_answer || question.correct_option_id || ''
      });
    }

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passingThreshold = 70; // 70% passing grade
    const passed = score >= passingThreshold;

    // 11. Get current progress and update quiz results
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details')
      .eq('student_id', user.id)
      .eq('module_id', validModuleId)
      .maybeSingle();

    const currentDetails = existingProgress?.progress_details || {};
    const lessonQuizResults = currentDetails.lesson_quiz_results || {};
    const currentAttempts = lessonQuizResults[validLessonId]?.attempts || 0;
    const newAttempts = currentAttempts + 1;

    // Update quiz results
    lessonQuizResults[validLessonId] = {
      score,
      passed,
      attempts: newAttempts,
      last_attempt_at: new Date().toISOString(),
      best_score: Math.max(score, lessonQuizResults[validLessonId]?.best_score || 0)
    };

    // If quiz passed, mark lesson as completed
    if (passed) {
      if (!currentDetails.completed_lesson_ids) {
        currentDetails.completed_lesson_ids = [];
      }
      if (!currentDetails.completed_lesson_ids.includes(validLessonId)) {
        currentDetails.completed_lesson_ids.push(validLessonId);
      }
    }

    const updatedDetails = {
      ...currentDetails,
      lesson_quiz_results: lessonQuizResults,
      updated_at: new Date().toISOString(),
    };

    // 12. 🚀 ENHANCED: Check for course completion after quiz submission
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, has_quiz')
      .eq('module_id', validModuleId);

    let courseCompleted = false;
    let completedLessonsCount = 0;
    
    if (!lessonsError && allLessons && allLessons.length > 0) {
      // Get existing completed videos and quiz results
      const { data: existingProgress } = await supabase
        .from('student_module_progress')
        .select('completed_videos, progress_details')
        .eq('student_id', user.id)
        .eq('module_id', validModuleId)
        .maybeSingle();
      
      const completedVideos = existingProgress?.completed_videos || [];
      const currentProgressDetails = existingProgress?.progress_details || {};
      
      for (const lesson of allLessons) {
        const isVideoWatched = completedVideos.includes(lesson.id);
        let isQuizPassedOrNotRequired = true;

        // If lesson has a quiz, check if it's been passed
        if (lesson.has_quiz) {
          // Check updated quiz results (including current submission)
          const quizResult = lesson.id === validLessonId 
            ? updatedDetails.lesson_quiz_results?.[lesson.id]  // Use updated results for current lesson
            : currentProgressDetails.lesson_quiz_results?.[lesson.id]; // Use existing results for other lessons
          
          isQuizPassedOrNotRequired = quizResult?.passed === true;
        }

        // Lesson is complete if video watched AND (no quiz OR quiz passed)
        if (isVideoWatched && isQuizPassedOrNotRequired) {
          completedLessonsCount += 1;
        }
      }

      courseCompleted = completedLessonsCount >= allLessons.length;
    }

    // Calculate overall progress based on completed lessons
    const overallCompletionPercentage = allLessons && allLessons.length > 0 
      ? Math.round((completedLessonsCount / allLessons.length) * 100) 
      : 0;

    const newStatus = courseCompleted ? 'Completed' : 'InProgress';

    // 13. Save progress with course completion status
    const { error: saveError } = await supabase
      .from('student_module_progress')
      .upsert({
        student_id: user.id,
        module_id: validModuleId,
        progress_details: updatedDetails,
        progress_percentage: overallCompletionPercentage,
        status: newStatus,
        last_updated: new Date().toISOString(),
        ...(courseCompleted && {
          course_completed_at: new Date().toISOString()
        })
      });

    if (saveError) {
      console.error('Error saving quiz progress:', saveError);
      return NextResponse.json(
        { error: 'Failed to save quiz results', details: saveError.message },
        { status: 500 }
      );
    }

    // 14. Return results with course completion info
    const response: QuizSubmissionResponse = {
      success: true,
      score,
      total_questions: totalQuestions,
      passed,
      passing_threshold: passingThreshold,
      detailed_results: detailedResults,
      attempts: newAttempts,
      can_retake: !passed && newAttempts < 3, // Allow up to 3 attempts
      course_completed: courseCompleted, // Add course completion flag
      completion_percentage: overallCompletionPercentage // Add overall progress
    };

    return NextResponse.json(response);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in submit-quiz:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to check if an answer is correct
function checkAnswer(question: any, selectedAnswer: string | string[]): boolean {
  const correctAnswer = question.correct_answer || question.correct_option_id;
  
  if (!correctAnswer) {
    return false;
  }

  // Handle MSQ (Multiple Select Questions)
  if (question.question_type === 'MSQ') {
    // Handle different MSQ correct answer formats
    let correctAnswers: string[] = [];
    
    if (Array.isArray(correctAnswer)) {
      // Direct array format: ["opt_a", "opt_b", "opt_d"]
      correctAnswers = correctAnswer;
    } else if (correctAnswer && typeof correctAnswer === 'object' && correctAnswer.answers) {
      // Object format: {"answers": ["opt_a", "opt_b", "opt_d"]}
      correctAnswers = correctAnswer.answers;
    } else {
      // Single answer wrapped in array
      correctAnswers = [correctAnswer];
    }
    
    const selectedAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer];
    
    // For MSQ, all correct answers must be selected and no incorrect ones
    return correctAnswers.length === selectedAnswers.length &&
           correctAnswers.every(answer => selectedAnswers.includes(answer)) &&
           selectedAnswers.every(answer => correctAnswers.includes(answer));
  }
  
  // Handle MCQ (Multiple Choice Questions)  
  const selectedSingle = Array.isArray(selectedAnswer) ? selectedAnswer[0] : selectedAnswer;
  return selectedSingle === correctAnswer;
} 