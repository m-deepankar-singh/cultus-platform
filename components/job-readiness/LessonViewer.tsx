'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSubmitQuiz, useUpdateProgress } from '@/hooks/useJobReadinessMutations'
import { AiQuiz } from './AiQuiz'
import { Video, Play, Pause, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight, CheckCircle, Award, Clock } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface LessonQuizResult {
  score: number
  passed: boolean
  attempts: number
}

interface Lesson {
  id: string
  title: string
  description: string
  video_url: string
  sequence: number
  enable_ai_quiz: boolean
  quiz_questions: Array<{
    id: string
    question_text: string
    options: Array<{
      id: string
      text: string
    }>
    question_type: string
  }>
  quiz_already_passed: boolean
}

interface CourseProgress {
  last_viewed_lesson_sequence: number
  video_playback_positions: Record<string, number>
  lesson_quiz_results: Record<string, LessonQuizResult>
}

interface LessonViewerProps {
  lesson: Lesson
  moduleId: string
  courseName: string
  previousLesson: Lesson | null
  nextLesson: Lesson | null
  progressData: CourseProgress
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
  const [videoWatched, setVideoWatched] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  
  const submitQuizMutation = useSubmitQuiz()
  const updateProgressMutation = useUpdateProgress()
  
  const quizResult = progressData.lesson_quiz_results?.[lesson.id]
  const hasVideoPosition = progressData.video_playback_positions?.[lesson.id] > 0
  const isLessonCompleted = quizResult?.passed || false
  const watchedPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0

  // Set initial video position from progress
  useEffect(() => {
    if (videoRef.current && hasVideoPosition) {
      const savedPosition = progressData.video_playback_positions[lesson.id]
      if (savedPosition && savedPosition > 0) {
        videoRef.current.currentTime = savedPosition
        setCurrentTime(savedPosition)
      }
    }
  }, [lesson.id, hasVideoPosition, progressData.video_playback_positions])

  // Save video progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const position = videoRef.current.currentTime
        updateProgressMutation.mutate({
          moduleId,
          progressData: {
            last_viewed_lesson_sequence: lesson.sequence,
            video_playback_positions: {
              ...progressData.video_playback_positions,
              [lesson.id]: position
            }
          }
        })
      }
    }, 10000) // Save every 10 seconds

    return () => clearInterval(interval)
  }, [isPlaying, lesson.id, lesson.sequence, moduleId, updateProgressMutation, progressData.video_playback_positions])

  // Check if video is mostly watched (85% threshold)
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const watchedPercent = (currentTime / duration) * 100
      if (watchedPercent >= 85 && !videoWatched) {
        setVideoWatched(true)
        if (lesson.enable_ai_quiz && !quizResult?.passed) {
          setShowQuiz(true)
        }
      }
    }
  }, [currentTime, duration, lesson.enable_ai_quiz, quizResult?.passed, videoWatched])

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
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

  const handleQuizSubmit = async (answers: Array<{ question_id: string; selected_option_id: string | string[] }>) => {
    try {
      await submitQuizMutation.mutateAsync({
        moduleId,
        lessonId: lesson.id,
        answers
      })
      
      toast({
        title: "Quiz Submitted",
        description: "Your quiz has been submitted successfully!",
      })
      
      setShowQuiz(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive"
      })
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

      {/* Video Player */}
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false)
              setVideoWatched(true)
              if (lesson.enable_ai_quiz && !quizResult?.passed) {
                setShowQuiz(true)
              }
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
              {/* Progress bar */}
              <div className="w-full">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
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
      </Card>

      {/* AI Quiz Section */}
      {lesson.enable_ai_quiz && (
        <div className="space-y-6">
          {/* Quiz Status */}
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
                  {!quizResult.passed && (
                    <Button 
                      onClick={() => setShowQuiz(true)}
                      className="w-full"
                    >
                      Retake Quiz
                    </Button>
                  )}
                </div>
              ) : videoWatched ? (
                <Button 
                  onClick={() => setShowQuiz(true)}
                  className="w-full"
                >
                  Take Quiz
                </Button>
              ) : (
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Complete watching the video to unlock the quiz
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiz Interface */}
          {showQuiz && (
            <AiQuiz
              questions={lesson.quiz_questions}
              onSubmit={handleQuizSubmit}
              onCancel={() => setShowQuiz(false)}
              isSubmitting={submitQuizMutation.isPending}
            />
          )}
        </div>
      )}

      {/* Lesson Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {previousLesson && (
            <Link href={`/app/job-readiness/courses/${moduleId}/lessons/${previousLesson.id}`}>
              <Button variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous: {previousLesson.title}
              </Button>
            </Link>
          )}
        </div>
        
        <div>
          {nextLesson && (
            <Link href={`/app/job-readiness/courses/${moduleId}/lessons/${nextLesson.id}`}>
              <Button>
                Next: {nextLesson.title}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
} 