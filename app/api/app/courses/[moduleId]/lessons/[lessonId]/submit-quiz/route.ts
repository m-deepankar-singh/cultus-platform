import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

// Validation schemas
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });
const LessonIdSchema = z.string().uuid({ message: 'Invalid Lesson ID format' });

const QuizSubmissionRequestSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  time_spent_seconds: z.number().min(0, { message: 'Time spent must be non-negative' }),
  started_at: z.string().datetime({ message: 'Invalid started_at timestamp' }),
});

interface QuizSubmissionRequest {
  answers: Record<string, string | string[]>;
  time_spent_seconds: number;
  started_at: string;
}

interface QuestionResult {
  question_id: string;
  question_text: string;
  submitted_answer: string | string[];
  correct_answer: string | string[];
  is_correct: boolean;
  explanation?: string;
}

interface QuizSubmissionResponse {
  success: boolean;
  score: number;
  passed: boolean;
  correct_answers: number;
  total_questions: number;
  detailed_results: QuestionResult[];
  can_retake: boolean;
  attempts_used: number;
  max_attempts: number;
  message: string;
}

// Interface for database quiz question
interface DatabaseQuizQuestion {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TF';
  options: { id: string; text: string }[];
  correct_answer?: string; // For MCQ and TF
  correct_answers?: string[]; // For MSQ
  explanation?: string;
}

