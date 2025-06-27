'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveInterviewContext } from '../contexts/LiveInterviewContext';
import { useInterviewSession } from '../providers/InterviewSessionProvider';
import { InactivityWarning } from './InactivityWarning';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Mic, MicOff, Monitor, MonitorOff, StopCircle, Camera, CameraOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [cameraViewEnabled, setCameraViewEnabled] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
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

  // Auto-hide controls after inactivity
  useEffect(() => {
    const resetControlsTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => resetControlsTimeout();
    const handleMouseClick = () => resetControlsTimeout();

    if (interviewStarted) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleMouseClick);
      resetControlsTimeout();
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleMouseClick);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [interviewStarted]);

  // Get user camera for video preview (while screen recording happens in background)
  useEffect(() => {
    if (interviewStarted && videoRef.current && cameraViewEnabled) {
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false // Audio is handled separately
      }).then(stream => {
        // Store stream reference for cleanup
        displayStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch(err => {
        console.error('Failed to get user camera:', err);
        // Don't disable screen recording if camera fails, just show placeholder
      });
    }
    
    // Cleanup function to stop the display stream
    return () => {
      if (displayStreamRef.current) {
        console.log('🎥 Cleaning up video display stream');
        displayStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`🔌 Stopped ${track.kind} track:`, track.label);
        });
        displayStreamRef.current = null;
      }
      
      // Also clear video element source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [interviewStarted, cameraViewEnabled]);

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Preparing Your Interview</h2>
          <p className="text-gray-600">
            Generating personalized questions based on your background...
          </p>
        </Card>
      </div>
    );
  }

  // Show screen share interrupted state
  if (screenShareInterrupted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MonitorOff className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-800">Screen Sharing Stopped</h2>
          <p className="text-red-600 mb-4">
            Your screen sharing was interrupted during the interview. The interview has been automatically submitted for review.
          </p>
          <div className="space-y-2 text-sm text-red-500">
            <p>• Interview recording saved</p>
            <p>• Submission processed automatically</p>
            <p>• You will receive feedback via email</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/app/job-readiness/interviews'} 
            variant="outline"
            className="mt-4 border-red-300 text-red-700 hover:bg-red-50"
          >
            Return to Interviews
          </Button>
        </Card>
      </div>
    );
  }

  // Show submitting state
  if (submitting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Submitting Your Interview</h2>
          <p className="text-gray-600 mb-4">
            Your interview is being uploaded and processed. Please wait...
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• Saving your video recording</p>
            <p>• Processing interview responses</p>
            <p>• Preparing for AI analysis</p>
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (questionsError || liveError || sessionState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-red-800">Interview Setup Failed</h2>
          <p className="text-red-600 mb-4">
            {questionsError || liveError || 'An unexpected error occurred'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Show pre-interview setup
  if (!interviewStarted && sessionState === 'ready') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="p-8 max-w-lg text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Monitor className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ready to Start Your Interview</h2>
            <p className="text-gray-600 mb-4">
              Your interview for <strong>{background?.name}</strong> is ready to begin.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Interview Details:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Duration: 5 minutes</li>
                <li>• Questions: {questions.length} personalized questions</li>
                <li>• Recording: Screen and audio (camera view for monitoring)</li>
                <li>• AI Interviewer: Real-time conversation</li>
              </ul>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleStartInterview}
              disabled={connecting}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                'Start Interview'
              )}
            </Button>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-4">
              <p className="text-xs text-amber-800">
                <strong>📋 Important:</strong> System audio is only available when sharing a <strong>browser tab</strong>. For full screen recording, your microphone will still be captured for assessment.
              </p>
            </div>
            
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg mt-3">
              <p className="text-xs text-red-800">
                <strong>⚠️ Critical:</strong> Do not stop screen sharing during the interview. If screen sharing ends, the interview will be automatically submitted and cannot be resumed.
              </p>
            </div>
          </div>
        </Card>
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      
      {/* Top bar with timer and progress */}
      <div className={cn(
        "absolute top-0 left-0 right-0 p-6 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <div className="bg-red-600 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
              LIVE
            </div>
            <span className="text-lg font-mono font-bold">
              {formatTime(timeRemaining)}
            </span>
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2 mb-1">
              <div className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
                hasSystemAudio 
                  ? "bg-green-500/20 text-green-300" 
                  : "bg-amber-500/20 text-amber-300"
              )}>
                {hasSystemAudio ? <Volume2 size={12} /> : <VolumeX size={12} />}
                <span>{hasSystemAudio ? "System Audio" : "No System Audio"}</span>
              </div>
            </div>
            <p className="text-sm opacity-80">{background?.name}</p>
            <p className="text-xs opacity-60">AI Interview Session</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-white/20"
          />
        </div>
      </div>
      
      {/* Bottom controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-6 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center justify-center space-x-4">
          {/* Audio toggle */}
          <Button
            variant="secondary"
            size="lg"
            className={cn(
              "rounded-full w-14 h-14 p-0",
              audioInputEnabled 
                ? "bg-white/20 hover:bg-white/30 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
            onClick={toggleAudioInput}
          >
            {audioInputEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </Button>
          
          {/* Camera view toggle */}
          <Button
            variant="secondary"
            size="lg"
            className={cn(
              "rounded-full w-14 h-14 p-0",
              cameraViewEnabled 
                ? "bg-white/20 hover:bg-white/30 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
            onClick={() => setCameraViewEnabled(!cameraViewEnabled)}
          >
            {cameraViewEnabled ? <Camera size={24} /> : <CameraOff size={24} />}
          </Button>
          
          {/* End interview button */}
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 p-0 bg-red-600 hover:bg-red-700"
            onClick={handleEndInterview}
          >
            <StopCircle size={24} />
          </Button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-white text-sm opacity-80">
            Speak naturally with the AI interviewer • Click anywhere to show controls
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