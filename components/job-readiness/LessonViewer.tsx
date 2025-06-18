'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Video, Play, Pause, Volume2, VolumeX, Maximize, CheckCircle, Award, Clock, AlertCircle } from 'lucide-react'
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
  
  const videoRef = useRef<HTMLVideoElement>(null)
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

  // Check if video reached 95% completion threshold
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const watchedPercent = (currentTime / duration) * 100
      if (watchedPercent >= 95 && !canCompleteVideo && !isVideoCompleted) {
        setCanCompleteVideo(true)
        toast({
          title: "Video Almost Complete!",
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

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // Handle manual completion
  const handleCompleteVideo = async () => {
    if (!canCompleteVideo && watchedPercentage < 95) {
      toast({
        title: "Not Ready",
        description: "You need to watch at least 95% of the video to complete it.",
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

      {/* Video Player - No Seeking Allowed */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black">
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
          <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-medium truncate">{lesson.title}</h3>
              <div className="flex items-center gap-2">
                {duration > 0 && (
                  <span className="text-white text-sm">
                    <Clock className="h-4 w-4 inline mr-1" />
                    {formatTime(duration)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Time display only */}
              <div className="flex justify-between text-xs text-gray-300">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Control buttons - No skip controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
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
            </div>
          </div>
        </div>

        {/* Completion Status */}
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Video Status:</span>
            <Badge variant={isVideoCompleted ? "default" : "outline"}>
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
        <div className="space-y-6">
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                <Award className="h-5 w-5" />
                AI-Generated Quiz
              </CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                Test your understanding of this lesson with our AI-generated quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quiz Result:</span>
                    <Badge className={quizResult.passed 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }>
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
                      Retake Quiz
                    </Button>
                  )}
                </div>
              ) : isQuizAvailable ? (
                <Button 
                  onClick={() => setShowQuiz(true)}
                  className="w-full"
                >
                  Take Quiz
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
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousLesson}
          disabled={!previousLesson}
        >
          {previousLesson ? `← Previous: ${previousLesson.title}` : 'No Previous Lesson'}
        </Button>

        <Button
          onClick={goToNextLesson}
          disabled={!nextLesson || (!isLessonCompleted && lesson.enable_ai_quiz)}
        >
          {nextLesson ? `Next: ${nextLesson.title} →` : 'Course Complete'}
        </Button>
      </div>
    </div>
  )
} 