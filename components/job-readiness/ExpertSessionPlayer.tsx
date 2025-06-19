"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle2, Star, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  SAVE_TRIGGERS,
  type SaveTriggerType,
  type ProgressMilestone 
} from '@/lib/constants/progress-milestones'
import {
  calculateCompletionPercentage,
  shouldSaveMilestone,
  shouldSaveOnPause,
  calculateDisplayProgress,
  getPassedMilestones,
  getMilestoneMarkers
} from '@/lib/utils/progress-utils'
import type { 
  MilestoneTrackingState, 
  ProgressUpdateEvent
} from '@/types/expert-session-progress'

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
    last_milestone_reached?: ProgressMilestone
  }
}

interface ExpertSessionPlayerProps {
  session: ExpertSession
  onProgressUpdate: (event: ProgressUpdateEvent) => void
  isUpdatingProgress?: boolean
}

export function ExpertSessionPlayer({ session, onProgressUpdate, isUpdatingProgress = false }: ExpertSessionPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [hasWatchedComplete, setHasWatchedComplete] = useState(false)

  // Milestone tracking state
  const [milestoneState, setMilestoneState] = useState<MilestoneTrackingState>({
    lastMilestoneSaved: session.student_progress.last_milestone_reached || 0,
    pauseStartTime: null,
    pauseDuration: 0,
    lastSeekPosition: 0, // Not used since seeking is disabled
    pendingMilestone: null,
    isTrackingProgress: false
  })

  // Milestone-based progress update with enhanced feedback
  const handleMilestoneUpdate = useCallback((
    currentTime: number, 
    duration: number, 
    triggerType: SaveTriggerType,
    milestone?: ProgressMilestone,
    forceComplete?: boolean
  ) => {
    if (isUpdatingProgress) return

    setProgressError(null)

    try {
      const event: ProgressUpdateEvent = {
        sessionId: session.id,
        currentTime,
        duration,
        triggerType,
        milestone,
        forceCompletion: forceComplete
      }
      
      onProgressUpdate(event)
    } catch (error) {
      console.error('Failed to update progress:', error)
      setProgressError('Failed to save progress. Please check your connection.')
      toast.error('Failed to save progress', {
        description: 'Your progress may not be saved. Please try again.',
      })
    }
  }, [isUpdatingProgress, session.id, onProgressUpdate])

  // Check and save milestone if reached
  const checkAndSaveMilestone = useCallback((currentTime: number, duration: number) => {
    const currentPercentage = calculateCompletionPercentage(currentTime, duration)
    const milestoneCheck = shouldSaveMilestone(currentPercentage, milestoneState.lastMilestoneSaved)
    
    if (milestoneCheck.shouldSave && milestoneCheck.milestone) {
      console.log(`Milestone ${milestoneCheck.milestone}% reached at ${currentTime}s`)
      
      // Update milestone state
      setMilestoneState(prev => ({
        ...prev,
        lastMilestoneSaved: milestoneCheck.milestone!,
        pendingMilestone: milestoneCheck.milestone!
      }))
      
      // Save to database
      handleMilestoneUpdate(
        currentTime, 
        duration, 
        SAVE_TRIGGERS.MILESTONE,
        milestoneCheck.milestone
      )
      
      // Silent milestone tracking - no notifications for seamless experience
    }
  }, [milestoneState.lastMilestoneSaved, handleMilestoneUpdate])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set initial time from saved progress
    if (session.student_progress.watch_time_seconds > 0) {
      video.currentTime = session.student_progress.watch_time_seconds
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setCurrentTime(video.currentTime)
    }

    const handleTimeUpdate = () => {
      const current = video.currentTime
      setCurrentTime(current)

      // Check if user has watched the complete video (reached the end)
      if (current >= video.duration - 0.5 && !hasWatchedComplete) {
        setHasWatchedComplete(true)
      }

      // Check for milestone progression (replaces interval-based updates)
      if (!isUpdatingProgress) {
        checkAndSaveMilestone(current, video.duration)
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      
      // Check pause duration and save if needed
      if (milestoneState.pauseStartTime) {
        const pauseDuration = (Date.now() - milestoneState.pauseStartTime) / 1000
        
        if (shouldSaveOnPause(pauseDuration)) {
          console.log(`Extended pause detected: ${pauseDuration}s`)
          handleMilestoneUpdate(
            video.currentTime,
            video.duration,
            SAVE_TRIGGERS.PAUSE
          )
        }
        
        // Clear pause timer
        setMilestoneState(prev => ({
          ...prev,
          pauseStartTime: null,
          pauseDuration: 0
        }))
      }
    }

    const handlePause = () => {
      setIsPlaying(false)
      
      // Start pause timer for milestone tracking
      setMilestoneState(prev => ({
        ...prev,
        pauseStartTime: Date.now()
      }))
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setHasWatchedComplete(true)
      // Send final progress update
      if (!isUpdatingProgress) {
        handleMilestoneUpdate(video.duration, video.duration, SAVE_TRIGGERS.COMPLETION)
      }
    }

    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    const handleLoadStart = () => {
      setProgressError(null)
    }

    const handleError = (e: Event) => {
      console.error('Video error:', e)
      setProgressError('Error loading video. Please try refreshing the page.')
      toast.error('Video Error', {
        description: 'There was an error loading the video. Please try refreshing the page.',
      })
    }

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('error', handleError)

    return () => {
      // Cleanup event listeners
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('error', handleError)
    }
  }, [session.student_progress.watch_time_seconds, session.id, isUpdatingProgress, milestoneState.pauseStartTime, checkAndSaveMilestone, handleMilestoneUpdate, hasWatchedComplete])

  // Reset watched complete flag when session changes
  useEffect(() => {
    setHasWatchedComplete(session.student_progress.watch_time_seconds >= duration - 0.5)
    setProgressError(null)
    
    // Initialize milestone state from saved progress
    setMilestoneState(prev => ({
      ...prev,
      lastMilestoneSaved: session.student_progress.last_milestone_reached || 0
    }))
  }, [session.id, session.student_progress.watch_time_seconds, session.student_progress.last_milestone_reached, duration])

  // Handle page unload to save progress
  useEffect(() => {
    const handleUnload = () => {
      if (videoRef.current && !isUpdatingProgress) {
        const currentTime = videoRef.current.currentTime
        const duration = videoRef.current.duration
        
        if (currentTime > 0 && duration > 0) {
          // Use navigator.sendBeacon for reliable unload progress saving
          const event: ProgressUpdateEvent = {
            sessionId: session.id,
            currentTime,
            duration,
            triggerType: SAVE_TRIGGERS.UNLOAD
          }
          
          try {
            // Attempt immediate save on unload
            navigator.sendBeacon(
              `/api/app/job-readiness/expert-sessions/${session.id}/watch-progress`,
              JSON.stringify(event)
            )
          } catch (error) {
            console.warn('Failed to save progress on unload:', error)
          }
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current) {
        // Page is being hidden, save current progress
        const currentTime = videoRef.current.currentTime
        const duration = videoRef.current.duration
        
        if (currentTime > 0 && duration > 0) {
          handleMilestoneUpdate(currentTime, duration, SAVE_TRIGGERS.UNLOAD)
        }
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session.id, isUpdatingProgress, handleMilestoneUpdate])

  // Calculate display progress (real-time but milestone-aware)
  const progressPercentage = duration > 0 ? calculateDisplayProgress(
    currentTime, 
    duration, 
    milestoneState.lastMilestoneSaved
  ) : 0
  
  // Get milestone markers for progress bar
  const milestoneMarkers = getMilestoneMarkers()
  const passedMilestones = getPassedMilestones(progressPercentage)

  // Control handlers
  const togglePlay = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  // Seeking disabled - users must watch video sequentially

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return
    const newVolume = value[0] / 100
    videoRef.current.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
  }

  const skip = (seconds: number) => {
    if (!videoRef.current) return
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    videoRef.current.currentTime = newTime
  }

  const toggleFullscreen = () => {
    if (!videoRef.current) return
    
    if (!isFullscreen) {
      videoRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle manual completion with enhanced feedback
  const handleMarkAsCompleted = () => {
    if (!hasWatchedComplete) return
    
    setProgressError(null)

    try {
    // Send completion update to API
      handleMilestoneUpdate(duration, duration, SAVE_TRIGGERS.COMPLETION, 100, true)
      
      toast.success('Session completed!', {
        description: 'Your progress has been saved successfully.',
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
    } catch (error) {
      console.error('Failed to mark as completed:', error)
      setProgressError('Failed to mark session as completed.')
      toast.error('Failed to mark as completed', {
        description: 'Please try again or contact support if the issue persists.',
      })
    }
  }

  const isCompleted = session.student_progress.is_completed

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="relative bg-black aspect-video group">
          <video
            ref={videoRef}
            src={session.video_url}
            className="w-full h-full object-contain pointer-events-none"
            playsInline
            preload="metadata"
            onSeeking={(e) => {
              // Prevent seeking - reset to current time
              if (videoRef.current) {
                e.preventDefault()
                videoRef.current.currentTime = currentTime
              }
            }}
          />

          {/* No loading overlay - progress saves in background seamlessly */}

          {/* Controls overlay */}
          <div 
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Top controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
              <div className="text-white">
                <h3 className="font-semibold text-lg truncate">{session.title}</h3>
                <p className="text-sm text-gray-300 opacity-90">
                  {formatTime(currentTime)} / {formatTime(duration)}
                  {session.student_progress.completion_percentage > 0 && (
                    <span className="ml-2">
                      • {Math.round(session.student_progress.completion_percentage)}% complete
                    </span>
                  )}
                </p>
              </div>
              
              {/* Completion status */}
              {isCompleted && (
                <div className="flex items-center space-x-2 bg-green-600/20 backdrop-blur-sm border border-green-500/30 rounded-full px-3 py-1">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Completed</span>
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                </div>
              )}
            </div>

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Button
                variant="ghost"
                size="icon"
                  onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 pointer-events-auto"
                >
                {isPlaying ? (
                  <Pause className="h-8 w-8 text-white" />
                ) : (
                  <Play className="h-8 w-8 text-white ml-1" />
                )}
                </Button>
              </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Progress bar with milestone markers */}
              <div className="relative mb-4">
                {/* Milestone markers */}
                <div className="absolute inset-0 flex justify-between items-center px-1">
                  {milestoneMarkers.map((marker) => (
                    <div
                      key={marker.milestone}
                      className={cn(
                        "w-2 h-2 rounded-full border-2 border-white transition-colors",
                        passedMilestones.includes(marker.milestone)
                          ? "bg-green-500 border-green-500"
                          : "bg-transparent"
                      )}
                      style={{ left: `${marker.position}%` }}
                      title={`${marker.milestone}% milestone`}
                    />
                  ))}
                </div>
                
                <Slider
                  value={[progressPercentage]}
                  onValueChange={() => {}} // Disabled - no seeking allowed
                  max={100}
                  step={0.1}
                  className="relative pointer-events-none"
                  disabled
                />
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between pointer-events-auto">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={togglePlay}>
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white" />
                    )}
                  </Button>

                  {/* Skip buttons removed - users must watch sequentially */}

                  {/* Volume controls */}
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={toggleMute}>
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4 text-white" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-white" />
                      )}
                    </Button>
                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume * 100]}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Manual completion button - only available when fully watched */}
                  {hasWatchedComplete && !isCompleted && (
                <Button
                      onClick={handleMarkAsCompleted}
                      disabled={isUpdatingProgress}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                  
                  <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                    <Maximize className="h-4 w-4 text-white" />
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress error alert */}
        {progressError && (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {progressError}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 