import { useCallback, useMemo } from 'react';
import { useLiveInterviewContext } from '@/components/job-readiness/contexts/LiveInterviewContext';
import { useInterviewSession } from '@/components/job-readiness/providers/InterviewSessionProvider';
import { InterviewQuestion } from '@/lib/types';

export interface UseLiveInterviewResult {
  // Session state
  sessionId: string | null;
  background: any;
  questions: InterviewQuestion[];
  questionsLoading: boolean;
  
  // Interview state
  connected: boolean;
  connecting: boolean;
  recording: boolean;
  timeRemaining: number;
  interviewStarted: boolean;
  
  // Media
  videoBlob: Blob | null;
  
  // Actions
  startInterview: () => Promise<void>;
  endInterview: () => Promise<void>;
  submitInterview: () => Promise<void>;
  
  // Status
  canStart: boolean;
  isReady: boolean;
  error: string | null;
  
  // Progress
  progressPercentage: number;
  timeFormatted: string;
}

/**
 * Custom hook that provides a unified interface for managing live interviews
 * Combines the Live Interview Context and Interview Session providers
 */
export function useLiveInterview(backgroundId: string): UseLiveInterviewResult {
  const liveContext = useLiveInterviewContext();
  const sessionContext = useInterviewSession();

  // Format time display
  const timeFormatted = useMemo(() => {
    const mins = Math.floor(liveContext.timeRemaining / 60);
    const secs = liveContext.timeRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [liveContext.timeRemaining]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return ((300 - liveContext.timeRemaining) / 300) * 100;
  }, [liveContext.timeRemaining]);

  // Determine if interview can start
  const canStart = useMemo(() => {
    return (
      sessionContext.sessionState === 'ready' &&
      sessionContext.questions.length > 0 &&
      !sessionContext.questionsLoading &&
      !liveContext.connecting &&
      !liveContext.interviewStarted
    );
  }, [
    sessionContext.sessionState,
    sessionContext.questions.length,
    sessionContext.questionsLoading,
    liveContext.connecting,
    liveContext.interviewStarted
  ]);

  // Determine overall ready state
  const isReady = useMemo(() => {
    return (
      sessionContext.sessionState === 'ready' &&
      !sessionContext.questionsLoading &&
      !sessionContext.questionsError &&
      !liveContext.error
    );
  }, [
    sessionContext.sessionState,
    sessionContext.questionsLoading,
    sessionContext.questionsError,
    liveContext.error
  ]);

  // Combined error state
  const error = useMemo(() => {
    return sessionContext.questionsError || liveContext.error;
  }, [sessionContext.questionsError, liveContext.error]);

  // Start interview action
  const startInterview = useCallback(async () => {
    if (!canStart) {
      throw new Error('Interview cannot be started at this time');
    }

    try {
      // Connect to Live API first
      await liveContext.connect();
      
      // Start the session
      sessionContext.startSession();
      
      // Start the live interview with generated questions
      await liveContext.startInterview(sessionContext.questions);
    } catch (err) {
      console.error('Failed to start interview:', err);
      throw err;
    }
  }, [canStart, liveContext, sessionContext]);

  // End interview action (early termination)
  const endInterview = useCallback(async () => {
    try {
      await liveContext.submitInterview();
      sessionContext.endSession();
    } catch (err) {
      console.error('Failed to end interview:', err);
      throw err;
    }
  }, [liveContext, sessionContext]);

  // Submit interview action (same as end for now)
  const submitInterview = useCallback(async () => {
    return endInterview();
  }, [endInterview]);

  return {
    // Session state
    sessionId: sessionContext.sessionId,
    background: sessionContext.background,
    questions: sessionContext.questions,
    questionsLoading: sessionContext.questionsLoading,
    
    // Interview state
    connected: liveContext.connected,
    connecting: liveContext.connecting,
    recording: liveContext.recording,
    timeRemaining: liveContext.timeRemaining,
    interviewStarted: liveContext.interviewStarted,
    
    // Media
    videoBlob: liveContext.videoBlob,
    
    // Actions
    startInterview,
    endInterview,
    submitInterview,
    
    // Status
    canStart,
    isReady,
    error,
    
    // Progress
    progressPercentage,
    timeFormatted,
  };
} 