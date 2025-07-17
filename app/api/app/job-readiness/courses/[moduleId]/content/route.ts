
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateApiRequestUltraFast, isUserActive } from '@/lib/auth/api-auth';
// Import the actual quiz generator implementation
import { generateQuizForLesson, transformQuestionsForClient, getFallbackQuestions } from '@/lib/ai/quiz-generator';
import { handleConditionalRequest } from '@/lib/cache/etag-utils';
import { CACHE_CONFIGS } from '@/lib/cache/simple-cache';
import { cacheConfig } from '@/lib/cache/config';

// Types based on the plan and existing course content API
interface QuizQuestionClient {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  question_type: 'MCQ' | 'MSQ'; // Added question_type to properly identify MCQ vs MSQ questions
  // correct_option_id is intentionally omitted for the client
}

interface QuizOption {
  id: string;
  text: string;
}

interface LessonOutput {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  sequence: number;
  enable_ai_quiz?: boolean; // From plan
  quiz_generation_prompt?: string | null; // From plan
  quiz_questions?: QuizQuestionClient[] | null; // Questions for client (no answers)
  quiz_already_passed?: boolean; // Flag indicating if the quiz has already been passed
  quiz_available?: boolean; // Flag indicating if the quiz is available (video watched or quiz passed)
  video_fully_watched?: boolean; // Flag indicating if the video has been fully watched
  video_playback_position?: number; // Current video position in seconds
}

// Add a specific type for MSQ answers
interface MSQAnswer {
  answers: string[];
}

interface AssessmentQuestion {
  id: string;
  question_text: string;
  options: QuizOption[];
  correct_answer: string | MSQAnswer;
  question_type: string;
  correct_option_id?: string; // For compatibility with AI-generated questions
}

interface CourseModuleDetailsOutput {
  id: string;
  name: string;
  description?: string | null;
  lessons: LessonOutput[];
}

interface StudentModuleProgressOutput {
  last_viewed_lesson_sequence?: number | null;
  video_playback_positions?: Record<string, number>; // e.g. {"lessonId1": 120}
  fully_watched_video_ids?: string[];
  lesson_quiz_results?: Record<string, { score: number; passed: boolean; attempts: number }>; // Store quiz results per lesson
}

interface JobReadinessCoursePageDataResponse {
  module: CourseModuleDetailsOutput;
  progress: StudentModuleProgressOutput;
}


