"use client"

import { createContext, useContext, useCallback, useReducer, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'

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

interface ExpertSessionProgressState {
  // Progress tracking
  currentMilestone: number
  milestonesUnlocked: number[]
  watchTimeSeconds: number
  completionPercentage: number
  lastMilestoneReached: number
  
  // Resume functionality
  canResume: boolean
  resumeFromMilestone: number
  resumePositionSeconds: number
  
  // Session state
  isSessionActive: boolean
  sessionStartTime: number | null
  pauseStartTime: number | null
  totalPauseTime: number
  
  // UI state
  isSaving: boolean
  hasError: boolean
  errorMessage: string | null
  justCompletedSession: boolean
  starLevelUnlocked: boolean
  
  // Analytics data
  sessionsData: Array<{
    started_at: string
    ended_at?: string
    milestones_reached: number[]
    pauses: number
    pause_time: number
  }>
}

interface ExpertSessionProgressContextValue extends ExpertSessionProgressState {
  // Actions
  updateProgress: (data: ProgressUpdate) => Promise<void>
  markMilestoneReached: (milestone: number) => Promise<void>
  completeSession: () => Promise<void>
  startSession: () => void
  endSession: () => void
  pauseSession: () => void
  resumeSession: () => void
  setResumePoint: (milestone: number, positionSeconds: number) => void
  clearError: () => void
  
  // Getters
  getNextMilestone: () => number | null
  canMarkAsCompleted: (currentPercentage: number) => boolean
}

// Action types
type ProgressAction =
  | { type: 'SET_PROGRESS'; payload: Partial<ExpertSessionProgressState> }
  | { type: 'UPDATE_MILESTONE'; payload: { milestone: number; watchTime: number; percentage: number } }
  | { type: 'START_SESSION' }
  | { type: 'END_SESSION' }
  | { type: 'PAUSE_SESSION' }
  | { type: 'RESUME_SESSION' }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'COMPLETE_SESSION'; payload: { starUnlocked?: boolean } }
  | { type: 'SET_RESUME_POINT'; payload: { milestone: number; positionSeconds: number } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_SESSION_DATA'; payload: object }

// Constants
const MILESTONES = [10, 25, 50, 75, 90, 95, 100]
const COMPLETION_THRESHOLD = 100

// Reducer
function progressReducer(state: ExpertSessionProgressState, action: ProgressAction): ExpertSessionProgressState {
  switch (action.type) {
    case 'SET_PROGRESS':
      return { ...state, ...action.payload }
      
    case 'UPDATE_MILESTONE':
      const { milestone, watchTime, percentage } = action.payload
      return {
        ...state,
        currentMilestone: milestone,
        lastMilestoneReached: milestone,
        milestonesUnlocked: [...new Set([...state.milestonesUnlocked, milestone])].sort((a, b) => a - b),
        watchTimeSeconds: watchTime,
        completionPercentage: percentage
      }
      
    case 'START_SESSION':
      return {
        ...state,
        isSessionActive: true,
        sessionStartTime: Date.now(),
        pauseStartTime: null
      }
      
    case 'END_SESSION':
      return {
        ...state,
        isSessionActive: false,
        sessionStartTime: null,
        pauseStartTime: null
      }
      
    case 'PAUSE_SESSION':
      return {
        ...state,
        pauseStartTime: Date.now()
      }
      
    case 'RESUME_SESSION':
      const pauseDuration = state.pauseStartTime ? Date.now() - state.pauseStartTime : 0
      return {
        ...state,
        pauseStartTime: null,
        totalPauseTime: state.totalPauseTime + pauseDuration
      }
      
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload }
      
    case 'SET_ERROR':
      return { 
        ...state, 
        hasError: !!action.payload,
        errorMessage: action.payload,
        isSaving: false
      }
      
    case 'COMPLETE_SESSION':
      return {
        ...state,
        justCompletedSession: true,
        starLevelUnlocked: action.payload.starUnlocked || false,
        currentMilestone: 100,
        completionPercentage: 100,
        isSessionActive: false
      }
      
    case 'SET_RESUME_POINT':
      return {
        ...state,
        canResume: true,
        resumeFromMilestone: action.payload.milestone,
        resumePositionSeconds: action.payload.positionSeconds
      }
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        hasError: false,
        errorMessage: null
      }
      
    case 'ADD_SESSION_DATA':
      return {
        ...state,
        sessionsData: [...state.sessionsData, action.payload] as any
      }
      
    default:
      return state
  }
}

// Initial state
const initialState: ExpertSessionProgressState = {
  currentMilestone: 0,
  milestonesUnlocked: [],
  watchTimeSeconds: 0,
  completionPercentage: 0,
  lastMilestoneReached: 0,
  canResume: false,
  resumeFromMilestone: 0,
  resumePositionSeconds: 0,
  isSessionActive: false,
  sessionStartTime: null,
  pauseStartTime: null,
  totalPauseTime: 0,
  isSaving: false,
  hasError: false,
  errorMessage: null,
  justCompletedSession: false,
  starLevelUnlocked: false,
  sessionsData: []
}

// Context
const ExpertSessionProgressContext = createContext<ExpertSessionProgressContextValue | null>(null)

