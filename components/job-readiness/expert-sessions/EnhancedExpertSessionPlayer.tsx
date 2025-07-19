"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { MilestoneProgressIndicator } from './MilestoneProgressIndicator'
interface ExpertSession {
  id: string
  title: string
  description: string
  video_url: string
  video_duration: number
  created_at: string
  student_progress: {
    watch_time_seconds: number
    completion_percentage: number
    is_completed: boolean
    completed_at: string | null
    last_milestone_reached?: number
    // Phase 2: Enhanced resume functionality
    can_resume: boolean
    resume_from_milestone: number
    resume_position_seconds: number
    milestones_unlocked: number[]
  }
}

interface EnhancedExpertSessionPlayerProps {
  session: ExpertSession
  onProgressUpdate: (event: ProgressUpdateEvent) => void
  isUpdatingProgress?: boolean
}

interface ProgressUpdateEvent {
  sessionId: string
  currentTime: number
  duration: number
  triggerType: string
  milestone?: number
  forceCompletion?: boolean
  // Phase 2: Enhanced fields
  session_started?: boolean
  session_ended?: boolean
  pause_duration?: number
  resume_from_milestone?: number
}

interface MilestoneTrackingState {
  lastMilestoneSaved: number
  pauseStartTime: number | null
  sessionStartTime: number | null
  currentMilestone: number
  milestonesUnlocked: number[]
  isSessionActive: boolean
}

const MILESTONES = [10, 25, 50, 75, 90, 95, 100] // percentages
const COMPLETION_THRESHOLD = 100 // 100% for completion
const MIN_WATCH_TIME = 3 // seconds before milestone counts
const PAUSE_SAVE_THRESHOLD = 30 // save after 30s pause

