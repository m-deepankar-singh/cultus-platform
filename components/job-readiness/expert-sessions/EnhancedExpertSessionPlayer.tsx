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
  const [milestoneState, setMilestoneState] = useState<MilestoneTrackingState>({
    lastMilestoneSaved: session.student_progress.last_milestone_reached || 0,
    pauseStartTime: null,
    sessionStartTime: null,
    currentMilestone: 0,
    milestonesUnlocked: session.student_progress.milestones_unlocked || [],
    isSessionActive: false
  })

  // Phase 2: Check if can resume from milestone
  useEffect(() => {
    if (session.student_progress.can_resume && 
        session.student_progress.resume_from_milestone > 0 && 
        !hasStartedWatching) {
      setShowResumeDialog(true)
    }
  }, [session.student_progress.can_resume, session.student_progress.resume_from_milestone, hasStartedWatching])

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
    
    for (const milestone of MILESTONES) {
      if (currentPercentage >= milestone && 
          milestone > milestoneState.lastMilestoneSaved &&
          !milestoneState.milestonesUnlocked.includes(milestone)) {
        
        console.log(`🎯 Milestone ${milestone}% reached at ${currentTime}s`)
        
        setMilestoneState(prev => ({
          ...prev,
          lastMilestoneSaved: milestone,
          currentMilestone: milestone,
          milestonesUnlocked: [...prev.milestonesUnlocked, milestone].sort((a, b) => a - b)
        }))
        
        // Silent milestone save - no UI interruption
        handleProgressUpdate(currentTime, duration, 'milestone', {
          milestone,
          forceCompletion: milestone >= COMPLETION_THRESHOLD
        })
        
        break // Only save one milestone per check
      }
    }
  }, [milestoneState.lastMilestoneSaved, milestoneState.milestonesUnlocked, handleProgressUpdate])

  // Resume from milestone position
  const resumeFromMilestone = useCallback(() => {
    if (!videoRef.current) return
    
    const resumeTime = session.student_progress.resume_position_seconds
    videoRef.current.currentTime = resumeTime
    
    setCurrentTime(resumeTime)
    setShowResumeDialog(false)
    setHasStartedWatching(true)
    
    // Start session when resuming
    startVideoSession()
    
    handleProgressUpdate(resumeTime, duration, 'milestone', {
      resumeFromMilestone: session.student_progress.resume_from_milestone
    })
    
    toast.success(`Resumed from ${session.student_progress.resume_from_milestone}% milestone`)
  }, [session.student_progress.resume_position_seconds, session.student_progress.resume_from_milestone, duration, handleProgressUpdate, startVideoSession])

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
      
      // Set initial time if resuming
      if (session.student_progress.can_resume && 
          session.student_progress.resume_position_seconds > 0) {
        video.currentTime = session.student_progress.resume_position_seconds
        setCurrentTime(session.student_progress.resume_position_seconds)
      }
    }

    const handleTimeUpdate = () => {
      const current = video.currentTime
      setCurrentTime(current)
      
      // Silent milestone checking - no UI interruption
      if (!isUpdatingProgress && milestoneState.isSessionActive) {
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
        console.log('Pausing video...')
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
  }, [isPlaying, hasStartedWatching])


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
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="space-y-3">
            <div>
              <p className="font-medium text-blue-900">Resume from where you left off?</p>
              <p className="text-sm text-blue-700 mt-1">
                You can resume from the {session.student_progress.resume_from_milestone}% milestone 
                ({formatTime(session.student_progress.resume_position_seconds)})
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={resumeFromMilestone}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Resume from {session.student_progress.resume_from_milestone}%
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={startFromBeginning}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Start from beginning
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
        <CardContent className="p-0 relative">
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
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 z-20">
              <div className="space-y-3">
                {/* Milestone Progress Indicator */}
                <MilestoneProgressIndicator
                  currentPercentage={currentPercentage}
                  milestonesUnlocked={milestoneState.milestonesUnlocked}
                  isDisabled={true} // Read-only, no interactions
                />

                {/* Video Controls */}
                <div className="flex items-center justify-between text-white">
                  {/* Left: Play/Pause Button */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20 p-3 rounded-full"
                      disabled={isUpdatingProgress}
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                    
                    {/* Progress Saving Indicator */}
                    {isUpdatingProgress && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                      </div>
                    )}
                  </div>

                  {/* Center: Time Display */}
                  <div className="flex-1 mx-4 text-center">
                    <div className="text-sm text-gray-300">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  {/* Right: Volume and Fullscreen */}
                  <div className="flex items-center gap-3">
                    {/* Volume Controls */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 p-2"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Fullscreen Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20 p-2"
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual Completion Button */}
          {canComplete && !session.student_progress.is_completed && (
            <div className="absolute top-4 right-4">
              <Button
                onClick={handleManualCompletion}
                disabled={isUpdatingProgress}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Info */}
      <div className="text-sm text-muted-foreground space-y-1">
        <div className="flex justify-between items-center">
          <span>Progress: {Math.round(currentPercentage)}%</span>
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        {milestoneState.currentMilestone > 0 && (
          <div className="flex items-center gap-2">
            <span>Latest milestone: {milestoneState.currentMilestone}%</span>
            {isUpdatingProgress && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
        )}
      </div>
    </div>
  )
} 