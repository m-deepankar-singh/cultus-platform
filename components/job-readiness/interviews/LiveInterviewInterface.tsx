'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveInterviewContext } from '../contexts/LiveInterviewContext';
import { useInterviewSession } from '../providers/InterviewSessionProvider';
import { InactivityWarning } from './InactivityWarning';
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card';
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AdaptiveParticles } from '@/components/ui/floating-particles';
import { DashboardLoadingSkeleton } from '@/components/ui/dashboard-skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Monitor, MonitorOff, StopCircle, Volume2, VolumeX, AlertTriangle, CheckCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import gsap from 'gsap';

interface LiveInterviewInterfaceProps {
  onComplete?: (submissionId?: string) => void;
}

export function LiveInterviewInterface({ onComplete }: LiveInterviewInterfaceProps) {
  const {
    connected,
    connecting,
    timeRemaining,
    interviewStarted,
    audioInputEnabled,
    hasSystemAudio,
    screenShareInterrupted,
    inactivityWarning,
    startInterview,
    submitInterview,
    toggleAudioInput,
    resetInactivityTimer,
    error: liveError
  } = useLiveInterviewContext();

  const {
    questions,
    questionsLoading,
    questionsError,
    sessionState,
    background
  } = useInterviewSession();

  // Local state for media controls
  const [showControls, setShowControls] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // GSAP animation setup with proper cleanup
  useEffect(() => {
    setMounted(true);
    
    // Create timeline for better memory management
    const tl = gsap.timeline();
    tl.fromTo(
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
    
    // Cleanup function to prevent memory leaks
    return () => {
      tl.kill(); // Kill the timeline and all its tweens
    };
  }, [sessionState]);
  
  // Video element ref for screen preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store the display media stream for cleanup
  const displayStreamRef = useRef<MediaStream | null>(null);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = ((300 - timeRemaining) / 300) * 100;

  // Handle starting the interview
  const handleStartInterview = async () => {
    if (sessionState === 'ready' && questions.length > 0) {
      try {
        // Only call startInterview - it will handle connection with questions
        await startInterview(questions);
      } catch (err) {
        console.error('Failed to start interview:', err);
      }
    }
  };

  // Handle ending the interview early
  const handleEndInterview = async () => {
    try {
      setSubmitting(true);
      
      // Immediately stop the display stream
      if (displayStreamRef.current) {
        console.log('🎥 User ended interview: stopping display stream immediately');
        displayStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`🔌 Stopped ${track.kind} track:`, track.label);
        });
        displayStreamRef.current = null;
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
      
      // Get the submission ID from submitInterview
      const submissionId = await submitInterview();
      console.log('🎯 Interview completed, submission ID:', submissionId);
      
      // Call onComplete with the submission ID
      onComplete?.(submissionId || undefined);
    } catch (err) {
      console.error('Failed to end interview:', err);
      setSubmitting(false);
    }
  };

  // Auto-hide controls after inactivity (mobile-friendly) with improved cleanup
  useEffect(() => {
    const resetControlsTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      // Longer timeout on mobile for better UX
      const timeout = window.innerWidth < 768 ? 5000 : 3000;
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        controlsTimeoutRef.current = null; // Clear ref after timeout
      }, timeout);
    };

    const handleMouseMove = () => resetControlsTimeout();
    const handleMouseClick = () => resetControlsTimeout();
    const handleTouchStart = () => resetControlsTimeout();
    const handleTouchMove = () => resetControlsTimeout();

    if (interviewStarted) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleMouseClick);
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      resetControlsTimeout();
    }

    // Enhanced cleanup to prevent memory leaks
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleMouseClick);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, [interviewStarted]);

  // Get user camera for video preview (while screen recording happens in background)
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    
    if (interviewStarted && videoRef.current) {
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false // Audio is handled separately
      }).then(stream => {
        // Store stream reference for cleanup (both local and ref)
        currentStream = stream;
        displayStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch(err => {
        console.error('Failed to get user camera:', err);
        // Don't disable screen recording if camera fails, just show placeholder
      });
    }
    
    // Enhanced cleanup function to prevent memory leaks
    return () => {
      // Clean up the local stream reference first
      if (currentStream) {
        console.log('🎥 Cleaning up local video display stream');
        currentStream.getTracks().forEach(track => {
          track.stop();
          console.log(`🔌 Stopped ${track.kind} track:`, track.label);
        });
        currentStream = null;
      }
      
      // Clean up the ref stream reference
      if (displayStreamRef.current) {
        console.log('🎥 Cleaning up ref video display stream');
        displayStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`🔌 Stopped ${track.kind} track:`, track.label);
        });
        displayStreamRef.current = null;
      }
      
      // Clear video element source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [interviewStarted]);

  // Additional cleanup when component unmounts or interview ends
  useEffect(() => {
    return () => {
      // Ensure all media streams are stopped when component unmounts
      if (displayStreamRef.current) {
        console.log('🎥 Final cleanup: stopping all display media tracks');
        displayStreamRef.current.getTracks().forEach(track => track.stop());
        displayStreamRef.current = null;
      }
    };
  }, []);

  // Clean up display stream when interview is no longer started
  useEffect(() => {
    if (!interviewStarted && displayStreamRef.current) {
      console.log('🎥 Interview ended: cleaning up display stream');
      displayStreamRef.current.getTracks().forEach(track => track.stop());
      displayStreamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [interviewStarted]);

  // Show loading state
  if (questionsLoading || sessionState === 'preparing') {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <DashboardLoadingSkeleton 
          message="Generating personalized questions based on your background..." 
          showProgress={true}
        />
      </div>
    );
  }

  // Show screen share interrupted state
  if (screenShareInterrupted) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="relative flex items-center justify-center min-h-screen p-6">
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={0}
            className="dashboard-card p-8 max-w-md text-center"
          >
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 dark:from-red-400/10 dark:to-rose-500/10 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 w-fit mx-auto">
                <MonitorOff className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-red-800 dark:text-red-200">Screen Sharing Stopped</h2>
                <p className="text-red-600 dark:text-red-300 text-lg">
                  Your screen sharing was interrupted during the interview. The interview has been automatically submitted for review.
                </p>
              </div>
              
              <PerformantAnimatedCard variant="subtle" className="p-4 bg-gradient-to-r from-red-50/50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-700/50">
                <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Interview recording saved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Submission processed automatically</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>You will receive feedback via email</span>
                  </div>
                </div>
              </PerformantAnimatedCard>
              
              <AnimatedButton 
                onClick={() => window.location.href = '/app/job-readiness/interviews'} 
                variant="outline"
                className="w-full border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Return to Interviews
              </AnimatedButton>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  // Show submitting state
  if (submitting) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="relative flex items-center justify-center min-h-screen p-4 sm:p-6">
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="glow"
            staggerIndex={0}
            className="dashboard-card p-4 sm:p-6 lg:p-8 max-w-md text-center w-full mx-4 sm:mx-0"
          >
            <div className="space-y-4 sm:space-y-6">
              <div className="relative mx-auto w-fit">
                <OptimizedProgressRing
                  value={85}
                  size={80}
                  strokeWidth={3}
                  showValue={false}
                  color="success"
                  delay={200}
                  className="animate-pulse sm:hidden"
                />
                <OptimizedProgressRing
                  value={85}
                  size={120}
                  strokeWidth={4}
                  showValue={false}
                  color="success"
                  delay={200}
                  className="animate-pulse hidden sm:block"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Submitting Your Interview</h2>
                <p className="text-muted-foreground text-sm sm:text-base lg:text-lg px-2 sm:px-0">
                  Your interview is being uploaded and processed. Please wait...
                </p>
              </div>
              
              <PerformantAnimatedCard variant="subtle" className="p-6 bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-700/50">
                <div className="space-y-3 text-sm text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
                    <span>Saving your video recording</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 dark:border-emerald-400" style={{ animationDelay: '0.2s' }}></div>
                    <span>Processing interview responses</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600 dark:border-emerald-400" style={{ animationDelay: '0.4s' }}></div>
                    <span>Preparing for AI analysis</span>
                  </div>
                </div>
              </PerformantAnimatedCard>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  // Show error state
  if (questionsError || liveError || sessionState === 'error') {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="relative flex items-center justify-center min-h-screen p-6">
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={0}
            className="dashboard-card p-8 max-w-md text-center"
          >
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 dark:from-red-400/10 dark:to-rose-500/10 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 w-fit mx-auto">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-red-800 dark:text-red-200">Interview Setup Failed</h2>
                <p className="text-red-600 dark:text-red-300 text-lg">
                  {questionsError || liveError || 'An unexpected error occurred'}
                </p>
              </div>
              
              <AnimatedButton 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="w-full border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Try Again
              </AnimatedButton>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  // Show pre-interview setup
  if (!interviewStarted && sessionState === 'ready') {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="relative flex items-center justify-center min-h-screen p-4 sm:p-6">
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={0}
            className="dashboard-card p-4 sm:p-6 lg:p-8 max-w-lg text-center w-full mx-4 sm:mx-0"
          >
            <div className="space-y-6 sm:space-y-8">
              {/* Hero Section */}
              <div className="space-y-4 sm:space-y-6">
                <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/20 dark:from-emerald-400/10 dark:to-green-500/10 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-700/50 w-fit mx-auto">
                  <Monitor className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-600 dark:text-emerald-400" />
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight gradient-text">Ready to Start Your Interview</h2>
                  <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-xl mx-auto px-2 sm:px-0">
                    Your interview for <strong className="text-foreground">{background?.name}</strong> is ready to begin.
                  </p>
                </div>
              </div>
              
              {/* Interview Details */}
              <PerformantAnimatedCard 
                variant="subtle" 
                staggerIndex={1}
                className="dashboard-card p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50"
              >
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-4 text-lg">Interview Details:</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: '⏱️', text: `Duration: 5 minutes` },
                    { icon: '❓', text: `Questions: ${questions.length} personalized questions` },
                    { icon: '📹', text: 'Recording: Screen and audio (camera view for monitoring)' },
                    { icon: '🤖', text: 'AI Interviewer: Real-time conversation' }
                  ].map(({ icon, text }, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-blue-100/50 dark:bg-blue-800/30 backdrop-blur-sm">
                      <span className="text-base">{icon}</span>
                      <span className="text-blue-700 dark:text-blue-300 font-medium">{text}</span>
                    </div>
                  ))}
                </div>
              </PerformantAnimatedCard>
              
              {/* Action Button */}
              <div className="space-y-4 px-2 sm:px-0">
                <AnimatedButton 
                  onClick={handleStartInterview}
                  disabled={connecting}
                  size="lg"
                  className="w-full min-h-[48px] sm:min-h-[56px] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 sm:py-6 text-base sm:text-lg touch-manipulation"
                >
                  {connecting ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Start Interview</span>
                    </div>
                  )}
                </AnimatedButton>
              </div>
              
              {/* Important Notices */}
              <div className="space-y-3">
                <PerformantAnimatedCard 
                  variant="subtle" 
                  staggerIndex={2}
                  className="dashboard-card p-4 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg flex-shrink-0">📋</div>
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Important:</strong> System audio is only available when sharing a <strong>browser tab</strong>. For full screen recording, your microphone will still be captured for assessment.
                    </div>
                  </div>
                </PerformantAnimatedCard>
                
                <PerformantAnimatedCard 
                  variant="subtle" 
                  staggerIndex={3}
                  className="dashboard-card p-4 bg-gradient-to-r from-red-50/50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-700/50"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-red-800 dark:text-red-200">
                      <strong>Critical:</strong> Do not stop screen sharing during the interview. If screen sharing ends, the interview will be automatically submitted and cannot be resumed.
                    </div>
                  </div>
                </PerformantAnimatedCard>
              </div>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  // Main interview interface
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true} // 🔥 FIX: Explicitly mute display video to prevent audio feedback
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      
      {/* Top bar with timer and progress */}
      <div className={cn(
        "absolute top-0 left-0 right-0 p-3 sm:p-4 lg:p-6 transition-opacity duration-300 safe-area-inset-top",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="bg-red-600 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mr-1 sm:mr-2 animate-pulse"></div>
              LIVE
            </div>
            <span className="text-base sm:text-lg font-mono font-bold">
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1 sm:space-x-2 mb-1">
              <div className={cn(
                "flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs",
                hasSystemAudio 
                  ? "bg-green-500/20 text-green-300" 
                  : "bg-amber-500/20 text-amber-300"
              )}>
                {hasSystemAudio ? <Volume2 size={10} className="sm:w-3 sm:h-3" /> : <VolumeX size={10} className="sm:w-3 sm:h-3" />}
                <span className="hidden sm:inline">{hasSystemAudio ? "System Audio" : "No System Audio"}</span>
                <span className="sm:hidden">{hasSystemAudio ? "Audio" : "No Audio"}</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm opacity-80 truncate max-w-[120px] sm:max-w-none">{background?.name}</p>
            <p className="text-xs opacity-60 hidden sm:block">AI Interview Session</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 sm:mt-4">
          <Progress 
            value={progressPercentage} 
            className="h-1.5 sm:h-2 bg-white/20"
          />
        </div>
      </div>
      
      {/* Bottom controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6 transition-opacity duration-300 safe-area-inset-bottom",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center justify-center">
          {/* End interview button */}
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 p-0 bg-red-600 hover:bg-red-700 touch-manipulation"
            onClick={handleEndInterview}
          >
            <StopCircle size={20} className="sm:w-6 sm:h-6" />
          </Button>
        </div>
        
        <div className="text-center mt-2 sm:mt-4">
          <p className="text-white text-xs sm:text-sm opacity-80 px-2">
            <span className="hidden sm:inline">Speak naturally with the AI interviewer • Click the red button to end interview • Click anywhere to show controls</span>
            <span className="sm:hidden">Speak naturally • Red button to end • Tap to show controls</span>
          </p>
        </div>
      </div>
      
      {/* Connection indicator */}
      {!connected && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Card className="p-6 text-center bg-black/80 border-red-500 text-white">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="font-semibold">Connection Lost</p>
            <p className="text-sm opacity-80">Attempting to reconnect...</p>
          </Card>
        </div>
      )}
      
      {/* Inactivity Warning */}
      <InactivityWarning
        isVisible={inactivityWarning}
        onDismiss={handleEndInterview}
        onContinue={() => {
          resetInactivityTimer();
        }}
        timeUntilDisconnect={120} // 2 minutes
      />
    </div>
  );
} 