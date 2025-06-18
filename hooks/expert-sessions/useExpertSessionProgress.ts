"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { useUpdateExpertSessionProgress } from '@/hooks/useJobReadinessMutations'

// Types
interface ProgressUpdate {
  currentTime: number
  duration: number
  triggerType: string
  milestone?: number
  forceCompletion?: boolean
  sessionStarted?: boolean
  sessionEnded?: boolean
  pauseDuration?: number
  resumeFromMilestone?: number
}

interface MilestoneTrackingState {
  lastMilestoneSaved: number
  milestonesUnlocked: number[]
  pauseStartTime: number | null
  sessionStartTime: number | null
  isSessionActive: boolean
  totalWatchTime: number
  currentMilestone: number
}

interface UseExpertSessionProgressOptions {
  sessionId: string
  initialProgress?: {
    last_milestone_reached?: number
    milestones_unlocked?: number[]
    watch_time_seconds?: number
    can_resume?: boolean
    resume_from_milestone?: number
    resume_position_seconds?: number
  }
  onMilestoneReached?: (milestone: number) => void
  onSessionCompleted?: (data: any) => void
  onError?: (error: Error) => void
}

interface UseExpertSessionProgressReturn {
  // State
  milestoneState: MilestoneTrackingState
  isSaving: boolean
  hasError: boolean
  errorMessage: string | null
  justCompleted: boolean
  starLevelUnlocked: boolean
  
  // Actions
  updateProgress: (data: ProgressUpdate) => Promise<void>
  markMilestoneReached: (milestone: number, currentTime: number, duration: number) => Promise<void>
  startSession: () => void
  endSession: () => void
  pauseSession: () => void
  resumeSession: () => void
  completeSession: (currentTime: number, duration: number) => Promise<void>
  clearError: () => void
  
  // Utilities
  getNextMilestone: () => number | null
  shouldSaveMilestone: (currentPercentage: number) => { shouldSave: boolean; milestone?: number }
  canMarkAsCompleted: (currentPercentage: number) => boolean
  calculateResumePosition: (milestone: number, duration: number) => number
}

// Constants
const MILESTONES = [10, 25, 50, 75, 90, 95, 100]
const COMPLETION_THRESHOLD = 95
const PAUSE_SAVE_THRESHOLD = 30 // seconds
const MIN_WATCH_TIME = 3 // seconds before milestone counts

