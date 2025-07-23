'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Video, Play, Pause, Volume2, VolumeX, CheckCircle, Award, Clock, Maximize, Minimize } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { AiQuiz } from './AiQuiz'
import { useSubmitQuiz } from '@/hooks/useJobReadinessMutations'
import { useSimplifiedCourseProgress } from '@/hooks/useSimplifiedCourseProgress'

interface LessonQuizResult {
  score: number
  total_questions: number
  passed: boolean
  attempts: number
  answers: Record<string, string | string[]>
  submitted_at: string
}

interface Lesson {
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
  course_completed_at: string | null
  last_viewed_lesson_sequence?: number
  lesson_quiz_results?: Record<string, LessonQuizResult>
}

interface LessonViewerProps {
  lesson: Lesson
  moduleId: string
  courseName: string
  previousLesson: Lesson | null
  nextLesson: Lesson | null
  progressData: SimplifiedCourseProgress
}

export function LessonViewer({ 
  lesson, 
  moduleId, 
  courseName, 
  previousLesson, 
  nextLesson, 
  progressData 
}: LessonViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [canCompleteVideo, setCanCompleteVideo] = useState(false)
  const [localQuizResult, setLocalQuizResult] = useState<LessonQuizResult | null>(null)
  const [localVideoCompleted, setLocalVideoCompleted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  
  const submitQuizMutation = useSubmitQuiz()
  const saveProgressMutation = useSimplifiedCourseProgress()
  
  // Simplified progress tracking - check if video is completed
  const quizResult = localQuizResult || progressData.lesson_quiz_results?.[lesson.id]
  const isVideoCompleted = localVideoCompleted || progressData.completed_videos?.includes(lesson.id) || false
  const isLessonCompleted = isVideoCompleted && (!lesson.enable_ai_quiz || quizResult?.passed)
  const isQuizAvailable = isVideoCompleted
  const watchedPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0

  // No position tracking - videos always start from beginning
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setCurrentTime(0)
    }
  }, [lesson.id])

  // Check if video reached 100% completion threshold
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const watchedPercent = (currentTime / duration) * 100
      if (watchedPercent >= 100 && !canCompleteVideo && !isVideoCompleted) {
        setCanCompleteVideo(true)
        toast({
          title: "Video Complete!",
          description: "You can now mark this video as completed.",
        })
      }
    }
  }, [currentTime, duration, canCompleteVideo, isVideoCompleted, toast])

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

  // DISABLED: No seeking allowed
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Seeking is disabled for controlled viewing
    e.preventDefault()
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

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen()
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
      toast({
        title: "Fullscreen Error",
        description: "Unable to toggle fullscreen mode.",
        variant: "destructive"
      })
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Auto-hide controls functionality
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 2000)
  }

  const showControlsTemporarily = () => {
    resetControlsTimeout()
  }

  // Reset timeout on mouse movement or interaction
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = () => resetControlsTimeout()
    const handleTouchStart = () => resetControlsTimeout()

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('click', showControlsTemporarily)

    // Initial timeout
    resetControlsTimeout()

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('click', showControlsTemporarily)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // Handle manual completion
  const handleCompleteVideo = async () => {
    if (!canCompleteVideo && watchedPercentage < 100) {
      toast({
        title: "Not Ready",
        description: "You need to watch 100% of the video to complete it.",
        variant: "destructive"
      })
      return
    }

    try {
      await saveProgressMutation.mutateAsync({
        moduleId,
        lessonId: lesson.id,
        videoCompleted: true,
        quizPassed: false
      })

      // Mark video as completed locally
      setLocalVideoCompleted(true)

      toast({
        title: "Video Completed!",
        description: "Your progress has been saved. " + (lesson.enable_ai_quiz ? "Quiz unlocked!" : "")
      })

      // Automatically show quiz if available and not passed
      if (lesson.enable_ai_quiz && !quizResult?.passed) {
        setShowQuiz(true)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleQuizSubmit = async (answers: Array<{ question_id: string; selected_option_id: string | string[] }>) => {
    try {
      const result = await submitQuizMutation.mutateAsync({
        moduleId,
        lessonId: lesson.id,
        answers
      })

      // Update local quiz result immediately
      setLocalQuizResult({
        score: result.score,
        total_questions: result.total_questions,
        passed: result.passed,
        attempts: result.attempts,
        answers: result.answers,
        submitted_at: new Date().toISOString()
      })

      if (result.passed) {
        await saveProgressMutation.mutateAsync({
          moduleId,
          lessonId: lesson.id,
          videoCompleted: true,
          quizPassed: true
        })

        toast({
          title: "Quiz Passed!",
          description: `Congratulations! You scored ${result.score}%. Returning to course...`
        })
        setShowQuiz(false)
        
        // Redirect to course overview after a short delay
        setTimeout(() => {
          router.push(`/app/job-readiness/courses/${moduleId}`)
        }, 2000)
      } else {
        toast({
          title: "Quiz Failed",
          description: `You scored ${result.score}%. You can try again.`,
          variant: "destructive"
        })
        setShowQuiz(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive"
      })
    }
  }

  const goToNextLesson = () => {
    if (nextLesson) {
      router.push(`/app/job-readiness/courses/${moduleId}/lessons/${nextLesson.id}`)
    }
  }

  const goToPreviousLesson = () => {
    if (previousLesson) {
      router.push(`/app/job-readiness/courses/${moduleId}/lessons/${previousLesson.id}`)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Lesson Header */}
      <div className="text-center space-y-4 px-4 sm:px-0">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 flex-wrap">
          <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${
            isLessonCompleted 
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            {isLessonCompleted ? (
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
            ) : (
              <Video className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center leading-tight">
            {lesson.title}
          </h1>
          {lesson.enable_ai_quiz && (
            <div className="p-2 sm:p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
          <span className="whitespace-nowrap">Lesson {lesson.sequence}</span>
          <span className="hidden sm:inline">•</span>
          <span className="truncate max-w-48 sm:max-w-none">{courseName}</span>
          {isLessonCompleted && (
            <>
              <span className="hidden sm:inline">•</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Completed</span>
                <span className="sm:hidden">Done</span>
              </Badge>
            </>
          )}
        </div>
        
        {lesson.description && (
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {lesson.description}
          </p>
        )}
      </div>

      {/* Video Player - No Seeking Allowed */}
      <Card className="overflow-hidden">
        <div ref={containerRef} className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="w-full h-full"
            style={{ pointerEvents: 'none' }} // Disable direct video interaction
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onSeeking={(e) => {
              // Prevent seeking
              if (videoRef.current) {
                videoRef.current.currentTime = currentTime
              }
            }}
            onEnded={() => {
              setIsPlaying(false)
              setCanCompleteVideo(true)
              // Automatically complete the video when it ends
              handleCompleteVideo()
            }}
          >
            <source src={lesson.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Video Controls */}
          <div className={`absolute inset-0 flex flex-col justify-between p-2 sm:p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className="text-white font-medium truncate text-sm sm:text-base flex-1 mr-2">{lesson.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {duration > 0 && (
                  <span className="text-white text-xs sm:text-sm whitespace-nowrap">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                    {formatTime(duration)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-4">
              {/* Time display only */}
              <div className="flex justify-between text-xs text-gray-300">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Control buttons - No skip controls */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20 p-2"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </Button>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 p-2"
                    >
                      {isMuted ? (
                        <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-12 sm:w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 p-2"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Status */}
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium">Video Status:</span>
            <Badge variant={isVideoCompleted ? "default" : "outline"} className="self-start sm:self-auto">
              {isVideoCompleted ? "Completed" : "In Progress"}
            </Badge>
          </div>
          {!isVideoCompleted && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Watch the video to completion. Quiz will unlock automatically.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quiz Section */}
      {lesson.enable_ai_quiz && (
        <div className="space-y-4 sm:space-y-6">
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100 text-lg sm:text-xl">
                <Award className="h-5 w-5 flex-shrink-0" />
                AI-Generated Quiz
              </CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300 text-sm sm:text-base">
                Test your understanding of this lesson with our AI-generated quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {quizResult ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm font-medium">Quiz Result:</span>
                    <Badge className={`self-start sm:self-auto ${quizResult.passed 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {quizResult.score}% {quizResult.passed ? '(Passed)' : '(Failed)'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    Attempts: {quizResult.attempts}
                  </div>
                  {!quizResult.passed && (
                    <Button 
                      onClick={() => setShowQuiz(true)}
                      className="w-full"
                    >
                      <span className="hidden sm:inline">Retake Quiz</span>
                      <span className="sm:hidden">Retake</span>
                    </Button>
                  )}
                </div>
              ) : isQuizAvailable ? (
                <Button 
                  onClick={() => setShowQuiz(true)}
                  className="w-full"
                >
                  <span className="hidden sm:inline">Take Quiz</span>
                  <span className="sm:hidden">Start Quiz</span>
                </Button>
              ) : (
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Complete the video to unlock the quiz
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiz Interface */}
          {showQuiz && lesson.quiz_questions && lesson.quiz_questions.length > 0 && (
            <AiQuiz
              questions={lesson.quiz_questions}
              onSubmit={handleQuizSubmit}
              onCancel={() => setShowQuiz(false)}
              isSubmitting={submitQuizMutation.isPending}
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousLesson}
          disabled={!previousLesson}
          className="w-full sm:w-auto"
        >
          {previousLesson ? (
            <>
              <span className="hidden sm:inline">← Previous: {previousLesson.title}</span>
              <span className="sm:hidden">← Previous Lesson</span>
            </>
          ) : (
            <span>No Previous Lesson</span>
          )}
        </Button>

        <Button
          onClick={goToNextLesson}
          disabled={!nextLesson || (!isLessonCompleted && lesson.enable_ai_quiz)}
          className="w-full sm:w-auto"
        >
          {nextLesson ? (
            <>
              <span className="hidden sm:inline">Next: {nextLesson.title} →</span>
              <span className="sm:hidden">Next Lesson →</span>
            </>
          ) : (
            <span>Course Complete</span>
          )}
        </Button>
      </div>
    </div>
  )
} 