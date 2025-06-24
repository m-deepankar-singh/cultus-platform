"use client"

import { useRef, useEffect, useState, useCallback, RefObject } from 'react'
import { toast } from 'sonner'

// Types
interface VideoPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  showControls: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string | null
}

interface MilestoneState {
  currentMilestone: number
  milestonesReached: number[]
  lastSaveTime: number
  pauseStartTime: number | null
  sessionStartTime: number | null
  hasStartedWatching: boolean
}

interface UseExpertSessionPlayerOptions {
  sessionId: string
  videoUrl: string
  videoDuration: number
  initialProgress?: {
    watch_time_seconds?: number
    last_milestone_reached?: number
    can_resume?: boolean
    resume_from_milestone?: number
    resume_position_seconds?: number
  }
  onMilestoneReached?: (milestone: number, currentTime: number, duration: number) => void
  onProgressUpdate?: (currentTime: number, duration: number, triggerType: string) => void
  onVideoCompleted?: (currentTime: number, duration: number) => void
  onError?: (error: Error) => void
}

interface UseExpertSessionPlayerReturn {
  // Video state
  videoPlayerState: VideoPlayerState
  milestoneState: MilestoneState
  
  // Video controls
  togglePlay: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  toggleControls: () => void
  
  // Progress controls
  resumeFromMilestone: () => void
  startFromBeginning: () => void
  markAsCompleted: () => void
  
  // Utilities
  formatTime: (time: number) => string
  getCurrentPercentage: () => number
  getNextMilestone: () => number | null
  canMarkAsCompleted: () => boolean
  shouldShowResumeDialog: () => boolean
}

// Constants
const MILESTONES = [10, 25, 50, 75, 90, 95, 100]
const COMPLETION_THRESHOLD = 100
const MIN_WATCH_TIME = 3
const PAUSE_SAVE_THRESHOLD = 30
const SAVE_THROTTLE_MS = 2000