// Provider Props
interface ExpertSessionProgressProviderProps {
  children: ReactNode
  sessionId: string
  initialProgressData?: Partial<ExpertSessionProgressState>
  onProgressUpdate?: (data: ProgressUpdate) => Promise<any>
}

// Provider Component
export function ExpertSessionProgressProvider({
  children,
  sessionId,
  initialProgressData = {},
  onProgressUpdate
}: ExpertSessionProgressProviderProps) {
  const [state, dispatch] = useReducer(progressReducer, {
    ...initialState,
    ...initialProgressData
  })

  // Initialize from API data
  useEffect(() => {
    if (initialProgressData && Object.keys(initialProgressData).length > 0) {
      dispatch({ type: 'SET_PROGRESS', payload: initialProgressData })
    }
  }, [initialProgressData])

  // Update progress with API call
  const updateProgress = useCallback(async (data: ProgressUpdate) => {
    if (!onProgressUpdate) {
      console.warn('No onProgressUpdate handler provided')
      return
    }

    dispatch({ type: 'SET_SAVING', payload: true })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const result = await onProgressUpdate(data)
      
      // Handle success response
      if (result?.success) {
        const progressData = result.progress
        
        // Update local state based on API response
        if (progressData.milestone && progressData.milestone > state.currentMilestone) {
          dispatch({
            type: 'UPDATE_MILESTONE',
            payload: {
              milestone: progressData.milestone,
              watchTime: progressData.watch_time_seconds,
              percentage: progressData.completion_percentage
            }
          })
        }
        
        // Handle completion
        if (progressData.is_completed && !state.justCompletedSession) {
          dispatch({
            type: 'COMPLETE_SESSION',
            payload: {
              starUnlocked: result.star_unlocked || false
            }
          })
          
          // Show completion notification
          toast.success('🎉 Expert session completed!', {
            description: result.star_unlocked 
              ? 'Congratulations! You unlocked a new star level!' 
              : 'Great job! Your progress has been saved.',
          })
        }
        
        // Update resume point
        if (progressData.resume_from_milestone !== undefined) {
          dispatch({
            type: 'SET_RESUME_POINT',
            payload: {
              milestone: progressData.resume_from_milestone,
              positionSeconds: progressData.resume_position_seconds || 0
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to update progress:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save progress'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      
      toast.error('Failed to save progress', {
        description: 'Your progress may not be saved. Please check your connection.',
      })
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [onProgressUpdate, state.currentMilestone, state.justCompletedSession])

  // Mark milestone reached
  const markMilestoneReached = useCallback(async (milestone: number) => {
    if (milestone <= state.lastMilestoneReached) return
    
    const watchTime = state.watchTimeSeconds
    const percentage = (milestone / 100) * 100 // Ensure it's a percentage
    
    await updateProgress({
      currentTime: watchTime,
      duration: watchTime / (percentage / 100), // Calculate duration from percentage
      triggerType: 'milestone',
      milestone
    })
  }, [state.lastMilestoneReached, state.watchTimeSeconds, updateProgress])

  // Complete session
  const completeSession = useCallback(async () => {
    await updateProgress({
      currentTime: state.watchTimeSeconds,
      duration: state.watchTimeSeconds,
      triggerType: 'completion',
      milestone: 100,
      forceCompletion: true
    })
  }, [state.watchTimeSeconds, updateProgress])

  // Session control actions
  const startSession = useCallback(() => {
    dispatch({ type: 'START_SESSION' })
    
    // Add session data for analytics
    dispatch({
      type: 'ADD_SESSION_DATA',
      payload: {
        started_at: new Date().toISOString(),
        milestones_reached: [],
        pauses: 0,
        pause_time: 0
      }
    })
  }, [])

  const endSession = useCallback(() => {
    dispatch({ type: 'END_SESSION' })
  }, [])

  const pauseSession = useCallback(() => {
    dispatch({ type: 'PAUSE_SESSION' })
  }, [])

  const resumeSession = useCallback(() => {
    dispatch({ type: 'RESUME_SESSION' })
  }, [])

  const setResumePoint = useCallback((milestone: number, positionSeconds: number) => {
    dispatch({
      type: 'SET_RESUME_POINT',
      payload: { milestone, positionSeconds }
    })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  // Utility functions
  const getNextMilestone = useCallback((): number | null => {
    const nextMilestone = MILESTONES.find(m => m > state.currentMilestone)
    return nextMilestone || null
  }, [state.currentMilestone])

  const canMarkAsCompleted = useCallback((currentPercentage: number): boolean => {
    return currentPercentage >= COMPLETION_THRESHOLD
  }, [])

  // Context value
  const contextValue: ExpertSessionProgressContextValue = {
    ...state,
    updateProgress,
    markMilestoneReached,
    completeSession,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    setResumePoint,
    clearError,
    getNextMilestone,
    canMarkAsCompleted
  }

  return (
    <ExpertSessionProgressContext.Provider value={contextValue}>
      {children}
    </ExpertSessionProgressContext.Provider>
  )
}

// Hook to use the context
export function useExpertSessionProgress() {
  const context = useContext(ExpertSessionProgressContext)
  if (!context) {
    throw new Error('useExpertSessionProgress must be used within an ExpertSessionProgressProvider')
  }
  return context
}

// Export types for external use
export type { 
  ExpertSessionProgressContextValue, 
  ExpertSessionProgressState, 
  ProgressUpdate 
} 