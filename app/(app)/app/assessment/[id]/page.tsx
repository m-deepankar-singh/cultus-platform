'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAssessmentDetails } from '@/hooks/queries/student/useAssessments';
import { Button } from '@/components/ui/button';

// Define interfaces for the assessment data based on GET /api/app/assessments/[moduleId]/details response
interface AssessmentQuestionOption {
  id: string;
  text: string;
}

interface AssessmentQuestion {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TF' | 'ShortAnswer' | 'Essay';
  options?: AssessmentQuestionOption[];
}

interface AssessmentDetails {
  id: string;
  name: string;
  description?: string;
  time_limit_minutes?: number;
}

interface InProgressAttempt {
  assessment_progress_id: string;
  started_at: string;
  last_updated: string;
  remaining_time_seconds?: number;
  timer_paused?: boolean;
  saved_answers?: Record<string, string | string[]>;
}

interface AssessmentPageData {
  assessment: AssessmentDetails;
  questions: AssessmentQuestion[];
  in_progress_attempt?: InProgressAttempt | null;
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

  // Use our new organized TanStack Query hook
  const { 
    data: assessmentPageData, 
    isPending, 
    isError, 
    error 
  } = useAssessmentDetails(moduleId);

  const handleStartResumeAssessment = async () => {
    if (!assessmentPageData || typeof assessmentPageData !== 'object' || !('assessment' in assessmentPageData)) return;

    const data = assessmentPageData as AssessmentPageData;
    
    try {
      const isResume = !!data.in_progress_attempt;
      router.push(`/app/assessment/${moduleId}/take`);
      
      if (isResume) {
        console.log("Resuming assessment:", data.assessment.name);
      } else {
        console.log("Starting assessment:", data.assessment.name);
      }
    } catch (err) {
      console.error("Error starting assessment:", err);
    }
  };

  if (isPending) {
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

  if (!assessmentPageData || typeof assessmentPageData !== 'object' || !('assessment' in assessmentPageData)) {
    return <div className="container mx-auto p-6 text-center">No assessment data found for this module.</div>;
  }

  const { assessment, in_progress_attempt } = assessmentPageData as AssessmentPageData;

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
          </div>
        )}
      </div>
    </div>
  );
} 