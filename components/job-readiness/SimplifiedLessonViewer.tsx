'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Video, Play, Pause, Volume2, VolumeX, Maximize, CheckCircle, Award, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface SimplifiedLesson {
  id: string
  title: string
  description: string
  video_url: string
  sequence: number
  enable_ai_quiz: boolean
  quiz_questions?: Array<{
    id: string
    question_text: string
    options: Array<{
      id: string
      text: string
    }>
    question_type: string
  }>
}

interface SimplifiedCourseProgress {
  completed_videos: string[]
  video_completion_count: number
  course_completed_at?: string
  status: 'InProgress' | 'Completed'
}

interface SimplifiedLessonViewerProps {
  lesson: SimplifiedLesson
  moduleId: string
  courseName: string
  previousLesson: SimplifiedLesson | null
  nextLesson: SimplifiedLesson | null
  progressData: SimplifiedCourseProgress
  totalLessons: number
}

export function SimplifiedLessonViewer({ 
  lesson, 
  moduleId, 
  courseName, 
  previousLesson, 
  nextLesson, 
  progressData,
  totalLessons
}: SimplifiedLessonViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [isVideoCompleted, setIsVideoCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  
  // Check if this lesson is completed (video fully watched)
  const isLessonCompleted = progressData.completed_videos.includes(lesson.id)
  const watchedPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0
  const completionPercentage = Math.round((progressData.video_completion_count / totalLessons) * 100)

  // Disable seeking/scrubbing on the video
  useEffect(() => {
    const handleSeeking = (e: Event) => {
      e.preventDefault()
      if (videoRef.current) {
        // Reset to current playback position, preventing seek
        videoRef.current.currentTime = currentTime
      }
    }

    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.addEventListener('seeking', handleSeeking)
      return () => videoElement.removeEventListener('seeking', handleSeeking)
    }
  }, [currentTime])

  // Check for video completion (100% threshold)
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const watchedPercent = (currentTime / duration) * 100
      if (watchedPercent >= 100 && !isVideoCompleted && !isLessonCompleted) {
        setIsVideoCompleted(true)
        saveVideoCompletion()
      }
    }
  }, [currentTime, duration, isVideoCompleted, isLessonCompleted])

  const saveVideoCompletion = async () => {
    if (isSaving || isLessonCompleted) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/app/job-readiness/courses/${moduleId}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lesson_id: lesson.id,
          video_completed: true,
          quiz_passed: false // Will be updated separately if quiz is completed
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Video Completed!",
          description: result.course_completed 
            ? "🎉 Congratulations! You've completed the entire course!"
            : `Progress saved: ${result.videos_completed}/${result.total_videos} videos completed`,
        })

        // Show quiz if available and course not yet completed
        if (lesson.enable_ai_quiz && !result.course_completed) {
          setShowQuiz(true)
        }

        // Refresh the page to update progress
        router.refresh()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save progress",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving video completion:', error)
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  const handleManualCompletion = () => {
    if (!isLessonCompleted && watchedPercentage >= 100) {
      setIsVideoCompleted(true)
      saveVideoCompletion()
    }
  }

  return (
    <div className="space-y-8">
      {/* Lesson Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${
            isLessonCompleted 
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            {isLessonCompleted ? (
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            ) : (
              <Video className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {lesson.title}
          </h1>
          {lesson.enable_ai_quiz && (
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Award className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Lesson {lesson.sequence}</span>
          <span>•</span>
          <span>{courseName}</span>
          <span>•</span>
          <span>Course Progress: {completionPercentage}%</span>
          {isLessonCompleted && (
            <>
              <span>•</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </>
          )}
        </div>
        
        {lesson.description && (
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {lesson.description}
          </p>
        )}
      </div>

      {/* Video Player */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="w-full h-full pointer-events-none" // Disable direct video interaction
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false)
              if (!isLessonCompleted) {
                setIsVideoCompleted(true)
                saveVideoCompletion()
              }
            }}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          >
            <source src={lesson.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Custom Video Controls */}
          <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-medium truncate">{lesson.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">
                  {watchedPercentage}% watched
                </span>
                {duration > 0 && (
                  <span className="text-white text-sm">
                    <Clock className="h-4 w-4 inline mr-1" />
                    {formatTime(duration)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Progress bar (visual only, no seeking) */}
              <div className="w-full">
                <div className="w-full h-1 bg-gray-300 rounded-lg relative">
                  <div 
                    className="h-1 bg-blue-500 rounded-lg transition-all"
                    style={{ width: `${watchedPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                                      {/* Manual completion button (only shows when video is fully complete) */}
                    {watchedPercentage >= 100 && !isLessonCompleted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={handleManualCompletion}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Mark Complete'}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => videoRef.current?.requestFullscreen()}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Completion Status */}
      {isLessonCompleted && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              Lesson Completed!
            </h3>
            <p className="text-green-700 dark:text-green-300">
              You have successfully completed this lesson. 
              {nextLesson ? ' You can now proceed to the next lesson.' : ' This was the final lesson in the course!'}
            </p>
          </div>
        </Card>
      )}

      {/* Quiz Section */}
      {lesson.enable_ai_quiz && isLessonCompleted && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Award className="h-6 w-6 text-purple-600" />
              Lesson Quiz
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Test your understanding of this lesson with our AI-powered quiz.
            </p>
            <Button 
              onClick={() => setShowQuiz(true)}
              className="w-full"
              disabled={showQuiz}
            >
              {showQuiz ? 'Quiz Active' : 'Start Quiz'}
            </Button>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div>
          {previousLesson && (
            <Button variant="outline" onClick={() => router.push(`/app/job-readiness/courses/${moduleId}/lessons/${previousLesson.id}`)}>
              ← Previous: {previousLesson.title}
            </Button>
          )}
        </div>
        <div>
          {nextLesson && isLessonCompleted && (
            <Button onClick={() => router.push(`/app/job-readiness/courses/${moduleId}/lessons/${nextLesson.id}`)}>
              Next: {nextLesson.title} →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 