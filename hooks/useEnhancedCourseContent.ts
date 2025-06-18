import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Enhanced types matching the new API structure for normal courses
interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  type: 'MCQ' | 'MSQ' | 'TF';
  options: QuizOption[];
}

// Enhanced lesson interface with progress information
interface EnhancedLesson {
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

// Enhanced course details
interface EnhancedCourseDetails {
  id: string;
  name: string;
  description?: string | null;
  lessons: EnhancedLesson[];
  lessons_count: number;
  completed_lessons_count: number;
}

// Enhanced progress structure
interface EnhancedCourseProgress {
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

// API response interface
interface EnhancedCourseContentResponse {
  course: EnhancedCourseDetails;
  progress: EnhancedCourseProgress;
}

// Progress saving interfaces
interface SaveProgressRequest {
  lesson_id: string;
  watch_time_seconds: number;
  completion_percentage: number;
  video_completed?: boolean;
  trigger_type: 'manual' | 'auto' | 'completion' | 'pause' | 'seek';
}

interface SaveProgressResponse {
  success: boolean;
  updated_progress: {
    lesson_progress: {
      watch_time_seconds: number;
      completion_percentage: number;
      video_completed: boolean;
    };
    overall_progress: {
      completed_videos_count: number;
      total_videos_count: number;
      overall_completion_percentage: number;
      course_completed: boolean;
    };
  };
  message: string;
}

// Quiz submission interfaces
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

/**
 * Enhanced hook for normal course content with robust progress tracking
 */
export function useEnhancedCourseContent(moduleId: string) {
  return useQuery<EnhancedCourseContentResponse>({
    queryKey: ['enhanced-course-content', moduleId],
    queryFn: async () => {
      const response = await fetch(`/api/app/courses/${moduleId}/content`);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch course content: ${response.status} ${errorData}`);
      }
      return response.json();
    },
    enabled: !!moduleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook for saving course progress
 */
export function useSaveCourseProgress(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation<SaveProgressResponse, Error, SaveProgressRequest>({
    mutationFn: async (progressData: SaveProgressRequest) => {
      const response = await fetch(`/api/app/courses/${moduleId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to save progress: ${response.status} ${errorData}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch course content to get updated progress
      queryClient.invalidateQueries({
        queryKey: ['enhanced-course-content', moduleId]
      });
    },
  });
}

/**
 * Hook for submitting quiz answers
 */
export function useSubmitQuiz(moduleId: string, lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation<QuizSubmissionResponse, Error, QuizSubmissionRequest>({
    mutationFn: async (submissionData: QuizSubmissionRequest) => {
      const response = await fetch(`/api/app/courses/${moduleId}/lessons/${lessonId}/submit-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to submit quiz: ${response.status} ${errorData}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch course content to get updated progress
      queryClient.invalidateQueries({
        queryKey: ['enhanced-course-content', moduleId]
      });
    },
  });
}

// Export types for use in components
export type {
  EnhancedLesson,
  EnhancedCourseDetails,
  EnhancedCourseProgress,
  EnhancedCourseContentResponse,
  SaveProgressRequest,
  SaveProgressResponse,
  QuizSubmissionRequest,
  QuizSubmissionResponse,
  QuestionResult,
  QuizQuestion,
  QuizOption,
}; 