/**
 * Enhanced Quiz Submission API for Normal Courses
 * 
 * Features:
 * - JWT authentication and authorization
 * - Enrollment verification
 * - Comprehensive quiz validation and scoring
 * - Support for MCQ, MSQ, and True/False questions
 * - Attempt tracking and retry logic
 * - Progress integration
 * - Performance optimizations using existing indexes
 * 
 * POST /api/app/courses/[moduleId]/lessons/[lessonId]/submit-quiz
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string; lessonId: string }> }
) {
  try {
    // 1. Validate Route Parameters
    const resolvedParams = await params;
    const moduleIdValidation = ModuleIdSchema.safeParse(resolvedParams.moduleId);
    const lessonIdValidation = LessonIdSchema.safeParse(resolvedParams.lessonId);
    
    if (!moduleIdValidation.success || !lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID or Lesson ID format' },
        { status: 400 }
      );
    }
    
    const moduleId = moduleIdValidation.data;
    const lessonId = lessonIdValidation.data;

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = QuizSubmissionRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    const submissionData: QuizSubmissionRequest = validationResult.data;

    // 3. 🚀 ENHANCED: JWT-based authentication with comprehensive validation
    const authResult = await authenticateApiRequestSecure(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Check if student account is active
    if (!claims.profile_is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 }
      );
    }

    // Get client_id from JWT claims
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    // 4. Verify module exists and get product information
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(`
        id, 
        name,
        module_product_assignments!inner(product_id)
      `)
      .eq('id', moduleId)
      .eq('type', 'Course')
      .maybeSingle();

    if (moduleError && moduleError.code !== 'PGRST116') {
      console.error(`Error fetching module ${moduleId}:`, moduleError);
      return NextResponse.json({ error: 'Failed to fetch course details' }, { status: 500 });
    }
    
    if (!moduleData || !moduleData.module_product_assignments?.length) {
      return NextResponse.json({ error: 'Course module not found or not assigned to any product' }, { status: 404 });
    }

    const productId = moduleData.module_product_assignments[0].product_id;

    // 5. Verify enrollment
    const { count: assignmentCount, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (assignmentError) {
      console.error('Error checking client enrollment:', assignmentError);
      return NextResponse.json({ error: 'Failed to verify enrollment' }, { status: 500 });
    }

    if (assignmentCount === 0) {
      return NextResponse.json({ error: 'Forbidden: Not enrolled in product containing this course' }, { status: 403 });
    }

    // 6. Fetch lesson and quiz questions
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, module_id, has_quiz, quiz_questions')
      .eq('id', lessonId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (lessonError && lessonError.code !== 'PGRST116') {
      console.error(`Error fetching lesson ${lessonId}:`, lessonError);
      return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 });
    }

    if (!lessonData) {
      return NextResponse.json({ error: 'Lesson not found in this course' }, { status: 404 });
    }

    if (!lessonData.has_quiz || !lessonData.quiz_questions || !Array.isArray(lessonData.quiz_questions)) {
      return NextResponse.json({ error: 'This lesson does not have a quiz or quiz questions are not available' }, { status: 400 });
    }

    const quizQuestions: DatabaseQuizQuestion[] = lessonData.quiz_questions;

    // 7. Get current progress and check attempt limits
    const { data: progressData, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error(`Error fetching progress:`, progressError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    const existingDetails = progressData?.progress_details as any || {};
    const lessonQuizResults = existingDetails.lesson_quiz_results || {};
    const currentLessonResult = lessonQuizResults[lessonId] || { attempts: 0, passed: false, best_score: 0 };

    // Check attempt limits (configurable, default 3 attempts)
    const maxAttempts = 3;
    if (currentLessonResult.attempts >= maxAttempts && !currentLessonResult.passed) {
      return NextResponse.json({
        error: 'Maximum quiz attempts exceeded',
        attempts_used: currentLessonResult.attempts,
        max_attempts: maxAttempts,
        can_retake: false,
      }, { status: 403 });
    }

    // 8. 🚀 ENHANCED: Quiz validation and scoring
    const questionResults: QuestionResult[] = [];
    let correctAnswersCount = 0;
    const totalQuestions = quizQuestions.length;

    for (const question of quizQuestions) {
      const submittedAnswer = submissionData.answers[question.id];
      let isCorrect = false;
      let correctAnswer: string | string[];

      // Determine correct answer and validate submission
      switch (question.question_type) {
        case 'MCQ':
        case 'TF':
          correctAnswer = question.correct_answer || '';
          isCorrect = submittedAnswer === correctAnswer;
          break;
        
        case 'MSQ':
          correctAnswer = question.correct_answers || [];
          if (Array.isArray(submittedAnswer) && Array.isArray(correctAnswer)) {
            // For MSQ, check if arrays are equal (order doesn't matter)
            const submittedSet = new Set(submittedAnswer);
            const correctSet = new Set(correctAnswer);
            isCorrect = submittedSet.size === correctSet.size &&
                       [...submittedSet].every(answer => correctSet.has(answer));
          }
          break;
      }

      if (isCorrect) {
        correctAnswersCount++;
      }

      questionResults.push({
        question_id: question.id,
        question_text: question.question_text,
        submitted_answer: submittedAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        explanation: question.explanation,
      });
    }

    // Calculate score and determine pass/fail
    const score = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
    const passed = score >= 80; // 80% passing threshold for normal courses

    // 9. Update progress with quiz results
    const newAttempts = currentLessonResult.attempts + 1;
    const newBestScore = Math.max(currentLessonResult.best_score || 0, score);
    
    const updatedLessonQuizResults = {
      ...lessonQuizResults,
      [lessonId]: {
        score: score,
        passed: passed || currentLessonResult.passed, // Once passed, always passed
        attempts: newAttempts,
        best_score: newBestScore,
        last_attempt_at: new Date().toISOString(),
        time_spent_seconds: submissionData.time_spent_seconds,
      }
    };

    // 🚀 ENHANCED: Also update lesson_quiz_attempts for backwards compatibility
    const existingAttempts = existingDetails.lesson_quiz_attempts || {};
    const lessonAttempts = existingAttempts[lessonId] || [];
    
    // Add this attempt to the attempts array
    const newAttempt = {
      answers: submissionData.answers,
      score: score,
      total_questions_in_quiz: totalQuestions,
      pass_fail_status: passed ? 'passed' : 'failed',
      time_taken_seconds: submissionData.time_spent_seconds,
      submitted_at: new Date().toISOString(),
    };
    
    lessonAttempts.push(newAttempt);
    
    const updatedLessonQuizAttempts = {
      ...existingAttempts,
      [lessonId]: lessonAttempts,
    };

    const updatedProgressDetails = {
      ...existingDetails,
      lesson_quiz_results: updatedLessonQuizResults,
      lesson_quiz_attempts: updatedLessonQuizAttempts, // Add for backwards compatibility
    };

    // 10. 🚀 ENHANCED: Check for course completion after quiz submission
    // Get all lessons to check if course is now complete
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, has_quiz')
      .eq('module_id', moduleId);

    let courseCompleted = false;
    let completedLessonsCount = 0;
    
    if (!lessonsError && allLessons && allLessons.length > 0) {
      // Get existing completed videos from the database
      const { data: existingProgress } = await supabase
        .from('student_module_progress')
        .select('completed_videos')
        .eq('student_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();
      
      const completedVideos = existingProgress?.completed_videos || [];
      
      for (const lesson of allLessons) {
        const isVideoWatched = completedVideos.includes(lesson.id);
        let isQuizPassedOrNotRequired = true;

        // If lesson has a quiz, check if it's been passed
        if (lesson.has_quiz) {
          // Check both possible quiz result formats for maximum compatibility
          const quizResult = updatedProgressDetails.lesson_quiz_results?.[lesson.id];
          const quizAttempts = updatedProgressDetails.lesson_quiz_attempts?.[lesson.id];
          
          const passedInQuizResults = quizResult?.passed === true;
          const passedInQuizAttempts = Array.isArray(quizAttempts) && 
            quizAttempts.some((att: any) => att.pass_fail_status === 'passed');
          
          isQuizPassedOrNotRequired = passedInQuizResults || passedInQuizAttempts;
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

    // 11. Update progress in database with course completion status
    const progressUpdateData = {
      student_id: user.id,
      module_id: moduleId,
      progress_details: updatedProgressDetails,
      progress_percentage: overallCompletionPercentage,
      status: newStatus,
      last_updated: new Date().toISOString(),
      ...(courseCompleted && {
        course_completed_at: new Date().toISOString()
      })
    };

    const { error: upsertError } = await supabase
      .from('student_module_progress')
      .upsert(progressUpdateData, {
        onConflict: 'student_id,module_id'
      });

    if (upsertError) {
      console.error('Error updating quiz progress:', upsertError);
      return NextResponse.json({ error: 'Failed to save quiz results' }, { status: 500 });
    }

    // 11. Construct response
    const canRetake = !passed && newAttempts < maxAttempts;
    let message = '';
    
    if (passed) {
      message = newAttempts === 1 
        ? 'Congratulations! Quiz passed on first attempt!' 
        : `Congratulations! Quiz passed on attempt ${newAttempts}!`;
    } else if (canRetake) {
      message = `Quiz not passed. You have ${maxAttempts - newAttempts} attempts remaining.`;
    } else {
      message = 'Quiz not passed. Maximum attempts reached.';
    }

    // 12. Enhanced response with course completion info
    let enhancedMessage = message;
    if (passed && courseCompleted) {
      enhancedMessage = `${message} 🎉 Course completed! Congratulations on finishing the entire course!`;
    } else if (passed) {
      enhancedMessage = `${message} You can now proceed to the next lesson.`;
    }

    const response: QuizSubmissionResponse = {
      success: true,
      score: score,
      passed: passed,
      correct_answers: correctAnswersCount,
      total_questions: totalQuestions,
      detailed_results: questionResults,
      can_retake: canRetake,
      attempts_used: newAttempts,
      max_attempts: maxAttempts,
      message: enhancedMessage,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in submit-quiz:', error);
    
    // Enhanced error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Bad Request: Validation failed', details: error.flatten() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 