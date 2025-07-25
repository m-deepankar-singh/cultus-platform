'use client';

import { useState, useEffect } from 'react';
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { InterviewSessionProvider } from '@/components/job-readiness/providers/InterviewSessionProvider';
import { LiveInterviewProvider } from '@/components/job-readiness/contexts/LiveInterviewContext';
import { InterviewSetup } from '@/components/job-readiness/interviews/InterviewSetup';
import { LiveInterviewInterface } from '@/components/job-readiness/interviews/LiveInterviewInterface';
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card';
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertCircle, Video, ArrowLeft, AlertTriangle, Play, ArrowRight } from 'lucide-react';
import { useJobReadinessModuleGroups } from '@/hooks/useJobReadinessModuleGroups';
import Link from 'next/link';
import { useInvalidateInterviewCache } from '@/hooks/useInvalidateInterviewCache';
import { DashboardLoadingSkeleton } from '@/components/ui/dashboard-skeleton';
import gsap from 'gsap';
import { cn } from '@/lib/utils';

const TEST_BACKGROUND_ID = 'df8e996e-df6f-43f0-9bfa-c308a7604624'; // Computer Science background ID
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

// 🆕 Stuck session detection component
function StuckSessionCheck({ userId, onSessionCleared }: { userId: string; onSessionCleared: () => void }) {
  const [hasStuckSession, setHasStuckSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Check for existing stuck session
  useEffect(() => {
    if (!userId) return;

    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: existingSession } = await supabase
          .from('active_interview_sessions')
          .select('created_at, session_id')
          .eq('user_id', userId)
          .single();

        if (existingSession) {
          console.log('🔍 Found existing session:', existingSession.session_id);
          setHasStuckSession(true);
        }
      } catch (error) {
        // No session found - this is good
        console.log('✅ No stuck session detected');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [userId]);

  const clearStuckSession = async () => {
    if (!userId) return;

    setClearing(true);
    try {
      const supabase = createClient();
      await supabase
        .from('active_interview_sessions')
        .delete()
        .eq('user_id', userId);
      
      console.log('✅ Stuck session cleared');
      setHasStuckSession(false);
      onSessionCleared();
    } catch (error) {
      console.error('❌ Failed to clear stuck session:', error);
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-sm text-muted-foreground">Checking for active sessions...</div>;
  }

  if (!hasStuckSession) {
    return null;
  }

  return (
    <Card className="p-6 mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="flex items-start space-x-4">
        <div className="text-amber-600 dark:text-amber-400">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">Previous Session Detected</h3>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            It looks like your previous interview session didn't close properly. 
            This can happen if your browser crashed or lost connection.
          </p>
          <Button 
            onClick={clearStuckSession}
            disabled={clearing}
            className="mt-3"
            variant="outline"
          >
            {clearing ? 'Clearing...' : 'Clear Previous Session & Continue'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function InterviewsPage() {
  const [currentStep, setCurrentStep] = useState<'landing' | 'setup' | 'interview'>('landing');
  const [mounted, setMounted] = useState(false);
  const [sessionCleared, setSessionCleared] = useState(false);
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

  // Animation setup
  useEffect(() => {
    setMounted(true);
    
    if (!isLoading && currentStep === 'landing') {
      // GSAP animations for card entrance
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
  }, [isLoading, currentStep]);

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
    return <DashboardLoadingSkeleton message="Loading interview details..." />;
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
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
        
        {/* Back to Job Readiness */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="min-h-[40px] text-sm">
            <Link href="/app/job-readiness">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Job Readiness</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
        </div>
        
        {/* 🆕 Stuck Session Check */}
        {isUnlocked && moduleGroups?.student?.id && (
          <StuckSessionCheck 
            userId={moduleGroups.student.id} 
            onSessionCleared={() => setSessionCleared(true)} 
          />
        )}

        {/* Status Card */}
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          staggerIndex={0}
          className="dashboard-card p-4 sm:p-6"
        >
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 dark:from-blue-400/10 dark:to-indigo-500/10 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                  <Video className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">Simulated Interviews</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">AI-powered mock interview experience</p>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2">
                <Badge 
                  variant={isCompleted ? "default" : isUnlocked ? "secondary" : "outline"}
                  className={cn(
                    "px-2 sm:px-3 py-1 font-medium text-xs sm:text-sm",
                    isCompleted && "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                    isUnlocked && !isCompleted && "bg-amber-500/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                    !isUnlocked && "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  )}
                >
                  {isCompleted ? "Completed" : isUnlocked ? "Available" : "Locked"}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">Star 5</span>
              </div>
            </div>
            {!isUnlocked && (
              <Alert className="bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Complete projects (Star 4) to unlock simulated interviews.
                </AlertDescription>
              </Alert>
            )}

            {isUnlocked && !hasValidApiKey && (
              <Alert variant="destructive" className="bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800 backdrop-blur-sm">
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
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {isCompleted ? "Interview Completed Successfully" : "Previous Interview Submitted"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {interviewStatus.lastAttemptDate && 
                          `Last attempt: ${(() => {
                            try {
                              const date = new Date(interviewStatus.lastAttemptDate);
                              return isNaN(date.getTime()) ? 'unknown' : date.toLocaleDateString();
                            } catch {
                              return 'unknown';
                            }
                          })()}`
                        }
                      </p>
                      {interviewStatus.submissionId && (
                        <AnimatedButton variant="outline" size="sm" className="mt-3">
                          <Link href={`/app/job-readiness/interviews/feedback/${interviewStatus.submissionId}`} className="flex items-center gap-2">
                            View Feedback
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </AnimatedButton>
                      )}
                    </div>
                  </div>
                )}

                {/* Interview Information */}
                <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
                  <PerformantAnimatedCard 
                    variant="subtle" 
                    hoverEffect="scale"
                    staggerIndex={1}
                    className="dashboard-card space-y-3 p-4 sm:p-6"
                  >
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">What to Expect</h3>
                    <ul className="text-xs sm:text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
                        5 AI-generated interview questions
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
                        4-minute time limit total
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
                        Video recording for AI analysis
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
                        Instant feedback and scoring
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
                        Questions adapt to your tier level
                      </li>
                    </ul>
                  </PerformantAnimatedCard>
                  
                  <PerformantAnimatedCard 
                    variant="subtle" 
                    hoverEffect="scale"
                    staggerIndex={2}
                    className="dashboard-card space-y-3 p-4 sm:p-6"
                  >
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">Technical Requirements</h3>
                    <ul className="text-xs sm:text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0"></div>
                        Working camera and microphone
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0"></div>
                        Stable internet connection
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0"></div>
                        Modern web browser
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0"></div>
                        Quiet environment recommended
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0"></div>
                        Desktop or laptop preferred
                      </li>
                    </ul>
                  </PerformantAnimatedCard>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 px-2 sm:px-0">
                  <AnimatedButton 
                    onClick={handleStartInterview}
                    className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm sm:text-base touch-manipulation"
                    size="lg"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      <span>{interviewStatus?.hasAttempted ? 'Retake Interview' : 'Start Interview'}</span>
                    </div>
                  </AnimatedButton>
                </div>

                {/* Tips */}
                <PerformantAnimatedCard 
                  variant="subtle" 
                  hoverEffect="glow"
                  staggerIndex={3}
                  className="dashboard-card bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/70 dark:border-blue-700/50 backdrop-blur-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xl">💡</div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">Interview Tips</h4>
                    </div>
                    <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0"></div>
                        <span>Speak clearly and maintain eye contact with the camera</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0"></div>
                        <span>Take your time to think before answering</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0"></div>
                        <span>Use specific examples from your experience</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0"></div>
                        <span>Practice good posture and professional appearance</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0"></div>
                        <span>The AI analyzes content, clarity, and confidence</span>
                      </li>
                    </ul>
                  </div>
                </PerformantAnimatedCard>
              </div>
            )}
          </div>
        </PerformantAnimatedCard>

        {/* Current Progress */}
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          staggerIndex={4}
          className="dashboard-card p-4 sm:p-6"
        >
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Your Progress</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="text-center">
                <OptimizedProgressRing
                  value={(moduleGroups?.student.currentStars || 0) * 20}
                  size={50}
                  strokeWidth={3}
                  showValue={false}
                  color="primary"
                  delay={600}
                  className="sm:hidden"
                />
                <OptimizedProgressRing
                  value={(moduleGroups?.student.currentStars || 0) * 20}
                  size={60}
                  strokeWidth={4}
                  showValue={false}
                  color="primary"
                  delay={600}
                  className="hidden sm:block"
                />
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {moduleGroups?.student.currentStars || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Current Stars</div>
                </div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700 flex items-center justify-center border-2 border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-bold text-white">
                    {(moduleGroups?.student.currentTier || 'BRONZE').slice(0, 2)}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {moduleGroups?.student.currentTier || 'BRONZE'}
                  </div>
                  <div className="text-xs text-muted-foreground">Current Tier</div>
                </div>
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <div className="text-xs sm:text-sm text-muted-foreground mb-3 text-center sm:text-left">
                  Interview Progress: {interviewModule?.isCompleted ? 'Complete' : 'Not Started'}
                </div>
                <div className="relative">
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 sm:h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 sm:h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${mounted ? (interviewModule?.isCompleted ? 100 : 0) : 0}%`,
                        transitionDelay: '800ms'
                      }}
                    />
                  </div>
                  <div className="absolute right-0 top-0 transform translate-y-3 sm:translate-y-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      {interviewModule?.isCompleted ? '100%' : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PerformantAnimatedCard>
      </div>
    </JobReadinessLayout>
  );
} 