export function useExpertSessionPlayer({
  sessionId,
  videoUrl,
  videoDuration,
  initialProgress = {},
  onMilestoneReached,
  onProgressUpdate,
  onVideoCompleted,
  onError
}: UseExpertSessionPlayerOptions): UseExpertSessionPlayerReturn {
  
  // Video element ref
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  // State
  const [videoPlayerState, setVideoPlayerState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: initialProgress.watch_time_seconds || 0,
    duration: videoDuration,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    showControls: true,
    isLoading: true,
    hasError: false,
    errorMessage: null
  })
  
  const [milestoneState, setMilestoneState] = useState<MilestoneState>({
    currentMilestone: initialProgress.last_milestone_reached || 0,
    milestonesReached: [],
    lastSaveTime: 0,
    pauseStartTime: null,
    sessionStartTime: null,
    hasStartedWatching: false
  })
  
  // Throttle ref for saves
  const lastSaveRef = useRef<number>(0)
  
  // Initialize video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    // Set video source
    video.src = videoUrl
    video.preload = 'metadata'
    
    // Set initial time if resuming
    if (initialProgress.watch_time_seconds && initialProgress.watch_time_seconds > 0) {
      video.currentTime = initialProgress.watch_time_seconds
    }
  }, [videoUrl, initialProgress.watch_time_seconds])
  
  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const handleLoadedMetadata = () => {
      setVideoPlayerState(prev => ({
        ...prev,
        duration: video.duration,
        isLoading: false,
        hasError: false
      }))
    }
    
    const handleTimeUpdate = () => {
      const currentTime = video.currentTime
      
      setVideoPlayerState(prev => ({
        ...prev,
        currentTime
      }))
      
      // Check for milestone progression
      checkMilestoneProgression(currentTime, video.duration)
    }
    
    const handlePlay = () => {
      setVideoPlayerState(prev => ({ ...prev, isPlaying: true }))
      
      // Handle pause duration if resuming
      if (milestoneState.pauseStartTime) {
        const pauseDuration = Date.now() - milestoneState.pauseStartTime
        
        if (pauseDuration >= PAUSE_SAVE_THRESHOLD * 1000) {
          // Significant pause detected
          if (onProgressUpdate) {
            onProgressUpdate(video.currentTime, video.duration, 'pause')
          }
        }
        
        setMilestoneState(prev => ({ ...prev, pauseStartTime: null }))
      }
      
      // Start session if first play
      if (!milestoneState.hasStartedWatching) {
        setMilestoneState(prev => ({
          ...prev,
          hasStartedWatching: true,
          sessionStartTime: Date.now()
        }))
      }
    }
    
    const handlePause = () => {
      setVideoPlayerState(prev => ({ ...prev, isPlaying: false }))
      setMilestoneState(prev => ({ ...prev, pauseStartTime: Date.now() }))
    }
    
    const handleEnded = () => {
      setVideoPlayerState(prev => ({ ...prev, isPlaying: false }))
      
      // Mark as completed
      if (onVideoCompleted) {
        onVideoCompleted(video.duration, video.duration)
      }
      
      toast.success('🎉 Expert session completed!', {
        description: 'Great job! Your progress has been saved.',
      })
    }
    
    // Prevent seeking to enforce sequential viewing
    const handleSeeking = (e: Event) => {
      e.preventDefault()
      
      // Reset to last valid position
      const currentTime = videoPlayerState.currentTime
      if (currentTime > 0) {
        video.currentTime = currentTime
      }
      
      toast.error('Seeking is disabled', {
        description: 'Please watch the video sequentially to track your progress properly.',
      })
    }
    
    const handleError = () => {
      const errorMessage = 'Failed to load video. Please refresh and try again.'
      setVideoPlayerState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage
      }))
      
      if (onError) {
        onError(new Error(errorMessage))
      }
    }
    
    const handleLoadStart = () => {
      setVideoPlayerState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false,
        errorMessage: null
      }))
    }
    
    const handleVolumeChange = () => {
      setVideoPlayerState(prev => ({
        ...prev,
        volume: video.volume,
        isMuted: video.muted
      }))
    }
    
    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('seeking', handleSeeking)
    video.addEventListener('error', handleError)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('volumechange', handleVolumeChange)
    
    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('seeking', handleSeeking)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [videoPlayerState.currentTime, milestoneState.pauseStartTime, milestoneState.hasStartedWatching, onProgressUpdate, onVideoCompleted, onError])
  
  // Milestone progression checking
  const checkMilestoneProgression = useCallback((currentTime: number, duration: number) => {
    if (duration <= 0 || currentTime < MIN_WATCH_TIME) return
    
    const currentPercentage = Math.floor((currentTime / duration) * 100)
    
    for (const milestone of MILESTONES) {
      if (currentPercentage >= milestone && 
          milestone > milestoneState.currentMilestone &&
          !milestoneState.milestonesReached.includes(milestone)) {
        
        // Throttle milestone saves
        const now = Date.now()
        if (now - lastSaveRef.current < SAVE_THROTTLE_MS) {
          return
        }
        lastSaveRef.current = now
        
        console.log(`🎯 Milestone ${milestone}% reached at ${currentTime}s`)
        
        // Update local state
        setMilestoneState(prev => ({
          ...prev,
          currentMilestone: milestone,
          milestonesReached: [...prev.milestonesReached, milestone].sort((a, b) => a - b),
          lastSaveTime: now
        }))
        
        // Call callback
        if (onMilestoneReached) {
          onMilestoneReached(milestone, currentTime, duration)
        }
        
        break // Only process one milestone per check
      }
    }
  }, [milestoneState.currentMilestone, milestoneState.milestonesReached, onMilestoneReached])
  
  // Video control functions
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    if (videoPlayerState.isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }, [videoPlayerState.isPlaying])
  
  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current
    if (!video) return
    
    video.volume = Math.max(0, Math.min(1, volume))
    setVideoPlayerState(prev => ({
      ...prev,
      volume: video.volume,
      isMuted: video.volume === 0
    }))
  }, [])
  
  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    video.muted = !video.muted
    setVideoPlayerState(prev => ({
      ...prev,
      isMuted: video.muted
    }))
  }, [])
  
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    
    if (!videoPlayerState.isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
        setVideoPlayerState(prev => ({ ...prev, isFullscreen: true }))
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setVideoPlayerState(prev => ({ ...prev, isFullscreen: false }))
      }
    }
  }, [videoPlayerState.isFullscreen])
  
  const toggleControls = useCallback(() => {
    setVideoPlayerState(prev => ({
      ...prev,
      showControls: !prev.showControls
    }))
  }, [])
  
  // Resume controls
  const resumeFromMilestone = useCallback(() => {
    const video = videoRef.current
    if (!video || !initialProgress.resume_position_seconds) return
    
    video.currentTime = initialProgress.resume_position_seconds
    setVideoPlayerState(prev => ({
      ...prev,
      currentTime: initialProgress.resume_position_seconds!
    }))
    
    setMilestoneState(prev => ({ ...prev, hasStartedWatching: true }))
    
    toast.success(`Resumed from ${initialProgress.resume_from_milestone}% milestone`)
  }, [initialProgress.resume_position_seconds, initialProgress.resume_from_milestone])
  
  const startFromBeginning = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    video.currentTime = 0
    setVideoPlayerState(prev => ({ ...prev, currentTime: 0 }))
    setMilestoneState(prev => ({ ...prev, hasStartedWatching: true }))
    
    toast.success('Starting from the beginning')
  }, [])
  
  const markAsCompleted = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    
    const currentPercentage = getCurrentPercentage()
    if (currentPercentage < COMPLETION_THRESHOLD) {
      toast.error('Please watch more of the video', {
        description: `You need to watch at least ${COMPLETION_THRESHOLD}% to complete this session.`,
      })
      return
    }
    
    if (onVideoCompleted) {
      onVideoCompleted(video.duration, video.duration)
    }
    
    toast.success('🎉 Expert session marked as completed!')
  }, [onVideoCompleted])
  
  // Utility functions
  const formatTime = useCallback((time: number): string => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])
  
  const getCurrentPercentage = useCallback((): number => {
    return videoPlayerState.duration > 0 
      ? (videoPlayerState.currentTime / videoPlayerState.duration) * 100 
      : 0
  }, [videoPlayerState.currentTime, videoPlayerState.duration])
  
  const getNextMilestone = useCallback((): number | null => {
    const nextMilestone = MILESTONES.find(m => m > milestoneState.currentMilestone)
    return nextMilestone || null
  }, [milestoneState.currentMilestone])
  
  const canMarkAsCompleted = useCallback((): boolean => {
    return getCurrentPercentage() >= COMPLETION_THRESHOLD
  }, [getCurrentPercentage])
  
  const shouldShowResumeDialog = useCallback((): boolean => {
    return !!(initialProgress.can_resume && 
             initialProgress.resume_from_milestone && 
             initialProgress.resume_from_milestone > 0 &&
             !milestoneState.hasStartedWatching)
  }, [initialProgress.can_resume, initialProgress.resume_from_milestone, milestoneState.hasStartedWatching])
  
  // Expose video and container refs
  useEffect(() => {
    return () => {
      // Cleanup any ongoing sessions
      if (milestoneState.sessionStartTime && onProgressUpdate) {
        onProgressUpdate(videoPlayerState.currentTime, videoPlayerState.duration, 'unload')
      }
    }
  }, [milestoneState.sessionStartTime, videoPlayerState.currentTime, videoPlayerState.duration, onProgressUpdate])
  
  return {
    // Video state
    videoPlayerState,
    milestoneState,
    
    // Video controls
    togglePlay,
    setVolume,
    toggleMute,
    toggleFullscreen,
    toggleControls,
    
    // Progress controls
    resumeFromMilestone,
    startFromBeginning,
    markAsCompleted,
    
    // Utilities
    formatTime,
    getCurrentPercentage,
    getNextMilestone,
    canMarkAsCompleted,
    shouldShowResumeDialog
  }
}

// Helper function to get video ref
export function useVideoRef(): RefObject<HTMLVideoElement | null> {
  return useRef<HTMLVideoElement | null>(null)
}

// Helper function to get container ref
export function useContainerRef(): RefObject<HTMLDivElement | null> {
  return useRef<HTMLDivElement | null>(null)
} 