export function EnhancedExpertSessionPlayer({ 
  session, 
  onProgressUpdate, 
  isUpdatingProgress = false 
}: EnhancedExpertSessionPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Video state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(session.video_duration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, ] = useState(false)
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Resume functionality
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [hasStartedWatching, setHasStartedWatching] = useState(false)
  
  // Enhanced milestone tracking
  const [milestoneState, setMilestoneState] = useState<MilestoneTrackingState>(() => {
    const currentProgress = session.student_progress.completion_percentage || 0
    const lastMilestone = session.student_progress.last_milestone_reached || 0
    
    // Fix: If completion percentage suggests milestones should be unlocked but last_milestone_reached is 0,
    // use the highest milestone that should be unlocked based on completion percentage
    const expectedMilestone = MILESTONES.filter(m => currentProgress >= m).pop() || 0
    const effectiveLastMilestone = Math.max(lastMilestone, expectedMilestone)
    
    const unlockedMilestones = MILESTONES.filter(m => currentProgress >= m)
    
    console.log(`🎬 Initializing milestone state: ${currentProgress}% progress, DB milestone: ${lastMilestone}, effective milestone: ${effectiveLastMilestone}`)
    
    return {
      lastMilestoneSaved: effectiveLastMilestone,
      pauseStartTime: null,
      sessionStartTime: null,
      currentMilestone: effectiveLastMilestone,
      milestonesUnlocked: unlockedMilestones,
      isSessionActive: false
    }
  })

  // Resume dialog shows when auto-resume fails or for user choice
  useEffect(() => {
    const effectiveLastMilestone = milestoneState.lastMilestoneSaved
    
    // Show dialog if there's milestone progress and user hasn't started watching
    if (effectiveLastMilestone >= 10 && 
        !session.student_progress.is_completed && 
        !hasStartedWatching) {
      // Give auto-resume a chance to work, then show dialog as fallback
      const timer = setTimeout(() => {
        if (!hasStartedWatching) {
          console.log(`⚠️ Auto-resume may have failed, showing resume dialog for ${effectiveLastMilestone}% milestone`)
          setShowResumeDialog(true)
        }
      }, 2000) // Wait 2 seconds for auto-resume to complete
      
      return () => clearTimeout(timer)
    }
  }, [milestoneState.lastMilestoneSaved, session.student_progress.is_completed, hasStartedWatching])

  // Enhanced progress update with session tracking
  const handleProgressUpdate = useCallback((
    currentTime: number,
    duration: number,
    triggerType: string,
    options: {
      milestone?: number
      forceCompletion?: boolean
      sessionStarted?: boolean
      sessionEnded?: boolean
      pauseDuration?: number
      resumeFromMilestone?: number
    } = {}
  ) => {
    if (isUpdatingProgress) return

    try {
      const event: ProgressUpdateEvent = {
        sessionId: session.id,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
        triggerType,
        ...options
      }
      
      onProgressUpdate(event)
    } catch (error) {
      console.error('Failed to update progress:', error)
      setErrorMessage('Failed to save progress. Please check your connection.')
      toast.error('Failed to save progress', {
        description: 'Your progress may not be saved. Please try again.',
      })
    }
  }, [isUpdatingProgress, session.id, onProgressUpdate])

  // Start video session
  const startVideoSession = useCallback(() => {
    const now = Date.now()
    setMilestoneState(prev => ({
      ...prev,
      sessionStartTime: now,
      isSessionActive: true
    }))
    
    handleProgressUpdate(currentTime, duration, 'milestone', {
      sessionStarted: true
    })
  }, [currentTime, duration, handleProgressUpdate])

  // End video session
  const endVideoSession = useCallback(() => {
    if (!milestoneState.isSessionActive) return
    
    setMilestoneState(prev => ({
      ...prev,
      isSessionActive: false,
      sessionStartTime: null
    }))
    
    handleProgressUpdate(currentTime, duration, 'unload', {
      sessionEnded: true
    })
  }, [currentTime, duration, handleProgressUpdate, milestoneState.isSessionActive])

  // Check and save milestone
  const checkMilestone = useCallback((currentTime: number, duration: number) => {
    if (duration <= 0 || currentTime < MIN_WATCH_TIME) return

    const currentPercentage = Math.floor((currentTime / duration) * 100)
    
    console.log(`🔍 Milestone Check:`, {
      currentTime,
      duration,
      currentPercentage,
      lastMilestoneSaved: milestoneState.lastMilestoneSaved,
      milestones: MILESTONES
    })
    
    // Find the highest milestone that should be unlocked based on current progress
    const milestoneToUnlock = MILESTONES.find(milestone => 
      currentPercentage >= milestone && 
      milestone > milestoneState.lastMilestoneSaved
    )
    
    console.log(`🎯 Milestone to unlock:`, milestoneToUnlock)
    
    if (milestoneToUnlock) {
      console.log(`🎯 Milestone ${milestoneToUnlock}% reached at ${currentTime}s (${currentPercentage}% progress)`)
      
      // Get all milestones that should be unlocked up to this point
      const allUnlockedMilestones = MILESTONES.filter(m => currentPercentage >= m)
      
      setMilestoneState(prev => ({
        ...prev,
        lastMilestoneSaved: milestoneToUnlock,
        currentMilestone: milestoneToUnlock,
        milestonesUnlocked: allUnlockedMilestones
      }))
      
      // Silent milestone save - no UI interruption
      handleProgressUpdate(currentTime, duration, 'milestone', {
        milestone: milestoneToUnlock,
        forceCompletion: milestoneToUnlock >= COMPLETION_THRESHOLD
      })
      
      console.log(`✅ Milestone ${milestoneToUnlock}% saved to backend`)
    }
  }, [milestoneState.lastMilestoneSaved, handleProgressUpdate])

  // Resume from milestone position (fallback if auto-resume fails)
  const resumeFromMilestone = useCallback(() => {
    if (!videoRef.current) return
    
    // Use milestone-based resume position
    const lastMilestone = session.student_progress.last_milestone_reached || 0
    const resumeTime = Math.floor((lastMilestone / 100) * duration)
    
    videoRef.current.currentTime = resumeTime
    setCurrentTime(resumeTime)
    setShowResumeDialog(false)
    setHasStartedWatching(true)
    
    // Start session when resuming
    startVideoSession()
    
    handleProgressUpdate(resumeTime, duration, 'resume', {
      resumeFromMilestone: lastMilestone
    })
    
    toast.success(`Resumed from ${lastMilestone}% checkpoint`)
  }, [session.student_progress.last_milestone_reached, duration, handleProgressUpdate, startVideoSession])

  // Start from beginning
  const startFromBeginning = useCallback(() => {
    if (!videoRef.current) return
    
    videoRef.current.currentTime = 0
    setCurrentTime(0)
    setShowResumeDialog(false)
    setHasStartedWatching(true)
    
    // Start session when starting from beginning
    startVideoSession()
    
    toast.success('Starting from the beginning')
  }, [startVideoSession])

  // Video event handlers with enhanced tracking
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
      
      // Auto-resume from last milestone reached (efficient DB approach)
      const effectiveLastMilestone = milestoneState.lastMilestoneSaved
      
      console.log(`🔍 Resume Debug:`, {
        dbLastMilestone: session.student_progress.last_milestone_reached,
        effectiveLastMilestone,
        completionPercentage: session.student_progress.completion_percentage,
        isCompleted: session.student_progress.is_completed,
        canResume: session.student_progress.can_resume,
        resumeFromMilestone: session.student_progress.resume_from_milestone,
        resumePositionSeconds: session.student_progress.resume_position_seconds
      })
      
      if (effectiveLastMilestone >= 10 && !session.student_progress.is_completed) {
        // Use API-provided resume position if available, otherwise calculate from milestone
        const resumePosition = session.student_progress.resume_position_seconds || 
                              Math.floor((effectiveLastMilestone / 100) * video.duration)
        
        console.log(`🔄 Auto-resuming from ${effectiveLastMilestone}% milestone: ${resumePosition}s (video duration: ${video.duration}s)`)
        
        // Ensure resume position is valid
        if (resumePosition > 0 && resumePosition < video.duration) {
          try {
            video.currentTime = resumePosition
            setCurrentTime(resumePosition)
            setHasStartedWatching(true)
            
            // Don't show resume dialog since we're auto-resuming
            setShowResumeDialog(false)
            
            // Start the session immediately when auto-resuming
            setMilestoneState(prev => ({
              ...prev,
              sessionStartTime: Date.now(),
              isSessionActive: true
            }))
            
            // Show notification about auto-resume
            import('sonner').then(({ toast }) => {
              toast.success(`Resumed from ${effectiveLastMilestone}% checkpoint`, {
                description: `Continuing from ${Math.floor(resumePosition / 60)}:${(resumePosition % 60).toString().padStart(2, '0')}`,
                duration: 3000,
              })
            })
            
            console.log(`✅ Auto-resume successful: video.currentTime = ${video.currentTime}`)
          } catch (error) {
            console.error(`❌ Auto-resume failed:`, error)
            // Fallback: show resume dialog
            setTimeout(() => {
              if (!hasStartedWatching) {
                setShowResumeDialog(true)
              }
            }, 1000)
          }
        } else {
          console.warn(`⚠️ Invalid resume position ${resumePosition}s for video duration ${video.duration}s`)
          setHasStartedWatching(false)
        }
      } else if (effectiveLastMilestone < 10) {
        console.log(`🔄 Starting from beginning: last milestone ${effectiveLastMilestone}% < 10%`)
        setHasStartedWatching(false)
      }
    }

    const handleTimeUpdate = () => {
      const current = video.currentTime
      setCurrentTime(current)
      
      // Silent milestone checking - no UI interruption
      if (!isUpdatingProgress && milestoneState.isSessionActive) {
        // Debug logging every 10 seconds
        if (Math.floor(current) % 10 === 0 && current > 0) {
          const currentPercentage = Math.floor((current / video.duration) * 100)
          console.log(`⏱️  Time update: ${Math.floor(current)}s (${currentPercentage}%), last milestone: ${milestoneState.lastMilestoneSaved}`)
        }
        checkMilestone(current, video.duration)
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      
      // Start session if not already started
      if (!milestoneState.isSessionActive && hasStartedWatching) {
        startVideoSession()
      }
      
      // Handle pause duration tracking
      if (milestoneState.pauseStartTime) {
        const pauseDuration = (Date.now() - milestoneState.pauseStartTime) / 1000
        
        if (pauseDuration >= PAUSE_SAVE_THRESHOLD) {
          handleProgressUpdate(video.currentTime, video.duration, 'pause', {
            pauseDuration: Math.floor(pauseDuration)
          })
        }
        
        setMilestoneState(prev => ({
          ...prev,
          pauseStartTime: null
        }))
      }
    }

    const handlePause = () => {
      setIsPlaying(false)
      
      setMilestoneState(prev => ({
        ...prev,
        pauseStartTime: Date.now()
      }))
      
      // No database save on pause - milestone system handles progress saving
      console.log(`⏸️  Video paused at ${Math.floor(video.currentTime)}s - relying on milestone saves`)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      
      // Force completion when video ends
      handleProgressUpdate(video.duration, video.duration, 'completion', {
        forceCompletion: true,
        milestone: 100
      })
      
      endVideoSession()
      
      toast.success('🎉 Expert session completed!', {
        description: 'Great job! Your progress has been saved.',
      })
    }

    // Phase 2: Disable seeking to enforce sequential viewing
    const handleSeeking = (e: Event) => {
      e.preventDefault()
      
      // Reset to last valid position
      if (currentTime > 0) {
        video.currentTime = currentTime
      }
      
      toast.error('Seeking is disabled', {
        description: 'Please watch the video sequentially to track your progress properly.',
      })
    }

    const handleError = () => {
      setHasError(true)
      setIsLoading(false)
      setErrorMessage('Failed to load video. Please refresh and try again.')
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setHasError(false)
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

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('seeking', handleSeeking)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadstart', handleLoadStart)
    }
  }, [checkMilestone, handleProgressUpdate, endVideoSession, startVideoSession, isUpdatingProgress, milestoneState.isSessionActive, milestoneState.pauseStartTime, hasStartedWatching, currentTime])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (milestoneState.isSessionActive) {
        endVideoSession()
      }
    }
  }, [endVideoSession, milestoneState.isSessionActive])

  // Save progress when user navigates away or closes tab (emergency backup)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only save if significant progress would be lost (beyond last milestone)
      const currentPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
      const lastMilestone = milestoneState.lastMilestoneSaved || 0
      
      if (milestoneState.isSessionActive && 
          currentTime > MIN_WATCH_TIME && 
          currentPercentage > lastMilestone + 5) { // Save if 5%+ progress since last milestone
        console.log(`🚨 Emergency save on unload: ${Math.floor(currentPercentage)}% (last milestone: ${lastMilestone}%)`)
        handleProgressUpdate(currentTime, duration, 'unload')
      }
    }

    const handleVisibilityChange = () => {
      const currentPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
      const lastMilestone = milestoneState.lastMilestoneSaved || 0
      
      if (document.visibilityState === 'hidden' && 
          milestoneState.isSessionActive && 
          currentTime > MIN_WATCH_TIME &&
          currentPercentage > lastMilestone + 5) { // Save if 5%+ progress since last milestone
        console.log(`🚨 Emergency save on tab hidden: ${Math.floor(currentPercentage)}% (last milestone: ${lastMilestone}%)`)
        handleProgressUpdate(currentTime, duration, 'navigation')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [milestoneState.isSessionActive, currentTime, duration, handleProgressUpdate])

  // Enhanced control handlers
  const togglePlay = useCallback(async () => {
    if (!videoRef.current) {
      console.log('Video ref not available')
      return
    }
    
    const video = videoRef.current
    
    if (!hasStartedWatching) {
      setHasStartedWatching(true)
    }
    
    try {
      if (isPlaying) {
        console.log('Pausing video via toggle - relying on milestone saves')
        video.pause()
      } else {
        console.log('Playing video...')
        // Handle browser autoplay restrictions
        const playPromise = video.play()
        
        if (playPromise !== undefined) {
          await playPromise
          console.log('Video playing successfully')
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error)
      
      // Handle autoplay restrictions
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Click to start video', {
          description: 'Your browser requires user interaction to play videos.',
        })
      } else {
        toast.error('Playbook error', {
          description: 'There was an issue with video playback. Please try again.',
        })
      }
    }
  }, [isPlaying, hasStartedWatching, milestoneState.isSessionActive, handleProgressUpdate])


  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    
    if (isMuted) {
      videoRef.current.volume = volume
      setIsMuted(false)
    } else {
      videoRef.current.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }, [isFullscreen])

  // Manual completion button (only when video fully watched)
  const handleManualCompletion = useCallback(() => {
    if (!videoRef.current) return
    
    const watchedPercentage = (currentTime / duration) * 100
    if (watchedPercentage < COMPLETION_THRESHOLD) {
      toast.error('Please watch more of the video', {
        description: `You need to watch at least ${COMPLETION_THRESHOLD}% to complete this session.`,
      })
      return
    }
    
    handleProgressUpdate(duration, duration, 'completion', {
      forceCompletion: true,
      milestone: 100
    })
    
    endVideoSession()
    
    toast.success('🎉 Expert session marked as completed!')
  }, [currentTime, duration, handleProgressUpdate, endVideoSession])

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const currentPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  const canComplete = currentPercentage >= COMPLETION_THRESHOLD

  return (
    <div className="space-y-4">
      {/* Resume Dialog */}
      {showResumeDialog && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 mx-1 sm:mx-0">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <AlertDescription className="space-y-3">
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">Resume from where you left off?</p>
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1">
                You can resume from the {session.student_progress.last_milestone_reached || session.student_progress.resume_from_milestone}% milestone 
                ({formatTime(session.student_progress.resume_position_seconds || Math.floor(((session.student_progress.last_milestone_reached || 0) / 100) * duration))})
              </p>
            </div>
            <div className="flex flex-col xs:flex-row gap-2">
              <Button 
                size="sm" 
                onClick={resumeFromMilestone}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-xs sm:text-sm flex-1 xs:flex-initial"
              >
                <span className="hidden xs:inline">Resume from {session.student_progress.last_milestone_reached || session.student_progress.resume_from_milestone}%</span>
                <span className="xs:hidden">Resume ({session.student_progress.last_milestone_reached || session.student_progress.resume_from_milestone}%)</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={startFromBeginning}
                className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20 text-xs sm:text-sm flex-1 xs:flex-initial"
              >
                <span className="hidden xs:inline">Start from beginning</span>
                <span className="xs:hidden">Start over</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {(hasError || errorMessage) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage || 'Failed to load video. Please refresh and try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Video Player */}
      <Card ref={containerRef} className="overflow-hidden">
        <CardContent className="p-0 relative bg-black">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="text-center text-white space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm">Loading video...</p>
              </div>
            </div>
          )}

          {/* Video Element */}
          <video
            ref={videoRef}
            src={session.video_url}
            className="w-full aspect-video bg-black"
            preload="metadata"
            playsInline
            onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
            // Disable native controls to avoid interference with custom controls
            controls={false}
          />

          {/* Click-to-play overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
            style={{ bottom: '100px' }} // Leave space for controls
          >
            {!isPlaying && !isLoading && (
              <div className="bg-black/50 rounded-full p-6 hover:bg-black/70 transition-all">
                <Play className="h-12 w-12 text-white" />
              </div>
            )}
          </div>

          {/* Controls Overlay - Always visible for reliable access */}
          {!isLoading && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent py-3 px-2 sm:p-4 z-20">
              <div className="space-y-3 sm:space-y-4">
                {/* Milestone Progress Indicator */}
                <div className="px-2 sm:px-0 -mx-1 sm:mx-0">
                  <MilestoneProgressIndicator
                    currentPercentage={currentPercentage}
                    milestonesUnlocked={milestoneState.milestonesUnlocked}
                    isDisabled={true} // Read-only, no interactions
                  />
                </div>

                {/* Video Controls */}
                <div className="flex items-center justify-between text-white gap-2 sm:gap-4">
                  {/* Left: Play/Pause Button */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20 p-2 sm:p-3 rounded-full min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px]"
                      disabled={isUpdatingProgress}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                      ) : (
                        <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                      )}
                    </Button>
                    
                    {/* Progress Saving Indicator */}
                    {isUpdatingProgress && (
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-300">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                      </div>
                    )}
                  </div>

                  {/* Center: Time Display */}
                  <div className="flex-1 mx-2 sm:mx-4 text-center">
                    <div className="text-xs sm:text-sm text-gray-300 font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  {/* Right: Volume and Fullscreen */}
                  <div className="flex items-center gap-1 sm:gap-3">
                    {/* Volume Controls */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 p-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </Button>

                    {/* Fullscreen Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20 p-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]"
                    >
                      <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual Completion Button */}
          {canComplete && !session.student_progress.is_completed && (
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
              <Button
                onClick={handleManualCompletion}
                disabled={isUpdatingProgress}
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
                size="sm"
              >
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Mark Complete</span>
                <span className="xs:hidden">✓</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Info */}
      <div className="text-xs sm:text-sm text-muted-foreground space-y-1 px-1 sm:px-0">
        <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-2">
          <span className="font-medium">Progress: {Math.round(currentPercentage)}%</span>
          <span className="font-mono text-[11px] xs:text-xs sm:text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        {milestoneState.currentMilestone > 0 && (
          <div className="flex items-center gap-2 text-[11px] xs:text-xs sm:text-sm">
            <span>Latest milestone: {milestoneState.currentMilestone}%</span>
            {isUpdatingProgress && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
        )}
      </div>
    </div>
  )
} 