export function useExpertSessionProgress({
  sessionId,
  initialProgress = {},
  onMilestoneReached,
  onSessionCompleted,
  onError
}: UseExpertSessionProgressOptions): UseExpertSessionProgressReturn {
  
  // Use existing mutation hook
  const updateProgressMutation = useUpdateExpertSessionProgress()
  
  // Local state
  const [milestoneState, setMilestoneState] = useState<MilestoneTrackingState>({
    lastMilestoneSaved: initialProgress.last_milestone_reached || 0,
    milestonesUnlocked: initialProgress.milestones_unlocked || [],
    pauseStartTime: null,
    sessionStartTime: null,
    isSessionActive: false,
    totalWatchTime: initialProgress.watch_time_seconds || 0,
    currentMilestone: initialProgress.last_milestone_reached || 0
  })
  
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const [starLevelUnlocked, setStarLevelUnlocked] = useState(false)
  
  // Refs for cleanup and state tracking
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveTimeRef = useRef<number>(0)
  
  // Update progress with enhanced error handling and throttling
  const updateProgress = useCallback(async (data: ProgressUpdate) => {
    // Throttle saves (minimum 2 seconds between saves)
    const now = Date.now()
    if (now - lastSaveTimeRef.current < 2000 && data.triggerType !== 'completion') {
      return
    }
    lastSaveTimeRef.current = now
    
    setHasError(false)
    setErrorMessage(null)
    
    try {
             const result = await updateProgressMutation.mutateAsync({
         sessionId,
         currentTime: Math.floor(data.currentTime),
         duration: Math.floor(data.duration),
         triggerType: data.triggerType,
         milestone: data.milestone,
         forceCompletion: data.forceCompletion
       })
      
      // Handle successful response
      if (result.success) {
        const progressData = result.progress
        
        // Update local milestone state
        if (progressData.last_milestone_reached > milestoneState.lastMilestoneSaved) {
          setMilestoneState(prev => ({
            ...prev,
            lastMilestoneSaved: progressData.last_milestone_reached,
            currentMilestone: progressData.last_milestone_reached,
            milestonesUnlocked: [...new Set([...prev.milestonesUnlocked, progressData.last_milestone_reached])].sort((a, b) => a - b),
            totalWatchTime: progressData.watch_time_seconds
          }))
          
          // Call milestone callback
          if (onMilestoneReached && progressData.last_milestone_reached) {
            onMilestoneReached(progressData.last_milestone_reached)
          }
        }
        
        // Handle completion
        if (progressData.is_completed && !justCompleted) {
          setJustCompleted(true)
          setStarLevelUnlocked(result.star_unlocked || false)
          
          if (onSessionCompleted) {
            onSessionCompleted(result)
          }
        }
        
        return result
      }
    } catch (error) {
      console.error('Failed to update expert session progress:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to save progress'
      setHasError(true)
      setErrorMessage(errorMsg)
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMsg))
      }
      
      throw error
    }
  }, [sessionId, updateProgressMutation, milestoneState.lastMilestoneSaved, justCompleted, onMilestoneReached, onSessionCompleted, onError])
  
  // Mark milestone reached with validation
  const markMilestoneReached = useCallback(async (milestone: number, currentTime: number, duration: number) => {
    // Validation
    if (milestone <= milestoneState.lastMilestoneSaved) {
      return // Already saved this milestone
    }
    
    if (currentTime < MIN_WATCH_TIME) {
      return // Not enough watch time
    }
    
    console.log(`🎯 Marking milestone ${milestone}% reached at ${currentTime}s`)
    
    await updateProgress({
      currentTime,
      duration,
      triggerType: 'milestone',
      milestone,
      forceCompletion: milestone >= COMPLETION_THRESHOLD
    })
  }, [milestoneState.lastMilestoneSaved, updateProgress])
  
  // Session management
  const startSession = useCallback(() => {
    const now = Date.now()
    setMilestoneState(prev => ({
      ...prev,
      sessionStartTime: now,
      isSessionActive: true,
      pauseStartTime: null
    }))
    
    // Update progress with session start
    updateProgress({
      currentTime: milestoneState.totalWatchTime,
      duration: milestoneState.totalWatchTime || 1,
      triggerType: 'milestone',
      sessionStarted: true
    })
    
    console.log('📹 Expert session started')
  }, [milestoneState.totalWatchTime, updateProgress])
  
  const endSession = useCallback(() => {
    setMilestoneState(prev => ({
      ...prev,
      isSessionActive: false,
      sessionStartTime: null,
      pauseStartTime: null
    }))
    
    // Clear any pending timeouts
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
      sessionTimeoutRef.current = null
    }
    
    // Update progress with session end
    updateProgress({
      currentTime: milestoneState.totalWatchTime,
      duration: milestoneState.totalWatchTime || 1,
      triggerType: 'unload',
      sessionEnded: true
    })
    
    console.log('📹 Expert session ended')
  }, [milestoneState.totalWatchTime, updateProgress])
  
  const pauseSession = useCallback(() => {
    const now = Date.now()
    setMilestoneState(prev => ({
      ...prev,
      pauseStartTime: now
    }))
    
    console.log('⏸️ Expert session paused')
  }, [])
  
  const resumeSession = useCallback(() => {
    let pauseDuration = 0
    
    if (milestoneState.pauseStartTime) {
      pauseDuration = (Date.now() - milestoneState.pauseStartTime) / 1000
      
      // Save if pause was significant
      if (pauseDuration >= PAUSE_SAVE_THRESHOLD) {
        updateProgress({
          currentTime: milestoneState.totalWatchTime,
          duration: milestoneState.totalWatchTime || 1,
          triggerType: 'pause',
          pauseDuration: Math.floor(pauseDuration)
        })
      }
    }
    
    setMilestoneState(prev => ({
      ...prev,
      pauseStartTime: null
    }))
    
    console.log(`▶️ Expert session resumed after ${Math.round(pauseDuration)}s pause`)
  }, [milestoneState.pauseStartTime, milestoneState.totalWatchTime, updateProgress])
  
  // Complete session
  const completeSession = useCallback(async (currentTime: number, duration: number) => {
    console.log('🎉 Completing expert session')
    
    await updateProgress({
      currentTime,
      duration,
      triggerType: 'completion',
      milestone: 100,
      forceCompletion: true
    })
  }, [updateProgress])
  
  // Clear error state
  const clearError = useCallback(() => {
    setHasError(false)
    setErrorMessage(null)
  }, [])
  
  // Utility functions
  const getNextMilestone = useCallback((): number | null => {
    const nextMilestone = MILESTONES.find(m => m > milestoneState.currentMilestone)
    return nextMilestone || null
  }, [milestoneState.currentMilestone])
  
  const shouldSaveMilestone = useCallback((currentPercentage: number): { shouldSave: boolean; milestone?: number } => {
    for (const milestone of MILESTONES) {
      if (currentPercentage >= milestone && milestone > milestoneState.lastMilestoneSaved) {
        return { shouldSave: true, milestone }
      }
    }
    return { shouldSave: false }
  }, [milestoneState.lastMilestoneSaved])
  
  const canMarkAsCompleted = useCallback((currentPercentage: number): boolean => {
    return currentPercentage >= COMPLETION_THRESHOLD
  }, [])
  
  const calculateResumePosition = useCallback((milestone: number, duration: number): number => {
    return Math.floor((milestone / 100) * duration)
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
      }
      
      // End session if active
      if (milestoneState.isSessionActive) {
        endSession()
      }
    }
  }, [milestoneState.isSessionActive, endSession])
  
  return {
    // State
    milestoneState,
    isSaving: updateProgressMutation.isPending,
    hasError,
    errorMessage,
    justCompleted,
    starLevelUnlocked,
    
    // Actions
    updateProgress,
    markMilestoneReached,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    completeSession,
    clearError,
    
    // Utilities
    getNextMilestone,
    shouldSaveMilestone,
    canMarkAsCompleted,
    calculateResumePosition
  }
} 