// Update the cache type definition
const serverSideQuizCache = new Map<string, { 
  questions: any[], 
  studentId: string, 
  moduleId: string, 
  lessonId: string, 
  timestamp: number,
  is_fallback?: boolean
}>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const params = await context.params;
    const { moduleId } = params;
    
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    // JWT-based authentication (replaces getUser() + student record lookup)
    const authResult = await authenticateApiRequestUltraFast(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Check if student account is active (from JWT claims)
    if (!isUserActive(claims)) {
      return NextResponse.json({ error: 'Student account is inactive' }, { status: 403 });
    }

    // Get client_id and tier from JWT claims instead of database lookup
    const clientId = claims.client_id;
    const studentTier = claims.job_readiness_tier || 'BRONZE';
    
    if (!clientId) {
      return NextResponse.json({ error: 'Student not linked to a client' }, { status: 403 });
    }

    // Fetch Course Module Details with Job Readiness verification
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select(`
        id, 
        name, 
        configuration,
        module_product_assignments!inner (
          product_id,
          products (
            id,
            name,
            type
          )
        )
      `)
      .eq('id', moduleId)
      .eq('type', 'Course')
      .single();

    if (moduleError) {
      console.error(`Error fetching module ${moduleId}:`, moduleError);
      if (moduleError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Course module not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch course module details' }, { status: 500 });
    }

    if (!moduleData) {
        return NextResponse.json({ error: 'Course module not found' }, { status: 404 });
    }

    // Verify this is a Job Readiness product using the junction table data
    const productAssignment = moduleData.module_product_assignments?.[0];
    if (!productAssignment?.products) {
      return NextResponse.json({ error: 'This course is not assigned to any product' }, { status: 404 });
    }

    const productData = productAssignment.products;
    if (productData.type !== 'JOB_READINESS') {
      return NextResponse.json({ error: 'This course is not part of a Job Readiness product' }, { status: 404 });
    }

    // Verify enrollment
    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productData.id);

    if (assignmentError) {
      console.error('Error checking client enrollment:', assignmentError);
      return NextResponse.json({ error: 'Failed to verify enrollment' }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Not enrolled in this Job Readiness course' }, { status: 403 });
    }

    // Fetch student's existing progress
    let studentProgress: StudentModuleProgressOutput = {
      video_playback_positions: {},
      fully_watched_video_ids: [],
      lesson_quiz_results: {},
    };

    const { data: progressData, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details')
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error(`Error fetching progress for module ${moduleId}, student ${user.id}:`, progressError);
    }

    let progressDetails: any = {};
    if (progressData && progressData.progress_details) {
      progressDetails = progressData.progress_details as any;
      studentProgress = {
        last_viewed_lesson_sequence: progressDetails.last_viewed_lesson_sequence,
        video_playback_positions: progressDetails.video_playback_positions || {},
        fully_watched_video_ids: progressDetails.fully_watched_video_ids || [],
        lesson_quiz_results: progressDetails.lesson_quiz_results || {},
      };
    }

    const moduleConfig = moduleData.configuration as any || {};

    // 2. Fetch Lessons for the Module
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, description, video_url, sequence, has_quiz, quiz_questions, quiz_data') 
      .eq('module_id', moduleId)
      .order('sequence', { ascending: true });

    if (lessonsError) {
      console.error(`Error fetching lessons for module ${moduleId}:`, lessonsError);
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }

    const lessonsOutput: LessonOutput[] = [];
    for (const lesson of lessonsData || []) {
      const lessonConfig = lesson.quiz_data as any || {};
      const enableAiQuiz = lesson.has_quiz === true || lessonConfig.enable_ai_quiz === true;
      const quizGenerationPrompt = lessonConfig.quiz_generation_prompt as string | null;

      let clientQuizQuestions: QuizQuestionClient[] | null = null;

      // Check if the quiz for this lesson has been completed successfully
      const quizAlreadyPassed = progressDetails?.lesson_quiz_results?.[lesson.id]?.passed === true;
      
      // Check if video has been fully watched to determine quiz availability
      const videoFullyWatched = progressDetails?.fully_watched_video_ids?.includes(lesson.id) === true ||
                               progressDetails?.video_playback_positions?.[lesson.id] === -1; // -1 indicates completed
      
      // Quiz should only be available if video is fully watched (unless already passed)
      const quizShouldBeAvailable = quizAlreadyPassed || videoFullyWatched;
      
      if (enableAiQuiz) {
        // First, check if there are predefined quiz questions
        if (lesson.quiz_questions && Array.isArray(lesson.quiz_questions) && lesson.quiz_questions.length > 0) {
          // Use existing predefined quiz questions
          clientQuizQuestions = lesson.quiz_questions.map((q: any) => ({
            id: q.id,
            question_text: q.question_text || q.text, // Handle both field name conventions
            options: q.options || [],
            question_type: q.question_type as 'MCQ' | 'MSQ',
          }));
        } 
        // Only generate AI quiz if we have a prompt, no predefined questions, quiz should be available, and hasn't been passed
        else if (quizGenerationPrompt && !quizAlreadyPassed && quizShouldBeAvailable) {
          // Generate or retrieve cached quiz
          // Cache key includes student ID to ensure quiz is for this user, preventing reuse if not intended
          // Also includes a time component (rounded to 10-minute intervals) to ensure new questions periodically
          const timeComponent = Math.floor(Date.now() / (CACHE_TTL_MS * 2)); // Change every 10 minutes
          const cacheKey = `quiz_${moduleId}_${lesson.id}_${user.id}_${timeComponent}`;
          const cachedQuiz = serverSideQuizCache.get(cacheKey);
          
          let fullQuizQuestions: any[];

          if (cachedQuiz && (Date.now() - cachedQuiz.timestamp < CACHE_TTL_MS)) {
            fullQuizQuestions = cachedQuiz.questions;
            console.log(`Serving cached quiz for lesson ${lesson.id}, student ${user.id}`);
          } else {
            try {
              // Call our new quiz generator with student tier information
              const generatedQuestions = await generateQuizForLesson(
                lesson.id,
                moduleId,
                studentTier as 'beginner' | 'intermediate' | 'advanced',
                false // Not a deterministic attempt (this is initial display)
              );
              
              if (!generatedQuestions || generatedQuestions.length === 0) {
                throw new Error('No questions generated by AI');
              }
              
              fullQuizQuestions = generatedQuestions;
              serverSideQuizCache.set(cacheKey, { 
                questions: fullQuizQuestions, 
                studentId: user.id, 
                moduleId: moduleId, 
                lessonId: lesson.id, 
                timestamp: Date.now() 
              });
              console.log(`Generated and cached quiz for lesson ${lesson.id}, student ${user.id}`);
            } catch (error) {
              // Handle AI generation error by fetching fallback questions from question bank mappings
              console.error(`Error generating AI quiz for lesson ${lesson.id}:`, error);
              console.log(`Attempting to use fallback questions from question bank for lesson ${lesson.id}`);
              
              // Get fallback questions using our helper function
              fullQuizQuestions = await getFallbackQuestions(lesson.id, supabase) || [];
              
              // Cache the fallback questions
              if (fullQuizQuestions.length > 0) {
                serverSideQuizCache.set(cacheKey, { 
                  questions: fullQuizQuestions, 
                  studentId: user.id, 
                  moduleId: moduleId, 
                  lessonId: lesson.id, 
                  timestamp: Date.now(),
                  is_fallback: true  // Mark as fallback
                });
                console.log(`Using ${fullQuizQuestions.length} fallback questions from question bank for lesson ${lesson.id}`);
              } else {
                // No fallback questions available
                console.warn(`No fallback questions available for lesson ${lesson.id}`);
                fullQuizQuestions = [];
              }
            }
          }
          
          // Transform questions for client by removing answers
          clientQuizQuestions = fullQuizQuestions.length > 0 
            ? transformQuestionsForClient(fullQuizQuestions)
            : null;
        }
        // Even if no AI quizzes or predefined questions, check for fallback questions from question bank
        // but only if quiz should be available and hasn't been passed
        else if (!quizAlreadyPassed && quizShouldBeAvailable) {
          // Get fallback questions from our helper function
          const fallbackQuestions = await getFallbackQuestions(lesson.id, supabase);
          
          if (fallbackQuestions && fallbackQuestions.length > 0) {
            // Cache the fallback questions
            const timeComponent = Math.floor(Date.now() / (CACHE_TTL_MS * 2)); // Change every 10 minutes
            const cacheKey = `quiz_${moduleId}_${lesson.id}_${user.id}_${timeComponent}`;
            serverSideQuizCache.set(cacheKey, { 
              questions: fallbackQuestions, 
              studentId: user.id, 
              moduleId: moduleId, 
              lessonId: lesson.id, 
              timestamp: Date.now(),
              is_fallback: true  // Mark as fallback
            });
            
            // Transform questions for client by removing answers
            clientQuizQuestions = transformQuestionsForClient(fallbackQuestions);
            console.log(`Using ${fallbackQuestions.length} fallback questions from question bank for lesson ${lesson.id}`);
          }
        }
        // If the quiz is already passed, include a special marker in the output
        else if (quizAlreadyPassed) {
          console.log(`Quiz for lesson ${lesson.id} already passed by student ${user.id} - not generating new questions`);
          // We'll keep clientQuizQuestions as null
        }
      }

      lessonsOutput.push({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.video_url,
        sequence: lesson.sequence,
        enable_ai_quiz: enableAiQuiz,
        quiz_generation_prompt: enableAiQuiz ? quizGenerationPrompt : null, // Only send prompt if quiz is enabled
        quiz_questions: clientQuizQuestions,
        quiz_already_passed: quizAlreadyPassed || false,  // Add this flag to indicate if quiz has been passed
        quiz_available: enableAiQuiz ? quizShouldBeAvailable : false, // Quiz is available if video watched or already passed
        video_fully_watched: videoFullyWatched || false, // Video completion status
        video_playback_position: progressDetails?.video_playback_positions?.[lesson.id] || 0, // Current video position
      });
    }

    // No need to fetch progress again, we already have it
    const responsePayload: JobReadinessCoursePageDataResponse = {
      module: {
        id: moduleData.id,
        name: moduleData.name,
        description: moduleConfig.description || 'No description provided.',
        lessons: lessonsOutput,
      },
      progress: studentProgress,
    };

    // Skip caching if disabled
    if (!cacheConfig.enabled) {
      return NextResponse.json(responsePayload);
    }

    // Use frequent cache (30 seconds) for course content with dynamic quiz generation
    return handleConditionalRequest(request, responsePayload, CACHE_CONFIGS.FREQUENT);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/job-readiness/courses/[moduleId]/content:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
} 