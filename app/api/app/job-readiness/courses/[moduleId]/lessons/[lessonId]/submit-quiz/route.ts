import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

// Define schemas for validation
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });
const LessonIdSchema = z.string().uuid({ message: 'Invalid Lesson ID format' });

const QuizSubmissionSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string(),
    selected_option_id: z.union([z.string(), z.array(z.string())])
  }))
});

interface QuizSubmissionResponse {
  success: boolean;
  score: number;
  percentage: number;
  passed: boolean;
  feedback: string;
  correct_answers: number;
  total_questions: number;
  attempts: number;
  lesson_completed: boolean;
}

export async function POST(
  request: NextRequest,
  context: { params: { moduleId: string; lessonId: string } }
) {
  try {
    const { params } = await context;
    const { moduleId, lessonId } = await params;

    // Validate parameters
    const moduleIdValidation = ModuleIdSchema.safeParse(moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }

    const lessonIdValidation = LessonIdSchema.safeParse(lessonId);
    if (!lessonIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Lesson ID format', details: lessonIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }

    const validModuleId = moduleIdValidation.data;
    const validLessonId = lessonIdValidation.data;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const bodyValidation = QuizSubmissionSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { answers } = bodyValidation.data;

    // Authentication & Authorization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student information
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, client_id, job_readiness_tier, is_active')
      .eq('id', user.id)
      .single();

    if (studentError || !studentData) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!studentData.is_active) {
      return NextResponse.json({ error: 'Student account is inactive' }, { status: 403 });
    }

    // Verify module exists and is a course
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, name, product_id, type')
      .eq('id', validModuleId)
      .eq('type', 'Course')
      .single();

    if (moduleError || !moduleData) {
      console.error('Error fetching module:', moduleError);
      return NextResponse.json({ error: 'Course module not found' }, { status: 404 });
    }

    // Verify this is a Job Readiness product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, type')
      .eq('id', moduleData.product_id)
      .eq('type', 'JOB_READINESS')
      .single();

    if (productError || !productData) {
      return NextResponse.json({ error: 'This course is not part of a Job Readiness product' }, { status: 404 });
    }

    // Verify enrollment
    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', studentData.client_id)
      .eq('product_id', productData.id);

    if (assignmentError) {
      console.error('Error checking enrollment:', assignmentError);
      return NextResponse.json({ error: 'Failed to verify enrollment' }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    // Verify lesson exists and has quiz
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, has_quiz, quiz_questions')
      .eq('id', validLessonId)
      .eq('module_id', validModuleId)
      .single();

    if (lessonError || !lessonData) {
      console.error('Error fetching lesson:', lessonError);
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (!lessonData.has_quiz || !lessonData.quiz_questions) {
      return NextResponse.json({ error: 'This lesson does not have a quiz' }, { status: 400 });
    }

    // Parse quiz questions from the lesson data
    const quizQuestions = lessonData.quiz_questions as any[];
    if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
      return NextResponse.json({ error: 'No quiz questions found for this lesson' }, { status: 400 });
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quizQuestions.length;

    for (const question of quizQuestions) {
      const userAnswer = answers.find(a => a.question_id === question.id);
      
      if (userAnswer && question.correct_answer) {
        if (question.question_type === 'MSQ') {
          // Multiple select question - compare arrays
          const correctOptions = typeof question.correct_answer === 'object' && question.correct_answer.answers
            ? question.correct_answer.answers
            : Array.isArray(question.correct_answer) 
            ? question.correct_answer 
            : [question.correct_answer];
          const userOptions = Array.isArray(userAnswer.selected_option_id) 
            ? userAnswer.selected_option_id 
            : [userAnswer.selected_option_id];
          
          // Check if arrays have same elements (order independent)
          const sortedCorrect = correctOptions.sort();
          const sortedUser = userOptions.sort();
          
          if (sortedCorrect.length === sortedUser.length && 
              sortedCorrect.every((val: string, index: number) => val === sortedUser[index])) {
            correctAnswers++;
          }
        } else {
          // Single select question - direct comparison
          if (userAnswer.selected_option_id === question.correct_answer) {
            correctAnswers++;
          }
        }
      }
    }

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = percentage >= 70; // 70% passing threshold for lesson quizzes

    // Get existing progress or create new one
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details')
      .eq('student_id', user.id)
      .eq('module_id', validModuleId)
      .maybeSingle();

    let progressDetails: any = {};
    if (existingProgress?.progress_details) {
      progressDetails = existingProgress.progress_details as any;
    }

    // Initialize progress structure if not exists
    if (!progressDetails.lesson_quiz_results) {
      progressDetails.lesson_quiz_results = {};
    }

    // Get existing attempts count
    const existingQuizResult = progressDetails.lesson_quiz_results[validLessonId];
    const attempts = existingQuizResult ? (existingQuizResult.attempts || 0) + 1 : 1;

    // Update quiz result
    progressDetails.lesson_quiz_results[validLessonId] = {
      score: percentage,
      passed,
      attempts,
      last_attempt_at: new Date().toISOString()
    };

    // Save or update progress
    if (existingProgress) {
      const { error: updateError } = await supabase
        .from('student_module_progress')
        .update({
          progress_details: progressDetails,
          last_updated: new Date().toISOString()
        })
        .eq('student_id', user.id)
        .eq('module_id', validModuleId);

      if (updateError) {
        console.error('Error updating progress:', updateError);
        return NextResponse.json({ error: 'Failed to save quiz result' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('student_module_progress')
        .insert({
          student_id: user.id,
          module_id: validModuleId,
          progress_details: progressDetails,
          last_updated: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating progress:', insertError);
        return NextResponse.json({ error: 'Failed to save quiz result' }, { status: 500 });
      }
    }

    // Generate feedback message
    let feedback = `Quiz completed with ${percentage}% (${correctAnswers}/${totalQuestions} correct).`;
    if (passed) {
      feedback += ' Congratulations, you passed the lesson quiz!';
    } else {
      feedback += ' You need at least 70% to pass. You can retake the quiz to improve your score.';
    }

    const response: QuizSubmissionResponse = {
      success: true,
      score: correctAnswers,
      percentage,
      passed,
      feedback,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      attempts,
      lesson_completed: passed
    };

    console.log(`Quiz submission for lesson ${validLessonId}: ${percentage}% (${correctAnswers}/${totalQuestions}), passed: ${passed}, attempts: ${attempts}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in lesson quiz submission:', error);
    return NextResponse.json(
      { error: 'Internal server error during quiz submission' },
      { status: 500 }
    );
  }
} 