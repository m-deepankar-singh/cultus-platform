"use client"

import { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  }
}

interface ExpertSessionPlayerProps {
  session: ExpertSession
  onProgressUpdate: (currentTime: number, duration: number, forceComplete?: boolean) => void
}

export function ExpertSessionPlayer({ session, onProgressUpdate }: ExpertSessionPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0)
  const [hasWatchedComplete, setHasWatchedComplete] = useState(false)

  const progressUpdateInterval = 30 // seconds

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set initial time from saved progress
    if (session.student_progress.watch_time_seconds > 0) {
      video.currentTime = session.student_progress.watch_time_seconds
    }

    // Check if user has already watched the complete video based on progress
    if (session.student_progress.watch_time_seconds >= video.duration - 0.5) {
      setHasWatchedComplete(true)
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

      // Send regular progress updates (no automatic completion)
      const shouldUpdate = 
        current - lastProgressUpdate >= progressUpdateInterval || // Every 30 seconds
        (current > 0 && lastProgressUpdate === 0)                 // First progress update

      if (shouldUpdate) {
        onProgressUpdate(current, video.duration)
        setLastProgressUpdate(current)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => {
      setIsPlaying(false)
      // Send progress update on pause (but debounce if recently sent)
      const timeSinceLastUpdate = video.currentTime - lastProgressUpdate
      if (timeSinceLastUpdate >= 5) { // At least 5 seconds since last update
        onProgressUpdate(video.currentTime, video.duration)
        setLastProgressUpdate(video.currentTime)
      }
    }
    const handleEnded = () => {
      setIsPlaying(false)
      setHasWatchedComplete(true)
      // Send final progress update but don't auto-complete
      onProgressUpdate(video.duration, video.duration)
      setLastProgressUpdate(video.duration)
    }

    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [session.student_progress.watch_time_seconds, onProgressUpdate, lastProgressUpdate, session.id])

  // Reset watched complete flag when session changes
  useEffect(() => {
    setHasWatchedComplete(session.student_progress.watch_time_seconds >= duration - 0.5)
    setLastProgressUpdate(session.student_progress.watch_time_seconds)
  }, [session.id, session.student_progress.watch_time_seconds, duration])

  const togglePlay = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return
    const newTime = (value[0] / 100) * duration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
    
    // Update watched complete status based on seek position
    if (newTime >= duration - 0.5) {
      setHasWatchedComplete(true)
    }
  }

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
    setIsMuted(!isMuted)
  }

  const skip = (seconds: number) => {
    if (!videoRef.current) return
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleFullscreen = () => {
    if (!videoRef.current) return
    
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
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

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  
  // Handle manual completion
  const handleMarkAsCompleted = () => {
    if (!hasWatchedComplete) return
    
    // Send completion update to API
    onProgressUpdate(duration, duration, true) // Add completion flag
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div 
          className="relative bg-black group"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full aspect-video"
            src={session.video_url}
            preload="metadata"
            onClick={togglePlay}
          />

          {/* Loading Overlay */}
          {duration === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p>Loading video...</p>
              </div>
            </div>
          )}

          {/* Controls Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300",
            (showControls || !isPlaying) && "opacity-100"
          )}>
            {/* Center Play Button */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={togglePlay}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                >
                  <Play className="h-8 w-8 text-white ml-1" />
                </Button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* Progress Bar */}
              <div className="space-y-1">
                <Slider
                  value={[progressPercentage]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/80">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={togglePlay}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <Button
                    onClick={() => skip(-10)}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={() => skip(10)}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={toggleMute}
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume * 100]}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={toggleFullscreen}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mark as Completed Button */}
        {hasWatchedComplete && !session.student_progress.is_completed && (
          <div className="absolute top-4 right-4 z-10">
            <Button
              onClick={handleMarkAsCompleted}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg animate-pulse"
              size="sm"
            >
              ✓ Mark as Completed
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 