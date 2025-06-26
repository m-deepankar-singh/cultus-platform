'use client';

import { useState } from 'react';
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout';
import { InterviewSessionProvider } from '@/components/job-readiness/providers/InterviewSessionProvider';
import { LiveInterviewProvider } from '@/components/job-readiness/contexts/LiveInterviewContext';
import { InterviewSetup } from '@/components/job-readiness/interviews/InterviewSetup';
import { LiveInterviewInterface } from '@/components/job-readiness/interviews/LiveInterviewInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertCircle, Video, ArrowLeft, AlertTriangle, Play, ArrowRight } from 'lucide-react';
import { useJobReadinessModuleGroups } from '@/hooks/useJobReadinessModuleGroups';
import Link from 'next/link';
import { useInvalidateInterviewCache } from '@/hooks/useInvalidateInterviewCache';

const TEST_BACKGROUND_ID = 'df8e996e-df6f-43f0-9bfa-c308a7604624'; // Computer Science background ID
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export default function InterviewsPage() {
  const [currentStep, setCurrentStep] = useState<'landing' | 'setup' | 'interview'>('landing');
  const { data: moduleGroups, isLoading } = useJobReadinessModuleGroups();
  const { invalidateInterviewCache, forceRefreshInterviewStatus } = useInvalidateInterviewCache();

  // Check if interviews are unlocked
  const interviewModule = moduleGroups?.moduleGroups.find(g => g.type === 'interviews');
  const isUnlocked = interviewModule?.isUnlocked || false;
  const isCompleted = interviewModule?.isCompleted || false;
  const interviewStatus = moduleGroups?.interviewStatus;

  // Get the student's background ID, fallback to test background if none set
  const backgroundId = moduleGroups?.student.backgroundType || TEST_BACKGROUND_ID;

  // Check for valid API key
  const hasValidApiKey = API_KEY && API_KEY !== 'test-key' && API_KEY.length > 10;

  const handleStartInterview = () => {
    setCurrentStep('setup');
  };

  const handleSetupComplete = () => {
    setCurrentStep('interview');
  };

  const handleBackToLanding = () => {
    setCurrentStep('landing');
  };

  const handleInterviewComplete = async (submissionId?: string) => {
    // Force refresh interview status to get the latest submission data
    try {
      await forceRefreshInterviewStatus();
      
      // Small delay to ensure data is fresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('❌ Failed to refresh interview status:', error);
    }
    
    // Redirect back to interviews page instead of feedback
    window.location.href = `/app/job-readiness/interviews`;
  };

  if (isLoading) {
    return (
      <JobReadinessLayout title="Simulated Interviews" description="AI-powered mock interviews">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </JobReadinessLayout>
    );
  }

  // Interview Setup Flow
  if (currentStep === 'setup') {
    return (
      <JobReadinessLayout title="Interview Setup" description="Prepare your devices for the interview">
        <InterviewSessionProvider backgroundId={backgroundId}>
          <InterviewSetup 
            onSetupComplete={handleSetupComplete}
            onBack={handleBackToLanding}
          />
        </InterviewSessionProvider>
      </JobReadinessLayout>
    );
  }

  // Live Interview Flow
  if (currentStep === 'interview') {
    return (
      <JobReadinessLayout title="Live Interview" description="Your AI-powered mock interview">
        <InterviewSessionProvider backgroundId={backgroundId}>
          <LiveInterviewProvider
            backgroundId={backgroundId}
            apiKey={API_KEY || ''}
          >
            <LiveInterviewInterface onComplete={handleInterviewComplete} />
          </LiveInterviewProvider>
        </InterviewSessionProvider>
      </JobReadinessLayout>
    );
  }

  // Main Landing Page
  return (
    <JobReadinessLayout
      title="Simulated Interviews"
      description="Complete AI-powered mock interviews to demonstrate your skills and earn your 5th star"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back to Job Readiness */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/job-readiness">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job Readiness
            </Link>
          </Button>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Simulated Interviews</CardTitle>
                  <CardDescription>AI-powered mock interview experience</CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={isCompleted ? "default" : isUnlocked ? "secondary" : "outline"}>
                  {isCompleted ? "Completed" : isUnlocked ? "Available" : "Locked"}
                </Badge>
                <span className="text-xs text-muted-foreground">Star 5</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isUnlocked && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Complete projects (Star 4) to unlock simulated interviews.
                </AlertDescription>
              </Alert>
            )}

            {isUnlocked && !hasValidApiKey && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  API configuration required. Please contact your administrator.
                </AlertDescription>
              </Alert>
            )}

            {isUnlocked && hasValidApiKey && (
              <div className="space-y-4">
                
                {/* Interview Status */}
                {interviewStatus?.hasAttempted && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {isCompleted ? "Interview Completed Successfully" : "Previous Interview Submitted"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {interviewStatus.lastAttemptDate && 
                          `Last attempt: ${new Date(interviewStatus.lastAttemptDate).toLocaleDateString()}`
                        }
                      </p>
                      {interviewStatus.submissionId && (
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <Link href={`/app/job-readiness/interviews/feedback/${interviewStatus.submissionId}`}>
                            View Feedback
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Interview Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">What to Expect</h3>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• 5 AI-generated interview questions</li>
                      <li>• 4-minute time limit total</li>
                      <li>• Video recording for AI analysis</li>
                      <li>• Instant feedback and scoring</li>
                      <li>• Questions adapt to your tier level</li>
                    </ul>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Technical Requirements</h3>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Working camera and microphone</li>
                      <li>• Stable internet connection</li>
                      <li>• Modern web browser</li>
                      <li>• Quiet environment recommended</li>
                      <li>• Desktop or laptop preferred</li>
                    </ul>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleStartInterview}
                    className="flex-1"
                    size="lg"
                  >
                    {interviewStatus?.hasAttempted ? 'Retake Interview' : 'Start Interview'}
                  </Button>
                  
                  {interviewStatus?.submissionId && (
                    <Button variant="outline" size="lg" asChild>
                      <Link href={`/app/job-readiness/interviews/feedback/${interviewStatus.submissionId}`}>
                        View Results
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Interview Tips</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Speak clearly and maintain eye contact with the camera</li>
                    <li>• Take your time to think before answering</li>
                    <li>• Use specific examples from your experience</li>
                    <li>• Practice good posture and professional appearance</li>
                    <li>• The AI analyzes content, clarity, and confidence</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {moduleGroups?.student.currentStars || 0}
                </div>
                <div className="text-xs text-gray-600">Current Stars</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {moduleGroups?.student.currentTier || 'BRONZE'}
                </div>
                <div className="text-xs text-gray-600">Current Tier</div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  Interview Progress: {interviewModule?.isCompleted ? 'Complete' : 'Not Started'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${interviewModule?.isCompleted ? 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </JobReadinessLayout>
  );
} 