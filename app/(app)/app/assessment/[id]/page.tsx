'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAssessmentDetails } from '@/hooks/queries/student/useAssessments';
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card';
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AdaptiveParticles } from '@/components/ui/floating-particles';
import { Clock, PlayCircle, RotateCcw } from 'lucide-react';
import gsap from 'gsap';

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
  <div className="relative min-h-screen">
    <AdaptiveParticles />
    <div className="relative">
      <div className="container mx-auto py-8 px-4 md:px-0">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section Skeleton */}
          <div className="text-center space-y-4 animate-pulse">
            <div className="h-12 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-lg w-3/4 mx-auto"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
          
          {/* Assessment Card Skeleton */}
          <PerformantAnimatedCard variant="glass" className="animate-pulse">
            <div className="space-y-6">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
              <div className="flex justify-center pt-4">
                <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-lg w-48"></div>
              </div>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    </div>
  </div>
);

export default function AssessmentPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string;
  const [mounted, setMounted] = useState(false);

  // Use our new organized TanStack Query hook
  const { 
    data: assessmentPageData, 
    isPending, 
    isError, 
    error 
  } = useAssessmentDetails(moduleId);

  useEffect(() => {
    setMounted(true);
    
    if (!isPending && assessmentPageData) {
      // GSAP animations for entry effects
      gsap.fromTo(
        ".dashboard-card",
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.1, 
          duration: 0.6, 
          ease: "power2.out"
        }
      );
    }
  }, [isPending, assessmentPageData]);

  const handleStartResumeAssessment = async () => {
    if (!assessmentPageData || typeof assessmentPageData !== 'object' || !('assessment' in assessmentPageData)) return;

    const data = assessmentPageData as AssessmentPageData;
    
    try {
      router.push(`/app/assessment/${moduleId}/take`);
    } catch (err) {
      console.error("Error starting assessment:", err);
    }
  };

  if (isPending) {
    return <AssessmentPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4">
          <PerformantAnimatedCard variant="glass" className="text-center space-y-6 max-w-md">
            <div className="text-destructive text-2xl font-semibold">Error</div>
            <p className="text-center text-muted-foreground">
              {error?.message || 'Something went wrong. Please try again.'}
            </p>
            <AnimatedButton onClick={() => window.location.reload()}>
              Try Again
            </AnimatedButton>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  if (!assessmentPageData || typeof assessmentPageData !== 'object' || !('assessment' in assessmentPageData)) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4">
          <PerformantAnimatedCard variant="glass" className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-semibold text-muted-foreground">No Data Found</h2>
            <p className="text-muted-foreground">No assessment data found for this module.</p>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  const { assessment, in_progress_attempt } = assessmentPageData as AssessmentPageData;

  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="relative">
        <div className="container mx-auto py-8 px-4 md:px-0">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                {assessment.name}
              </h1>
              {assessment.description && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {assessment.description}
                </p>
              )}
            </div>

            {/* Assessment Overview Card */}
            <PerformantAnimatedCard 
              variant="glass" 
              hoverEffect="lift"
              className="dashboard-card"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-8 w-8 text-primary" />
                  <h2 className="text-2xl font-semibold">Assessment Overview</h2>
                </div>
                
                {/* Time Limit Display */}
                {assessment.time_limit_minutes && (
                  <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="font-medium">Time Limit:</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <OptimizedProgressRing
                        value={100}
                        size={40}
                        color="primary"
                        showValue={false}
                        delay={300}
                      />
                      <span className="text-lg font-semibold">
                        {assessment.time_limit_minutes} minutes
                      </span>
                    </div>
                  </div>
                )}

                {/* In Progress Status */}
                {in_progress_attempt && (
                  <PerformantAnimatedCard variant="subtle" className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">
                          Assessment in Progress
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Last saved: {new Date(in_progress_attempt.last_updated).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </PerformantAnimatedCard>
                )}

                {/* Action Button */}
                <div className="flex justify-center pt-4">
                  <AnimatedButton 
                    onClick={handleStartResumeAssessment}
                    className="px-8 py-3 text-lg bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  >
                    {in_progress_attempt ? 'Resume Assessment' : 'Start Assessment'}
                  </AnimatedButton>
                </div>
              </div>
            </PerformantAnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
} 