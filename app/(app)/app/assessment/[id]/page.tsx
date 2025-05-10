'use client';

import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

// Define interfaces for the assessment data based on GET /api/app/assessments/[moduleId]/details response
// These might need adjustment based on the actual API response structure.
interface AssessmentQuestionOption {
  id: string;
  text: string;
}

interface AssessmentQuestion {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TF' | 'ShortAnswer' | 'Essay'; // Example types
  options?: AssessmentQuestionOption[];
  // other question properties like points, correct_answer (not sent to client initially)
}

interface AssessmentDetails {
  id: string;
  name: string;
  description?: string;
  time_limit_minutes?: number;
  // other assessment properties like max_attempts, instructions
}

interface InProgressAttempt {
  assessment_progress_id: string;
  started_at: string;
  last_updated: string;
  remaining_time_seconds?: number;
  timer_paused?: boolean;
  saved_answers?: Record<string, any>; // question_id: answer
}

interface AssessmentPageData {
  assessment: AssessmentDetails;
  questions: AssessmentQuestion[];
  in_progress_attempt?: InProgressAttempt | null;
  // Add student eligibility info if API provides it (e.g., remaining_attempts, deadline_passed)
}

const AssessmentPageSkeleton = () => (
  <div className="container mx-auto p-4 animate-pulse">
    <header className="mb-6 py-4">
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
    </header>
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
      <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mt-6"></div>
    </div>
  </div>
);


export default function AssessmentPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string;

  const { 
    data: assessmentPageData, 
    isLoading, 
    isError, 
    error 
  } = useQuery<AssessmentPageData | null, Error>({
    queryKey: queryKeys.assessmentDetails(moduleId),
    queryFn: async () => {
    if (!moduleId) {
        throw new Error("Module ID is missing.");
      }
      const result = await apiClient<AssessmentPageData>(`/api/app/assessments/${moduleId}/details`);
      if (result.error) {
        throw new Error(result.error);
        }
      return result.data; 
    },
    enabled: !!moduleId,
  });

  const handleStartResumeAssessment = async () => {
    if (!assessmentPageData) return; // Guard clause

    try {
      // setIsLoading(true); // Removed, as this was for the page data loading state
      
      // If there is an in-progress attempt, we'll resume it, otherwise start a new one
      const isResume = !!assessmentPageData.in_progress_attempt;
      
      // Prepare the assessment page for taking the assessment
      router.push(`/app/assessment/${moduleId}/take`);
      
      // Log what's happening (for debugging)
      if (isResume) {
        console.log("Resuming assessment:", assessmentPageData.assessment.name);
      } else {
        console.log("Starting assessment:", assessmentPageData.assessment.name);
      }
    } catch (err) {
      console.error("Error starting assessment:", err);
      // setError(err instanceof Error ? err.message : 'An unknown error occurred while starting the assessment.'); // Removed
      // If this handler needs to show an error, it should use its own state or a toast notification.
      // setIsLoading(false); // Removed
    }
  };


  if (isLoading) {
    return <AssessmentPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-600 dark:text-red-100 text-xl mb-4">Error</div>
        <p className="text-center mb-4 dark:text-gray-300">{error?.message || 'An unknown error occurred'}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (!assessmentPageData) {
    return <div className="container mx-auto p-6 text-center">No assessment data found for this module.</div>;
  }

  const { assessment, in_progress_attempt } = assessmentPageData;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <header className="mb-6 py-4 border-b dark:border-gray-700">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100">{assessment.name}</h1>
        {assessment.description && (
          <p className="mt-2 text-md text-gray-600 dark:text-gray-400">{assessment.description}</p>
        )}
      </header>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Assessment Overview</h2>
        
        {assessment.time_limit_minutes && (
          <div className="mb-4">
            <span className="font-medium text-gray-600 dark:text-gray-300">Time Limit:</span> {assessment.time_limit_minutes} minutes
          </div>
        )}
        {/* Display other assessment details like number of questions, attempts allowed/taken if available */}
        {/* <div className="mb-4">
          <span className="font-medium text-gray-600 dark:text-gray-300">Questions:</span> {assessmentPageData.questions.length}
        </div> */}


        <div className="mt-8 text-center">
          <Button 
            onClick={handleStartResumeAssessment} 
            size="lg" 
            className="px-8 py-3 text-lg"
          >
            {in_progress_attempt ? 'Resume Assessment' : 'Start Assessment'}
          </Button>
        </div>
        
        {in_progress_attempt && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md text-sm">
            <p className="text-blue-700 dark:text-blue-300">
              You have an assessment in progress. Last saved: {new Date(in_progress_attempt.last_updated).toLocaleString()}.
            </p>
            {/* Optionally show remaining time if available and not sensitive here */}
          </div>
        )}
      </div>
    </div>
  );
} 