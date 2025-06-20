import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { z } from 'zod';

// Validation schema for module ID
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

// Define types based on enhanced progress structure for normal courses
interface QuizQuestion {
  id: string;
  text: string;
  type: 'MCQ' | 'MSQ' | 'TF';
  options: { id: string; text: string }[];
}

interface LessonData {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  sequence: number;
  has_quiz?: boolean;
  quiz_questions?: any[] | null;
}

interface DatabaseQuizQuestion {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TF';
  options: { id: string; text: string }[];
}

// Enhanced lesson output with progress information
interface LessonOutput {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  sequence: number;
  has_quiz?: boolean;
  quiz_questions?: QuizQuestion[] | null;
  is_completed: boolean;
  quiz_passed?: boolean;
  quiz_attempts: number;
  last_watched_position: number; // in seconds
  video_fully_watched: boolean;
}

interface CourseDetailsOutput {
  id: string;
  name: string;
  description?: string | null;
  lessons: LessonOutput[];
  lessons_count: number;
  completed_lessons_count: number;
}

// Enhanced progress structure matching the plan
interface StudentCourseProgressOutput {
  overall_progress: number; // 0-100
  completed_videos_count: number;
  total_videos_count: number;
  course_completed: boolean;
  last_viewed_lesson_sequence: number;
  video_playback_positions: Record<string, number>; // lessonId -> seconds
  fully_watched_video_ids: string[];
  lesson_quiz_results: Record<string, {
    score: number;
    passed: boolean;
    attempts: number;
    best_score?: number;
  }>;
}

interface CoursePageDataResponse {
  course: CourseDetailsOutput;
  progress: StudentCourseProgressOutput;
}

/**
 * Enhanced GET handler for course content with Job Readiness-style robustness
 * 
 * Features:
 * - JWT authentication and authorization
 * - Enrollment verification
 * - Enhanced progress tracking
 * - Comprehensive error handling
 * - Performance optimizations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    // 1. Validate Route Parameter (moduleId)
    const resolvedParams = await params;
    const moduleIdValidation = ModuleIdSchema.safeParse(resolvedParams.moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const moduleId = moduleIdValidation.data;

    // 2. 🚀 ENHANCED: JWT-based authentication with comprehensive validation
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
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    // 3. Fetch Course Module Details with Product Information
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(`
        id, 
        name, 
        configuration,
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

    // 4. 🚀 NEW: Verify Enrollment (check if client is assigned to the module's product)
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

    // 5. Fetch Lessons for the Module (optimized query)
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, description, video_url, sequence, has_quiz, quiz_questions')
      .eq('module_id', moduleId)
      .order('sequence', { ascending: true });

    if (lessonsError) {
      console.error(`Error fetching lessons for module ${moduleId}:`, lessonsError);
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }

    // 6. 🚀 ENHANCED: Fetch Student's Progress with comprehensive structure
    let studentProgress: StudentCourseProgressOutput = {
      overall_progress: 0,
      completed_videos_count: 0,
      total_videos_count: lessonsData?.length || 0,
      course_completed: false,
      last_viewed_lesson_sequence: 0,
      video_playback_positions: {},
      fully_watched_video_ids: [],
      lesson_quiz_results: {},
    };

    const { data: progressData, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details, completed_videos, video_completion_count, progress_percentage, status, course_completed_at')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error(`Error fetching progress for module ${moduleId}, student ${user.id}:`, progressError);
    }

    // 7. 🚀 ENHANCED: Process progress data using existing database columns
    if (progressData) {
      const details = progressData.progress_details as any || {};
      
      studentProgress = {
        overall_progress: progressData.progress_percentage || 0,
        completed_videos_count: progressData.video_completion_count || 0,
        total_videos_count: lessonsData?.length || 0,
        course_completed: progressData.status === 'Completed' || !!progressData.course_completed_at,
        last_viewed_lesson_sequence: details.last_viewed_lesson_sequence || 0,
        video_playback_positions: details.video_playback_positions || {},
        fully_watched_video_ids: progressData.completed_videos || [],
        lesson_quiz_results: details.lesson_quiz_results || {},
      };
    }

    // 8. 🚀 ENHANCED: Process lessons with comprehensive progress information
    const enhancedLessons: LessonOutput[] = (lessonsData || []).map((lesson: LessonData) => {
      // Process quiz questions (remove correct answers for security)
      let processedQuizQuestions: QuizQuestion[] | null = null;
      
      if (lesson.has_quiz === true || (lesson.quiz_questions && Array.isArray(lesson.quiz_questions) && lesson.quiz_questions.length > 0)) {
        if (!lesson.quiz_questions || !Array.isArray(lesson.quiz_questions) || lesson.quiz_questions.length === 0) {
          processedQuizQuestions = [];
        } else {
          processedQuizQuestions = lesson.quiz_questions.map((question: DatabaseQuizQuestion) => ({
            id: question.id,
            text: question.question_text,
            type: question.question_type,
            options: Array.isArray(question.options) ? question.options : [],
          }));
        }
      }

      // Calculate lesson-specific progress
      const isVideoWatched = studentProgress.fully_watched_video_ids.includes(lesson.id);
      const lastWatchedPosition = studentProgress.video_playback_positions[lesson.id] || 0;
      const lessonQuizResult = studentProgress.lesson_quiz_results[lesson.id];
      const quizPassed = lessonQuizResult?.passed || false;
      const quizAttempts = lessonQuizResult?.attempts || 0;
      
      // Lesson is completed if video is watched AND (no quiz OR quiz is passed)
      const isCompleted = isVideoWatched && (!lesson.has_quiz || quizPassed);

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.video_url,
        sequence: lesson.sequence,
        has_quiz: !!lesson.has_quiz,
        quiz_questions: processedQuizQuestions,
        is_completed: isCompleted,
        quiz_passed: quizPassed,
        quiz_attempts: quizAttempts,
        last_watched_position: lastWatchedPosition,
        video_fully_watched: isVideoWatched,
      };
    });

    // 9. Calculate course completion metrics
    const completedLessonsCount = enhancedLessons.filter(lesson => lesson.is_completed).length;
    const courseDescription = moduleData.configuration?.description || 'No description provided.';

    // 10. Construct enhanced response
    const responsePayload: CoursePageDataResponse = {
      course: {
        id: moduleData.id,
        name: moduleData.name,
        description: courseDescription,
        lessons: enhancedLessons,
        lessons_count: enhancedLessons.length,
        completed_lessons_count: completedLessonsCount,
      },
      progress: studentProgress,
    };

    return NextResponse.json(responsePayload);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/courses/[moduleId]/content:', error);
    
    // Enhanced error handling with proper logging
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Bad Request: Validation failed', details: error.flatten() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
} 