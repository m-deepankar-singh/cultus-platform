import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define a more specific type for quiz questions based on observed DB structure
interface QuizQuestion {
  id: string;
  text: string; // This should match the frontend's expectation
  type: 'MCQ' | 'MSQ' | 'TF'; // This should match the frontend's expectation
  options: { id: string; text: string }[];
}

interface LessonOutput {
  id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  sequence: number;
  has_quiz?: boolean;
  quiz_questions?: QuizQuestion[] | null; // Use the refined QuizQuestion type
}

interface CourseDetailsOutput {
  id: string;
  name: string;
  description?: string | null; // Assuming description might be in module.configuration or a direct column
  lessons: LessonOutput[];
}

interface StudentCourseProgressOutput {
  last_completed_lesson_id?: string | null;
  last_viewed_lesson_sequence?: number | null;
  video_playback_position?: number | null; // Example from plan
  fully_watched_video_ids?: string[]; // Added as per plan
  lesson_quiz_attempts?: Record<string, any[]> | null; // Added for quiz attempts
}

interface CoursePageDataResponse {
  course: CourseDetailsOutput;
  progress: StudentCourseProgressOutput;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    // Properly extract moduleId from params, ensure it's a string
    const moduleId = params?.moduleId;
    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    // Use the existing Supabase client from lib/supabase/server.ts
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Course Module Details
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, name, configuration') // Assuming description might be in configuration
      .eq('id', moduleId)
      .eq('type', 'Course') // Fixed: Use 'Course' with capital C to match database values
      .maybeSingle(); // Use maybeSingle() instead of single() to handle "no rows" case gracefully

    if (moduleError && moduleError.code !== 'PGRST116') { // PGRST116: no rows returned
      console.error(`Error fetching module ${moduleId}:`, moduleError);
      return NextResponse.json({ error: 'Failed to fetch course details', details: moduleError.message }, { status: 500 });
    }
    
    if (!moduleData) {
      return NextResponse.json({ error: 'Course module not found or not a course type' }, { status: 404 });
    }

    // Attempt to get description from configuration if it exists, otherwise use a placeholder or module name.
    // This part is an assumption based on the schema lacking a direct 'description' column on 'modules'.
    const moduleDescription = moduleData.configuration?.description || 'No description provided.';


    // 2. Fetch Lessons for the Module
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, description, video_url, sequence, has_quiz, quiz_questions') // Added has_quiz to the select
      .eq('module_id', moduleId)
      .order('sequence', { ascending: true });

    if (lessonsError) {
      console.error(`Error fetching lessons for module ${moduleId}:`, lessonsError);
      return NextResponse.json({ error: 'Failed to fetch lessons', details: lessonsError.message }, { status: 500 });
    }

    // Debugging: Log a sample quiz question to understand its structure
    if (lessonsData && lessonsData.length > 0 && lessonsData[0].quiz_questions) {
      console.log('Sample quiz question:', lessonsData[0].quiz_questions[0]);
    }

    // Ensure lessonsData is an array and cast quiz_questions if necessary
    const lessons: LessonOutput[] = (lessonsData || []).map(lesson => {
      // Process quiz questions to remove correct answers and unnecessary fields
      let processedQuizQuestions: QuizQuestion[] | null = null;
      
      // Check if the lesson has a quiz (using both has_quiz flag and quiz_questions)
      if (lesson.has_quiz === true || (lesson.quiz_questions && Array.isArray(lesson.quiz_questions) && lesson.quiz_questions.length > 0)) {
        // If has_quiz is true but quiz_questions is empty or null, return an empty array
        if (!lesson.quiz_questions || !Array.isArray(lesson.quiz_questions) || lesson.quiz_questions.length === 0) {
          processedQuizQuestions = [];
        } else {
          // Process existing quiz questions
          processedQuizQuestions = lesson.quiz_questions.map(question => {
            // Convert database field names to frontend expected field names
            return {
              id: question.id,
              // Map question_text to text (what frontend expects)
              text: question.question_text,
              // Map question_type to type (what frontend expects) 
              type: question.question_type,
              // Keep options as is, but ensure it's an array
              options: Array.isArray(question.options) ? question.options : [],
              // Deliberately omit the correct_answer field for security
            };
          });
        }
      }

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        video_url: lesson.video_url,
        sequence: lesson.sequence,
        has_quiz: !!lesson.has_quiz, // Ensure boolean type with double negation
        quiz_questions: processedQuizQuestions,
      };
    });

    // 3. Fetch Student's Progress for this Module
    let studentProgress: StudentCourseProgressOutput = {
      // Default progress if none found
      last_viewed_lesson_sequence: 0, // Start at first lesson if no progress
      fully_watched_video_ids: [], // Initialize as empty array
    };

    const { data: progressData, error: progressError } = await supabase
      .from('student_module_progress')
      .select('progress_details') // progress_details is JSONB
      .eq('student_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle(); // Use maybeSingle() to handle "no rows" gracefully

    if (progressError && progressError.code !== 'PGRST116') { // PGRST116: no rows returned
      console.error(`Error fetching progress for module ${moduleId}, student ${user.id}:`, progressError);
      // Don't fail the whole request, just return default progress
    }

    if (progressData && progressData.progress_details) {
      const details = progressData.progress_details as any; // Cast to any to access dynamic properties
      studentProgress = {
        last_completed_lesson_id: details.last_completed_lesson_id,
        last_viewed_lesson_sequence: details.last_viewed_lesson_sequence,
        video_playback_position: details.video_playback_position,
        fully_watched_video_ids: details.fully_watched_video_ids || [], // Ensure it defaults to an empty array
        lesson_quiz_attempts: details.lesson_quiz_attempts || null, // Extract quiz attempts
      };
    }
    
    // Ensure last_viewed_lesson_sequence is at least 0 if not set or null
    if (studentProgress.last_viewed_lesson_sequence === undefined || studentProgress.last_viewed_lesson_sequence === null) {
        studentProgress.last_viewed_lesson_sequence = 0;
    }


    const responsePayload: CoursePageDataResponse = {
      course: {
        id: moduleData.id,
        name: moduleData.name,
        description: moduleDescription,
        lessons: lessons,
      },
      progress: studentProgress,
    };

    return NextResponse.json(responsePayload);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/courses/[moduleId]/content:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
  }
} 