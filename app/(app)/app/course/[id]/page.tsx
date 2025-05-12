'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { updateCourseProgressAction, type CourseProgressUpdateData } from '@/app/actions/progress';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AnimatedCard } from '@/components/ui/animated-card';
import { cn } from '@/lib/utils';
import { Check, CheckCircle, PlayCircleIcon, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import CustomVideoPlayer from '@/components/common/CustomVideoPlayer';
import type ReactPlayer from 'react-player/file';

// Updated types to include quiz questions
interface QuizQuestionOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  type: 'MCQ' | 'MSQ' | 'TF';
  options: QuizQuestionOption[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  sequence: number;
  quiz_questions?: QuizQuestion[] | null;
  has_quiz?: boolean;
}

interface CourseDetails {
  id: string;
  name: string;
  description?: string;
  lessons: Lesson[];
}

// Type for a summary of a quiz attempt, can be expanded
interface QuizAttemptSummary {
  submitted_at: string;
  answers: CurrentQuizAnswers; // Store the answers for this attempt
  score?: number; 
  total_questions_in_quiz?: number;
  pass_fail_status?: 'passed' | 'failed';
  timeTakenSeconds?: number; // Added to store time taken
}

interface StudentCourseProgress {
  last_completed_lesson_id?: string;
  last_viewed_lesson_sequence?: number;
  video_playback_position?: number;
  fully_watched_video_ids?: string[];
  lesson_quiz_attempts?: Record<string, QuizAttemptSummary[] | undefined>;
  status?: 'NotStarted' | 'InProgress' | 'Completed'; // Added status field
}

interface CoursePageData {
  course: CourseDetails;
  progress: StudentCourseProgress;
}

// Type for locally managed quiz answers during an attempt
interface CurrentQuizAnswers {
  [questionId: string]: string | string[]; // string for MCQ/TF, string[] for MSQ
}

// Skeleton Loader Component
const CoursePlayerSkeleton = () => (
  <div className="container mx-auto p-4 animate-pulse">
    <header className="mb-6">
      <div className="h-8 bg-neutral-300 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2"></div>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <aside className="md:col-span-1">
        <div className="h-6 bg-neutral-300 dark:bg-neutral-700 rounded w-1/4 mb-4"></div>
        <div className="rounded-md bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-white/20 dark:border-neutral-800/30">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 border-b border-neutral-200 dark:border-neutral-800/30">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-neutral-400 dark:bg-neutral-600 mr-2"></div>
                <div className="h-4 bg-neutral-400 dark:bg-neutral-600 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="md:col-span-3">
        <AnimatedCard className="overflow-hidden border border-white/20 dark:border-neutral-800/30">
          <div className="p-4">
            <div className="h-7 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2 mb-3"></div>
            <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-5/6 mb-4"></div>
            <div className="aspect-video bg-neutral-300 dark:bg-neutral-600 rounded-md mb-4"></div>
          <div className="flex justify-between mt-6">
              <div className="h-10 bg-neutral-300 dark:bg-neutral-700 rounded w-1/4"></div>
              <div className="h-10 bg-neutral-300 dark:bg-neutral-700 rounded w-1/4"></div>
            </div>
          </div>
        </AnimatedCard>
      </main>
    </div>
    <section className="mt-6">
      <AnimatedCard className="p-4 overflow-hidden border border-white/20 dark:border-neutral-800/30">
        <div className="h-5 bg-neutral-300 dark:bg-neutral-700 rounded w-1/3 mb-2"></div>
        <div className="w-full bg-neutral-300 dark:bg-neutral-600 rounded-full h-4 mb-2">
          <div className="bg-neutral-400 dark:bg-neutral-500 h-4 rounded-full w-1/2"></div>
      </div>
        <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2"></div>
      </AnimatedCard>
    </section>
  </div>
);

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string; // The dynamic segment [id] from the folder structure
  const playerRef = useRef<ReactPlayer>(null);

  const [coursePageData, setCoursePageData] = useState<CoursePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]); // Tracks lessons where student clicked "Mark as Completed" or video ended
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);

  // Quiz specific state
  const [quizTimeLeft, setQuizTimeLeft] = useState<number | null>(null); // Time in seconds
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuizAnswers, setCurrentQuizAnswers] = useState<CurrentQuizAnswers>({});
  const quizTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showQuizSummary, setShowQuizSummary] = useState(false);
  const [lastQuizAttemptData, setLastQuizAttemptData] = useState<QuizAttemptSummary | null>(null);

  const currentLesson = coursePageData?.course.lessons[currentLessonIndex];

  // Derived state: Is the current lesson's video fully watched?
  const isCurrentVideoWatched = useCallback(() => {
    if (!coursePageData || !currentLesson) return false;
    const currentLessonVideoId = currentLesson.id; // Assuming lesson ID is used as video ID for completion tracking
    return coursePageData.progress?.fully_watched_video_ids?.includes(currentLessonVideoId) ?? false;
  }, [coursePageData, currentLesson]);

  // Helper function to determine if a lesson is considered fully completed
  const isLessonConsideredComplete = useCallback((lesson: Lesson): boolean => {
    if (!coursePageData?.progress) return false;

    const isVideoWatched = coursePageData.progress.fully_watched_video_ids?.includes(lesson.id) ?? false;
    if (!isVideoWatched) return false; // Video must always be watched first

    if (lesson.quiz_questions && lesson.quiz_questions.length > 0) {
      // If there's a quiz, video must be watched AND quiz must have a 'passed' attempt
      const attempts = coursePageData.progress.lesson_quiz_attempts?.[lesson.id];
      if (attempts && attempts.length > 0) {
        return attempts.some(attempt => attempt.pass_fail_status === 'passed');
      }
      return false; // No attempts or no passed attempts
    }
    // If no quiz, only video watch status matters (already checked)
    return true;
  }, [coursePageData?.progress]);

  // Add a function to check if the current lesson quiz has been passed
  const hasPassedCurrentQuiz = useCallback(() => {
    if (!coursePageData?.progress?.lesson_quiz_attempts || !currentLesson) return false;
    
    const attempts = coursePageData.progress.lesson_quiz_attempts[currentLesson.id];
    if (!attempts || attempts.length === 0) return false;
    
    // Check if any attempt has a 'passed' status
    return attempts.some(attempt => attempt.pass_fail_status === 'passed');
  }, [coursePageData?.progress?.lesson_quiz_attempts, currentLesson]);

  // Get the latest quiz attempt for the current lesson
  const getLatestQuizAttempt = useCallback(() => {
    if (!coursePageData?.progress?.lesson_quiz_attempts || !currentLesson) return null;
    
    const attempts = coursePageData.progress.lesson_quiz_attempts[currentLesson.id];
    if (!attempts || attempts.length === 0) return null;
    
    // Sort by submitted_at in descending order and return the first (most recent)
    return [...attempts].sort((a, b) => 
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    )[0];
  }, [coursePageData?.progress?.lesson_quiz_attempts, currentLesson]);

  // Fetch course content and progress
  useEffect(() => {
    if (!moduleId) {
      setIsLoading(false);
      setError("Module ID is missing.");
      return;
    }

    const fetchCourseContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // API endpoint as per the plan: GET /api/app/courses/[moduleId]/content
        const response = await fetch(`/api/app/courses/${moduleId}/content`);
        
        if (!response.ok) {
          const errorData = await response.text(); // Try to get more error info
          throw new Error(`Failed to fetch course content: ${response.status} ${response.statusText}. ${errorData}`);
        }
        
        const data: CoursePageData = await response.json();
        setCoursePageData(data);

        // Set current lesson based on progress (if any)
        // Ensure last_viewed_lesson_sequence is valid and within bounds
        const lessonsCount = data.course?.lessons?.length || 0;
        let initialLessonIndex = 0;
        if (data.progress?.last_viewed_lesson_sequence !== undefined) {
          initialLessonIndex = data.progress.last_viewed_lesson_sequence;
        }
        // Clamp the index to be within valid range
        if (lessonsCount > 0) {
          setCurrentLessonIndex(Math.max(0, Math.min(initialLessonIndex, lessonsCount - 1)));
        } else {
          setCurrentLessonIndex(0);
        }

        // Initialize completed lessons (this might need refinement based on how true completion is defined)
        // For now, this is a UI hint, actual completion comes from `fully_watched_video_ids` or quiz submissions.
        if (data.progress?.last_completed_lesson_id) {
          // This might be deprecated if `fully_watched_video_ids` becomes the primary source of truth for lesson completion.
          // setCompletedLessonIds([data.progress.last_completed_lesson_id]); 
        }
        if (data.progress?.fully_watched_video_ids) {
          setCompletedLessonIds(data.progress.fully_watched_video_ids); // Sync with fully watched videos
        }

      } catch (err) {
        console.error("Error fetching course content:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching course data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseContent();
  }, [moduleId]);

  // When current lesson changes, seek to the saved video position if available
  // Also reset quiz state if moving to a new lesson
  useEffect(() => {
    if (playerRef.current && currentLesson?.video_url) {
      setIsVideoPlaying(false); 
      // playerRef.current.getInternalPlayer()?.load(); // If direct load is needed for new src

      const seekPosition = coursePageData?.progress?.video_playback_position ?? 0;
      if (playerRef.current.getCurrentTime() !== seekPosition && Math.abs((playerRef.current.getCurrentTime() || 0) - seekPosition) > 1) {
        playerRef.current.seekTo(seekPosition);
      }
    }
    setIsQuizActive(false);
    setCurrentQuizAnswers({});
    setQuizTimeLeft(null);
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);

  }, [currentLessonIndex, coursePageData, currentLesson?.video_url]);

  // Save progress to the server using Server Action
  const saveProgress = useCallback(async (data: Partial<Omit<CourseProgressUpdateData, 'moduleId'>>) => {
    if (!moduleId || !coursePageData) return false; // Return boolean for consistency

      setIsSaving(true);
      setSaveMessage("Saving progress...");

    try {
      const payload: CourseProgressUpdateData = {
        moduleId,
        ...data,
      };
      const actionResult = await updateCourseProgressAction(payload);

      if (actionResult.success) {
        setSaveMessage("Progress saved");
        // Optionally update local state with actionResult.data if needed
        if (actionResult.data?.student_module_progress?.progress_details?.fully_watched_video_ids) {
          setCoursePageData(prevData => {
            if (!prevData) return null;
            // This merging logic is now more comprehensively handled in handleQuizSubmit, 
            // but keep a simpler version here for non-quiz saves.
            const incomingProgressDetails = actionResult.data?.student_module_progress?.progress_details;
            return {
              ...prevData,
              progress: {
                ...prevData.progress,
                fully_watched_video_ids: incomingProgressDetails?.fully_watched_video_ids || prevData.progress.fully_watched_video_ids,
                last_viewed_lesson_sequence: incomingProgressDetails?.last_viewed_lesson_sequence ?? prevData.progress.last_viewed_lesson_sequence,
                video_playback_position: incomingProgressDetails?.video_playback_position ?? prevData.progress.video_playback_position,
                last_completed_lesson_id: incomingProgressDetails?.last_completed_lesson_id || prevData.progress.last_completed_lesson_id,
              },
            };
          });
        }
        // Check for overall course completion after any progress save
        if (actionResult.data?.student_module_progress?.status === 'Completed') {
          setIsCourseCompleted(true);
        }

        setTimeout(() => setSaveMessage(null), 2000); // Clear message after 2 seconds
        return true;
      } else {
        console.error('Error saving progress via Server Action:', actionResult.error, actionResult.errorDetails);
        setSaveMessage(`Failed to save progress: ${actionResult.error || 'Unknown error'}`);
        return false;
      }
    } catch (err) {
      console.error('Exception saving progress via Server Action:', err);
      setSaveMessage("Failed to save progress due to an exception.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [moduleId, coursePageData]);

  // Calculate progress percentage based on lesson completion (using fully_watched_video_ids as a proxy for now)
  const calculateProgressPercentage = useCallback(() => {
    if (!coursePageData?.course.lessons.length) return 0;
    const watchedCount = coursePageData.progress?.fully_watched_video_ids?.length || 0;
    return Math.floor(
      (watchedCount / coursePageData.course.lessons.length) * 100
    );
  }, [coursePageData]);

  // Handle navigation to a specific lesson
  const navigateToLesson = useCallback(async (index: number) => {
    if (!coursePageData?.course.lessons || !moduleId || index === currentLessonIndex) return;
    
    if (index >= 0 && index < coursePageData.course.lessons.length) {
      // Save the current video position before navigating away
      if (playerRef.current && currentLesson?.video_url) {
        await saveProgress({
          current_lesson_sequence: currentLessonIndex,
          video_playback_position: playerRef.current.getCurrentTime(),
          status: 'InProgress', // Keep status as InProgress, completion is handled differently
          progress_percentage: calculateProgressPercentage(),
        });
      }
      
      // Update the current lesson index
      setCurrentLessonIndex(index);
      
      // Save the new current lesson view in progress (just viewing, not completion)
      await saveProgress({
        current_lesson_sequence: index,
        // current_lesson_id: coursePageData.course.lessons[index].id, // Not marking as completed here
        status: 'InProgress',
        progress_percentage: calculateProgressPercentage(),
      });
    }
  }, [coursePageData, moduleId, currentLessonIndex, currentLesson, saveProgress, calculateProgressPercentage]);

  // Handle next/previous lesson navigation
  const goToNextLesson = useCallback(() => {
    if (coursePageData?.course.lessons && currentLessonIndex < coursePageData.course.lessons.length - 1) {
      navigateToLesson(currentLessonIndex + 1);
    }
  }, [coursePageData, currentLessonIndex, navigateToLesson]);

  const goToPreviousLesson = useCallback(() => {
    if (currentLessonIndex > 0) {
      navigateToLesson(currentLessonIndex - 1);
    }
  }, [currentLessonIndex, navigateToLesson]);

  // Mark a lesson as completed (video watched)
  const markVideoAsCompleted = useCallback(async (lessonId: string) => {
    if (!coursePageData?.progress?.fully_watched_video_ids?.includes(lessonId)) {
      await saveProgress({
        current_lesson_id: lessonId, // Could be used for last_completed_lesson_id if still needed
        current_lesson_sequence: currentLessonIndex,
        lessonVideoIdCompleted: lessonId,
        status: 'InProgress', // Overall course status might remain InProgress
        progress_percentage: calculateProgressPercentage(), // Recalculate based on new completion
      });
      // Update local completedLessonIds for immediate UI feedback if `saveProgress` doesn't refresh it fast enough
      // Or rely on the `saveProgress` to update `coursePageData.progress.fully_watched_video_ids`
      setCompletedLessonIds(prev => prev.includes(lessonId) ? prev : [...prev, lessonId]);
    }
  }, [coursePageData, currentLessonIndex, saveProgress, calculateProgressPercentage]);

  // Handle video events (play, pause, timeupdate, ended)
  const handleVideoTimeUpdate = useCallback(() => {
    if (!playerRef.current || isSaving) return;
    
    const currentTime = playerRef.current.getCurrentTime();
    const duration = playerRef.current.getDuration();
    
    if (duration && currentTime > 0) {
      const saveInterval = 30; // seconds
      const timeSinceLastSave = Math.floor(currentTime) % saveInterval;
      const lastKnownPosition = coursePageData?.progress?.video_playback_position ?? 0;
      
      // Save every 30 seconds if position changed significantly, or if near the end
      if ( (timeSinceLastSave === 0 && Math.abs(currentTime - lastKnownPosition) > 1) || 
           (currentTime / duration > 0.95 && currentTime < duration) // Avoid saving if already ended and handled by onEnded
         ) {
        saveProgress({
          current_lesson_sequence: currentLessonIndex,
          video_playback_position: currentTime,
          status: 'InProgress',
          progress_percentage: calculateProgressPercentage(),
        });
      }
    }
  }, [currentLessonIndex, saveProgress, calculateProgressPercentage, coursePageData, isSaving]);

  const handleVideoEnded = useCallback(() => {
    if (!currentLesson) return;
    console.log(`Video ended for lesson: ${currentLesson.title}`);
    markVideoAsCompleted(currentLesson.id);
    setIsVideoPlaying(false); // Video ended, so it's not playing
    // Auto-navigate to next lesson or handle course completion logic could go here
    // if (currentLessonIndex < (coursePageData?.course.lessons.length || 0) - 1) {
    //   goToNextLesson();
    // }
  }, [currentLesson, markVideoAsCompleted]);

  // Quiz Timer Logic
  useEffect(() => {
    if (isQuizActive && quizTimeLeft !== null && quizTimeLeft > 0) {
      quizTimerRef.current = setTimeout(() => {
        setQuizTimeLeft(prevTime => (prevTime !== null ? prevTime - 1 : null));
      }, 1000);
    } else if (isQuizActive && quizTimeLeft === 0) {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      console.log("Quiz time ended! Submitting answers...");
      handleQuizSubmit(); // Auto-submit when timer ends
    }
    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    };
  }, [isQuizActive, quizTimeLeft]);

  const startQuiz = () => {
    if (!currentLesson) return;
    
    // Check if the student has already passed this quiz
    if (hasPassedCurrentQuiz()) {
      setSaveMessage("You've already passed this quiz. No need to retake it.");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    
    // Check both has_quiz flag and quiz_questions to determine if a quiz should be shown
    const hasQuiz = currentLesson.has_quiz || (currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0);
    if (!hasQuiz || !isCurrentVideoWatched()) return;
    
    setIsQuizActive(true);
    setCurrentQuizAnswers({}); // Reset answers for new attempt
    setQuizTimeLeft(120); // 2 minutes in seconds
    console.log("Quiz started for lesson: ", currentLesson.title);
  };

  const handleQuizAnswerChange = (questionId: string, optionId: string, isMultiSelect: boolean) => {
    setCurrentQuizAnswers(prevAnswers => {
      const newAnswers = { ...prevAnswers };
      if (isMultiSelect) {
        const currentSelection = (newAnswers[questionId] as string[] || []);
        if (currentSelection.includes(optionId)) {
          newAnswers[questionId] = currentSelection.filter(id => id !== optionId);
        } else {
          newAnswers[questionId] = [...currentSelection, optionId];
        }
      } else {
        newAnswers[questionId] = optionId;
      }
      return newAnswers;
    });
  };

  const handleQuizSubmit = async () => {
    if (!moduleId || !currentLesson) return;
    
    const timeTaken = 120 - (quizTimeLeft || 0);
    const submittedAnswers = { ...currentQuizAnswers }; 

    setIsQuizActive(false); 
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    // setQuizTimeLeft(null); // Keep time for display in summary if needed, or reset later

    console.log("Submitting quiz for lesson:", currentLesson.id, "Answers:", submittedAnswers, "Time taken:", timeTaken);
    setSaveMessage("Submitting quiz...");
    setIsSaving(true);

    try {
      const actionResult = await updateCourseProgressAction({
        moduleId,
        lesson_quiz_submission: {
          lessonId: currentLesson.id,
          answers: submittedAnswers,
          time_taken_seconds: timeTaken,
        },
      });

      if (actionResult.success && actionResult.data?.quiz_result) {
        const { score, total_questions_in_quiz, pass_fail_status, submitted_at } = actionResult.data.quiz_result;
        
        setLastQuizAttemptData({ 
          answers: submittedAnswers, 
          timeTakenSeconds: timeTaken, // Keep original time taken for summary display consistency
          score, 
          total_questions_in_quiz, 
          pass_fail_status, 
          submitted_at 
        });
        setShowQuizSummary(true);
        setCurrentQuizAnswers({}); // Clear answers for next potential attempt

        // Check for overall course completion after quiz pass and progress update
        if (actionResult.data?.student_module_progress?.status === 'Completed') {
          setIsCourseCompleted(true);
        }

        if (pass_fail_status === 'passed') {
          setSaveMessage(`Quiz Passed! Score: ${score}/${total_questions_in_quiz}`);
          // Update student_module_progress with the full data from server, which now includes this attempt
          if (actionResult.data?.student_module_progress) { // Check if student_module_progress exists
            setCoursePageData(prevData => {
              if (!prevData) return null;
              // Merge new progress details carefully
              const incomingProgressDetails = actionResult.data?.student_module_progress?.progress_details;
              const updatedProgressDetails = {
                ...prevData.progress,
                ...(incomingProgressDetails || {}),
                 // Ensure lesson_quiz_attempts are correctly merged/updated if server sends whole object
                lesson_quiz_attempts: incomingProgressDetails?.lesson_quiz_attempts || prevData.progress.lesson_quiz_attempts,
                last_completed_lesson_id: incomingProgressDetails?.last_completed_lesson_id || prevData.progress.last_completed_lesson_id,
                fully_watched_video_ids: incomingProgressDetails?.fully_watched_video_ids || prevData.progress.fully_watched_video_ids,
              };
              return {
                ...prevData,
                progress: updatedProgressDetails as StudentCourseProgress, // Cast if sure about structure
              };
            });
          }
          // Auto-advance to next lesson is handled by the summary dismissal / continue button for now
        } else { // Failed
          setSaveMessage(`Quiz Failed. Score: ${score}/${total_questions_in_quiz}. Please try again.`);
          setQuizTimeLeft(null); // Reset timer explicitly for retry
          // UI should allow retrying (e.g. Start Quiz button becomes active again after summary)
        }

        // Refresh completedLessonIds based on new progress state, which is updated by setCoursePageData
        // This ensures isLessonConsideredComplete has the latest data after quiz submission
        if (actionResult.data?.student_module_progress?.progress_details?.fully_watched_video_ids) {
           setCompletedLessonIds(actionResult.data.student_module_progress.progress_details.fully_watched_video_ids);
        }

      } else {
        setSaveMessage(`Failed to submit quiz: ${actionResult.error || 'Unknown error'}`);
        console.error('Failed to submit quiz:', actionResult.error, actionResult.errorDetails);
        setIsQuizActive(true); // Allow retry if submission itself failed
        // quizTimeLeft is not reset here, user might resume if it was a network error
      }
    } catch (err) {
      console.error("Error submitting quiz via Server Action:", err);
      setSaveMessage("Failed to submit quiz due to an exception.");
      setIsQuizActive(true); // Allow retry
      // quizTimeLeft is not reset here
    } finally {
      setIsSaving(false);
      // Message handling is now part of the summary display or specific pass/fail messages
      // setTimeout(() => setSaveMessage(null), 3000); // Remove generic timeout
    }
  };

  const handleTogglePlayPause = () => {
    if (!playerRef.current) return;
    if (isVideoPlaying) {
      playerRef.current.getInternalPlayer()?.pause();
    } else {
      playerRef.current.getInternalPlayer()?.play();
    }
    // setIsVideoPlaying(!isVideoPlaying); // The onPlay/onPause handlers on video will manage this
  };

  if (isLoading) {
    return <CoursePlayerSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <AnimatedCard className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300">
          <div className="p-6 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </AnimatedCard>
      </div>
    );
  }

  if (!coursePageData || !coursePageData.course) {
    return (
      <div className="container mx-auto p-4">
        <AnimatedCard className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 backdrop-blur-sm text-amber-700 dark:text-amber-300">
          <div className="p-6 text-center">
            <p>Course not found or not available.</p>
            <Button 
              onClick={() => router.push('/app/dashboard')}
              className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
            >
              Return to Dashboard
            </Button>
          </div>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-400">
          {coursePageData.course.name}
        </h1>
        {coursePageData.course.description && (
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            {coursePageData.course.description}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Lessons sidebar */}
        <aside className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-4 text-neutral-800 dark:text-white">Lessons</h2>
          <div className="rounded-md overflow-hidden bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-white/20 dark:border-neutral-800/30">
            {coursePageData.course.lessons.map((lesson, index) => {
              const isComplete = isLessonConsideredComplete(lesson);
              const isCurrent = index === currentLessonIndex;
              
              return (
                <button
                    key={lesson.id} 
                  onClick={() => setCurrentLessonIndex(index)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-neutral-200 dark:border-neutral-800/30 flex items-center transition-colors",
                    isCurrent 
                      ? "bg-neutral-100/80 dark:bg-neutral-800/50" 
                      : "hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30",
                    isComplete 
                      ? "text-neutral-800 dark:text-neutral-200" 
                      : "text-neutral-600 dark:text-neutral-400"
                  )}
                >
                  <div className="mr-3 flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-neutral-400 dark:border-neutral-600 flex items-center justify-center">
                        <span className="text-xs">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "line-clamp-2",
                    isCurrent ? "font-semibold" : ""
                  )}>
                        {lesson.title}
                      </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content area */}
        <main className="md:col-span-3">
          {currentLesson && (
            <AnimatedCard className="overflow-hidden border border-white/20 dark:border-neutral-800/30">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800/30">
                <h2 className="text-xl font-semibold text-neutral-800 dark:text-white">
                  {currentLesson.title}
                </h2>
                {currentLesson.description && (
                  <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                    {currentLesson.description}
                  </p>
                )}
              </div>
              
              <div className="p-5">
              {currentLesson.video_url && (
                  <CustomVideoPlayer 
                    url={currentLesson.video_url}
                    playerRef={playerRef}
                    onPlay={() => {
                        setIsVideoPlaying(true);
                        if (currentLesson?.id) saveProgress({ current_lesson_id: currentLesson.id, status: 'InProgress' });
                    }}
                    onPause={() => {
                        setIsVideoPlaying(false);
                        if (playerRef.current && currentLesson?.id) {
                            saveProgress({
                                current_lesson_id: currentLesson.id,
                                video_playback_position: playerRef.current.getCurrentTime(),
                                status: 'InProgress'
                            });
                        }
                    }}
                    onEnded={() => {
                      setIsVideoPlaying(false);
                      if (currentLesson.id) {
                        // Mark video as watched on end
                        if (!completedLessonIds.includes(currentLesson.id)) {
                          setCompletedLessonIds(prev => [...prev, currentLesson.id]);
                          // Also save this completion
                          saveProgress({
                            lessonVideoIdCompleted: currentLesson.id,
                            status: 'InProgress' // Or check if course is now completed
                          });
                        }
                      }
                    }}
                    onProgress={(state) => {
                        // Optional: handle progress updates for more granular saving if needed
                        // For example, save every X seconds as you were doing with handleVideoTimeUpdate
                        // This is now handled by the onPause event primarily for simplicity
                        // but you can re-implement periodic saving here based on state.playedSeconds
                         if (!isSaving && state.playedSeconds > 0 && state.playedSeconds < (playerRef.current?.getDuration() || 0)) {
                            const saveInterval = 30; // seconds
                            const timeSinceLastSave = Math.floor(state.playedSeconds) % saveInterval;
                            const lastKnownPosition = coursePageData?.progress?.video_playback_position ?? 0;

                            if ( (timeSinceLastSave === 0 && Math.abs(state.playedSeconds - lastKnownPosition) > 1) || 
                                 (state.playedSeconds / (playerRef.current?.getDuration() || 1) > 0.95) 
                               ) {
                              saveProgress({
                                current_lesson_sequence: currentLessonIndex,
                                video_playback_position: state.playedSeconds,
                                status: 'InProgress',
                                progress_percentage: calculateProgressPercentage(),
                              });
                            }
                        }
                    }}
                    initialSeek={coursePageData?.progress?.video_playback_position ?? 0}
                  />
                )}

                {/* Quiz section */}
                {currentLesson && (
                  <div className="mt-6">
                    {/* Quiz activation/status area */}
                    {(currentLesson.has_quiz || (currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0)) && (
                      <div className="mt-6 border rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900/50">
                        <h3 className="text-lg font-semibold mb-2">Lesson Quiz</h3>
                        
                        {/* Show "Already Passed" or "Start Quiz" button */}
                        {!isQuizActive && isCurrentVideoWatched() && (
                          <div>
                            {hasPassedCurrentQuiz() ? (
                              // Already passed quiz message
                              <div className="p-4 border rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                                <div className="flex items-center">
                                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                                  <p>You've successfully passed this quiz!</p>
                                </div>
                                {getLatestQuizAttempt() && (
                                  <div className="mt-2 text-sm">
                                    <p>Last score: {getLatestQuizAttempt()?.score}/{getLatestQuizAttempt()?.total_questions_in_quiz}</p>
                                    <p>Completed on: {new Date(getLatestQuizAttempt()?.submitted_at || '').toLocaleDateString()}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Normal quiz start
                              <>
                                <p className="mb-4 text-neutral-600 dark:text-neutral-400">
                                  Complete this quiz to test your understanding of the lesson.
                                </p>
                                <Button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700 text-white">
                                  {getLatestQuizAttempt()?.pass_fail_status === 'failed' ? 'Retry Quiz' : 'Start Quiz'}
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Show active quiz */}
                        {isQuizActive && currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0 && (
                          <div className="space-y-6">
                            {/* Timer */}
                            <div className="flex items-center justify-between mb-4">
                              <span className="font-medium">Time Remaining:</span>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-amber-600 dark:text-amber-400" />
                                <span className={`font-mono ${quizTimeLeft && quizTimeLeft < 30 ? 'text-red-600 dark:text-red-400 animate-pulse' : ''}`}>
                                  {quizTimeLeft !== null ? `${Math.floor(quizTimeLeft / 60)}:${(quizTimeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Questions */}
                            <div className="space-y-8">
                              {currentLesson.quiz_questions.map((question, qIndex) => (
                                <Card key={question.id} className="p-4">
                                  <div className="font-semibold mb-3">{qIndex + 1}. {question.text}</div>
                                  <div className="space-y-2">
                                    {question.options.map(option => {
                                      // Check if this option is selected (handling both single and multi-select)
                                      const optionIsSelected = 
                                        Array.isArray(currentQuizAnswers[question.id]) 
                                          ? (currentQuizAnswers[question.id] as string[]).includes(option.id)
                                          : currentQuizAnswers[question.id] === option.id;
                                      
                                      return (
                                        <div 
                                          key={option.id}
                                          className={`p-3 border rounded cursor-pointer transition ${
                                            optionIsSelected 
                                              ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30' 
                                              : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                                          }`}
                                          onClick={() => handleQuizAnswerChange(
                                            question.id, 
                                            option.id, 
                                            question.type === 'MSQ'
                                          )}
                                        >
                                          {option.text}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </Card>
                              ))}
                            </div>
                            
                            {/* Submit Button */}
                            <div className="flex justify-center mt-4">
                              <Button 
                                onClick={handleQuizSubmit}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isSaving}
                              >
                                {isSaving ? 'Submitting...' : 'Submit Quiz'}
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Show message if quiz is active but no questions found */}
                        {isQuizActive && (!currentLesson.quiz_questions || currentLesson.quiz_questions.length === 0) && (
                          <div className="text-center p-4">
                            <p className="text-amber-600 dark:text-amber-400">
                              This quiz has no questions yet. Please contact your instructor.
                            </p>
                          </div>
                        )}
                        
                        {/* Message for when video hasn't been watched but quiz exists */}
                        {!isQuizActive && !isCurrentVideoWatched() && (
                          <p className="text-neutral-600 dark:text-neutral-400">
                            You need to complete watching the video before taking the quiz.
                          </p>
                        )}
                        
                        {/* Quiz result/summary */}
                        {showQuizSummary && lastQuizAttemptData && (
                          <div className="mt-4 p-4 border rounded bg-white dark:bg-neutral-800/50">
                            <h4 className="font-semibold mb-2">Quiz Results</h4>
                            <p className={`text-lg font-medium ${
                              lastQuizAttemptData.pass_fail_status === 'passed' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {lastQuizAttemptData.pass_fail_status === 'passed' ? 'Passed!' : 'Failed'}
                            </p>
                            <p>Score: {lastQuizAttemptData.score}/{lastQuizAttemptData.total_questions_in_quiz}</p>
                            <p>Time taken: {Math.floor(lastQuizAttemptData.timeTakenSeconds! / 60)}:{(lastQuizAttemptData.timeTakenSeconds! % 60).toString().padStart(2, '0')}</p>
                            <div className="mt-4">
                              <Button 
                                onClick={() => {
                                  setShowQuizSummary(false);
                                  if (lastQuizAttemptData.pass_fail_status === 'passed' && currentLessonIndex < coursePageData.course.lessons.length - 1) {
                                    // Auto-advance to next lesson on pass if not the last lesson
                                    setCurrentLessonIndex(prev => prev + 1);
                                  }
                                }}
                                variant="outline"
                                className="w-full"
                              >
                                {lastQuizAttemptData.pass_fail_status === 'passed' ? 'Continue' : 'Try Again'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentLessonIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentLessonIndex === 0}
                    className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous Lesson
                  </Button>
                  
                  {currentLessonIndex < coursePageData.course.lessons.length - 1 ? (
                    <Button 
                      onClick={() => setCurrentLessonIndex(prev => Math.min(coursePageData.course.lessons.length - 1, prev + 1))}
                      className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
                    >
                      Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      className="bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-500 dark:to-emerald-600 dark:hover:from-emerald-400 dark:hover:to-emerald-500 text-white"
                    >
                      Complete Course <Check className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </AnimatedCard>
          )}
        </main>
      </div>

      {/* Progress section */}
      <section className="mt-6">
        <AnimatedCard className="p-5 overflow-hidden border border-white/20 dark:border-neutral-800/30">
          <h3 className="text-lg font-semibold mb-3 text-neutral-800 dark:text-white">Course Progress</h3>
          
          <div className="mb-2">
            <Progress 
              value={
                coursePageData.course.lessons.length > 0 
                  ? (completedLessonIds.length / coursePageData.course.lessons.length) * 100 
                  : 0
              } 
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-neutral-700 [&>div]:to-neutral-800 dark:[&>div]:from-neutral-300 dark:[&>div]:to-white"
            />
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">
              {completedLessonIds.length} of {coursePageData.course.lessons.length} lessons completed
            </span>
            <span className="font-medium text-neutral-800 dark:text-white">
              {Math.round((completedLessonIds.length / Math.max(1, coursePageData.course.lessons.length)) * 100)}%
            </span>
        </div>

          {isSaving && (
            <p className="text-sm mt-2 text-neutral-500 dark:text-neutral-400">
              {saveMessage || 'Saving progress...'}
            </p>
          )}
        </AnimatedCard>
      </section>
    </div>
  );
}
