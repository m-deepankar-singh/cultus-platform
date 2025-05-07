'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { updateCourseProgressAction, type CourseProgressUpdateData } from '@/app/actions/progress';

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
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <aside className="md:col-span-1">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="border rounded-md bg-gray-200 dark:bg-gray-750 dark:border-gray-700">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 border-b border-gray-300 dark:border-gray-600">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 mr-2"></div>
                <div className="h-4 bg-gray-400 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="md:col-span-3">
        <div className="border rounded-md p-4 bg-gray-200 dark:bg-gray-750 dark:border-gray-700">
          <div className="h-7 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
          <div className="aspect-video bg-gray-300 dark:bg-gray-600 rounded-md mb-4"></div>
          <div className="flex justify-between mt-6">
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
        </div>
      </main>
    </div>
    <section className="mt-6 p-4 bg-gray-200 dark:bg-gray-750 rounded-md dark:border dark:border-gray-700">
      <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
      <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-4 mb-2">
        <div className="bg-gray-400 dark:bg-gray-500 h-4 rounded-full w-1/2"></div>
      </div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
    </section>
  </div>
);

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string; // The dynamic segment [id] from the folder structure
  const videoRef = useRef<HTMLVideoElement>(null);

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
    if (videoRef.current && currentLesson?.video_url) {
      // Ensure video is reset for custom controls logic if applicable
      setIsVideoPlaying(false); // Reset playing state for new lesson
      // videoRef.current.load(); // Consider if explicit load is needed for new src / controls change

      const seekPosition = coursePageData?.progress?.video_playback_position ?? 0;
      // Only set currentTime if it's different to avoid interrupting playback unnecessarily
      if (Math.abs(videoRef.current.currentTime - seekPosition) > 1) {
        videoRef.current.currentTime = seekPosition;
      }
    }
    // Reset quiz state when lesson changes
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
      if (videoRef.current && currentLesson?.video_url) {
        await saveProgress({
          current_lesson_sequence: currentLessonIndex,
          video_playback_position: videoRef.current.currentTime,
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
    if (!videoRef.current || isSaving) return;
    
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    
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
    if (!currentLesson || !currentLesson.quiz_questions || !isCurrentVideoWatched()) return;
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
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    // setIsVideoPlaying(!isVideoPlaying); // The onPlay/onPause handlers on video will manage this
  };

  if (isLoading) {
    // In a real app, replace with a skeleton loader component
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 text-lg">Loading course content...</div>
        {/* TODO: Implement skeleton UI */}
      </div>
    );
  }

  if (error) {
    // In a real app, replace with a more user-friendly error component
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-600 text-xl mb-4">Error</div>
        <p className="text-center mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!coursePageData || !currentLesson) {
    return <div className="p-4">No course data found for this module, or no lessons available.</div>;
  }

  const { course } = coursePageData;

  // Visual progress indicator
  const visualProgressPercentage = coursePageData.progress?.status === 'Completed' 
    ? 100 
    : calculateProgressPercentage();
  const hasQuiz = currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0;
  const isQuizLocked = hasQuiz && !isCurrentVideoWatched() && !showQuizSummary;
  // For starting quiz, we only care if video is watched for the *current* lesson, not if the lesson is *fully complete* (which might require quiz submission)
  const canStartQuiz = hasQuiz && (coursePageData?.progress?.fully_watched_video_ids?.includes(currentLesson.id) ?? false) && !isQuizActive && !showQuizSummary;

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{course.name}</h1>
        <p className="text-gray-700 dark:text-gray-300">{course.description}</p>
        {saveMessage && (
          <div className={`mt-2 text-sm px-3 py-1 rounded-md inline-block ${
            saveMessage.includes('Failed') 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
              : saveMessage.includes('Saving') || saveMessage.includes('Submitting')
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200'
          }`}>
            {saveMessage}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Lesson Navigation Sidebar */}
        <aside className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Lessons</h2>
          <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
            {course.lessons && course.lessons.length > 0 ? (
              <ul className="divide-y dark:divide-gray-700">
                {course.lessons.map((lesson, index) => (
                  <li 
                    key={lesson.id} 
                    className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${ 
                      index === currentLessonIndex ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 dark:border-blue-400' : ''
                    }`}
                    onClick={() => navigateToLesson(index)}
                  >
                    <div className="flex items-center">
                      <span className={`mr-2 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm 
                        ${(isLessonConsideredComplete(lesson)) 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                        }`}>
                        {(isLessonConsideredComplete(lesson)) ? '✓' : index + 1}
                      </span>
                      <span className={`font-medium ${index === currentLessonIndex ? 'text-blue-700 dark:text-blue-300' : 'dark:text-gray-200'}`}>
                        {lesson.title}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 dark:text-gray-400">No lessons available for this course module.</p>
            )}
          </div>
        </aside>

        {/* Main Content Area - Current Lesson */}
        <main className="md:col-span-3">
          {isCourseCompleted && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl text-center max-w-md w-full">
                <h3 className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-4">Congratulations!</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 sm:text-lg">
                  You have successfully completed the course: <span className="font-semibold">{course.name}</span>.
                </p>
                <button
                  onClick={() => router.push('/app/dashboard')}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-medium"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}

          {currentLesson ? (
            <div className={`border rounded-md p-4 bg-white dark:bg-gray-800 dark:border-gray-700 ${isCourseCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-2xl font-semibold mb-3 dark:text-white">{currentLesson.title}</h2>
              
              {currentLesson.description && (
                <p className="mb-4 text-gray-700 dark:text-gray-300">{currentLesson.description}</p>
              )}
              
              {currentLesson.video_url && (
                <div className="mb-4 aspect-video bg-black rounded-md overflow-hidden relative">
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    src={currentLesson.video_url}
                    controls={isCurrentVideoWatched()} // Show controls only if video has been watched
                    onTimeUpdate={handleVideoTimeUpdate}
                    onEnded={handleVideoEnded}
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    // Consider adding playsInline for better mobile experience
                    playsInline 
                  />
                  {!isCurrentVideoWatched() && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
                      <button
                        onClick={handleTogglePlayPause}
                        className="p-2 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-opacity-90 transition-opacity"
                        aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                      >
                        {isVideoPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                          </svg> // Placeholder, replace with actual play icon if needed
                        )}
                         {/* Using a simpler Play icon for now */}
                        {isVideoPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Display Quiz for lessons with quiz_questions */} 
              {hasQuiz && (
                <div className="mt-6 p-4 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                  <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Lesson Quiz</h3>
                  
                  {isQuizLocked && (
                    <div className="p-4 text-center bg-gray-100 dark:bg-gray-600 rounded-md">
                      <p className="dark:text-gray-300">Please complete the video to unlock the quiz.</p>
                      {/* Lock Icon (optional) */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mt-2 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V10a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6H8V6a2 2 0 114 0v2z" clipRule="evenodd" /></svg>
                    </div>
                  )}

                  {/* This is the correct "Start Quiz" button with all conditions */} 
                  {!isQuizLocked && !isQuizActive && canStartQuiz && (
                    <button
                      onClick={startQuiz}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
                      disabled={isSaving}
                    >
                      Start Quiz (2:00 min)
                    </button>
                  )}
                  
                  {isQuizActive && (
                    <>
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Time Remaining:</p>
                        <p className="text-lg font-semibold text-red-500 dark:text-red-400">
                          {Math.floor((quizTimeLeft || 0) / 60)}:{(quizTimeLeft || 0) % 60 < 10 ? '0' : ''}{(quizTimeLeft || 0) % 60}
                        </p>
                      </div>
                      {currentLesson.quiz_questions!.map((question, qIndex) => (
                        <div key={question.id} className="mb-4 p-3 border-b dark:border-gray-600 last:border-b-0">
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">{qIndex + 1}. {question.text}</p>
                          <div className="space-y-2">
                            {question.options.map(option => (
                              <label key={option.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                                <input 
                                  type={question.type === 'MCQ' || question.type === 'TF' ? 'radio' : 'checkbox'} 
                                  name={`question-${question.id}`}
                                  value={option.id}
                                  checked={question.type === 'MSQ' 
                                    ? (currentQuizAnswers[question.id] as string[] || []).includes(option.id)
                                    : currentQuizAnswers[question.id] === option.id
                                  }
                                  onChange={() => handleQuizAnswerChange(question.id, option.id, question.type === 'MSQ')}
                                  className="form-radio h-4 w-4 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-gray-900"
                                />
                                <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={handleQuizSubmit}
                        className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Submitting...' : 'Submit Quiz'}
                      </button>
                    </>
                  )}
                  
                  {showQuizSummary && lastQuizAttemptData && (
                    <div className={`p-4 text-center rounded-md ${lastQuizAttemptData.pass_fail_status === 'passed' ? 'bg-green-50 dark:bg-green-800' : 'bg-red-50 dark:bg-red-800' }`}>
                      <h4 className={`text-lg font-semibold mb-2 ${lastQuizAttemptData.pass_fail_status === 'passed' ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200' }`}>
                        Quiz {lastQuizAttemptData.pass_fail_status === 'passed' ? 'Passed!' : 'Failed'}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 mb-1">
                        Your score: {lastQuizAttemptData.score}/{lastQuizAttemptData.total_questions_in_quiz}
                      </p>
                      {lastQuizAttemptData.pass_fail_status === 'failed' && (
                        <p className="text-gray-600 dark:text-gray-400 mb-3">You need 4 out of 5 correct answers to pass. Please try again.</p>
                      )}
                      {lastQuizAttemptData.pass_fail_status === 'passed' && (
                         <p className="text-gray-600 dark:text-gray-400 mb-3">Great job! Moving to the next lesson...</p>
                      )}
                      <button
                        onClick={() => {
                          setShowQuizSummary(false);
                          setSaveMessage(null); // Clear any persistent submission messages
                          if (lastQuizAttemptData.pass_fail_status === 'passed') {
                            goToNextLesson(); // Auto-advance if passed
                          } else {
                            // Reset for retry: Ensure Start Quiz button is available
                            setIsQuizActive(false); // Ensures start button can show
                            setQuizTimeLeft(null); // Timer reset for next attempt
                          }
                          setLastQuizAttemptData(null);
                        }}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors dark:bg-blue-600 dark:hover:bg-blue-700"
                      >
                        {lastQuizAttemptData.pass_fail_status === 'passed' ? 'Continue to Next Lesson' : 'Try Again'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Mark as completed button (for non-video/non-quiz lessons or manual completion) - This might be removed or rethought */}
              {/* {!currentLesson.video_url && !hasQuiz && !completedLessonIds.includes(currentLesson.id) && (
                <button
                  onClick={() => markVideoAsCompleted(currentLesson.id)} // Re-purpose or create new for non-video/quiz
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Mark as Completed'}
                </button>
              )} */} 
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={goToPreviousLesson}
                  disabled={currentLessonIndex === 0 || isSaving || isQuizActive || isCourseCompleted}
                  className={`px-4 py-2 rounded transition-colors ${ 
                    currentLessonIndex === 0 || isSaving || isQuizActive || isCourseCompleted
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  }`}
                >
                  Previous Lesson
                </button>
                <button
                  onClick={goToNextLesson}
                  disabled={currentLessonIndex === (course.lessons?.length || 0) - 1 || isSaving || isQuizActive || isCourseCompleted}
                  className={`px-4 py-2 rounded transition-colors ${ 
                    currentLessonIndex === (course.lessons?.length || 0) - 1 || isSaving || isQuizActive || isCourseCompleted
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  }`}
                >
                  Next Lesson
                </button>
              </div>
            </div>
          ) : (
            <div className="border rounded-md p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
              <p className="dark:text-gray-300">Select a lesson from the sidebar to begin or an error occurred loading the lesson.</p>
            </div>
          )}
        </main>
      </div>

      <section className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-md dark:border dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-2 dark:text-white">Your Progress</h3>
        <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-4 mb-2">
          <div
            className="bg-blue-500 dark:bg-blue-400 h-4 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${visualProgressPercentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {visualProgressPercentage}% completed ({coursePageData.progress?.status === 'Completed' ? course.lessons.length : coursePageData.course.lessons.filter(isLessonConsideredComplete).length} of {course.lessons.length} lessons completed)
        </p>
      </section>
    </div>
  );
}
