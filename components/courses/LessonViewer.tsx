'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { 
  CheckCircle, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Clock, 
  Award, 
  Video,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useSaveCourseProgress, useSubmitQuiz } from '@/hooks/useEnhancedCourseContent'

// Interface matching our enhanced API structure
interface EnhancedLesson {
  id: string
  title: string
  description?: string | null
  video_url?: string | null
  sequence: number
  has_quiz?: boolean
  quiz_questions?: QuizQuestion[] | null
  is_completed: boolean
  quiz_passed?: boolean
  quiz_attempts: number
  last_watched_position: number
  video_fully_watched: boolean
}

interface QuizQuestion {
  id: string
  text: string
  type: 'MCQ' | 'MSQ' | 'TF'
  options: { id: string; text: string }[]
}

interface CourseProgress {
  completed_videos: string[]
  video_completion_count: number
  course_completed_at?: string | null
  status: 'InProgress' | 'Completed'
  progress_percentage: number
  total_lessons: number
  completed_lessons: number
}

interface LessonViewerProps {
  lesson: EnhancedLesson
  moduleId: string
  courseName: string
  previousLesson?: EnhancedLesson | null
  nextLesson?: EnhancedLesson | null
  progressData: CourseProgress
  totalLessons: number
}

export function LessonViewer({ 
  lesson, 
  moduleId, 
  courseName, 
  previousLesson, 
  nextLesson, 
  progressData,
  totalLessons
}: LessonViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [isVideoCompleted, setIsVideoCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | string[]>>({})
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  
  const saveProgressMutation = useSaveCourseProgress(moduleId)
  const submitQuizMutation = useSubmitQuiz(moduleId, lesson.id)
  
  // Check if this lesson is completed
  const isLessonCompleted = lesson.is_completed
  const watchedPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0
  const completionPercentage = Math.round((progressData.completed_lessons / totalLessons) * 100)

  // Set initial video position
  useEffect(() => {
    if (videoRef.current && lesson.last_watched_position > 0) {
      videoRef.current.currentTime = lesson.last_watched_position
      setCurrentTime(lesson.last_watched_position)
    }
  }, [lesson.id, lesson.last_watched_position])

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

  // Check for video completion (95% threshold)
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const watchedPercent = (currentTime / duration) * 100
      if (watchedPercent >= 95 && !isVideoCompleted && !isLessonCompleted) {
        setIsVideoCompleted(true)
        saveVideoCompletion()
      }
    }
  }, [currentTime, duration, isVideoCompleted, isLessonCompleted])

  const saveVideoCompletion = async () => {
    if (isSaving || isLessonCompleted) return
    
    setIsSaving(true)
    try {
      await saveProgressMutation.mutateAsync({
        lesson_id: lesson.id,
        watch_time_seconds: Math.floor(currentTime),
        completion_percentage: 100,
        video_completed: true,
        trigger_type: 'completion'
      })

      toast({
        title: "Video Completed!",
        description: lesson.has_quiz 
          ? "Great! You can now take the quiz."
          : "Lesson completed successfully!",
      })

      // Show quiz if available
      if (lesson.has_quiz && lesson.quiz_questions && lesson.quiz_questions.length > 0) {
        setShowQuiz(true)
      }

      // Refresh the page to update progress
      router.refresh()
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
      
      // Auto-save progress every 30 seconds
      if (Math.floor(videoRef.current.currentTime) % 30 === 0) {
        saveProgressMutation.mutate({
          lesson_id: lesson.id,
          watch_time_seconds: Math.floor(videoRef.current.currentTime),
          completion_percentage: Math.min(100, (videoRef.current.currentTime / duration) * 100),
          video_completed: false,
          trigger_type: 'auto'
        })
      }
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
    if (!isLessonCompleted && watchedPercentage >= 95) {
      setIsVideoCompleted(true)
      saveVideoCompletion()
    }
  }

  const handleQuizSubmit = async () => {
    if (!lesson.quiz_questions || lesson.quiz_questions.length === 0) return
    
    try {
      setIsSaving(true)
      
      await submitQuizMutation.mutateAsync({
        answers: quizAnswers,
        time_spent_seconds: 120, // Estimate
        started_at: new Date().toISOString()
      })

      toast({
        title: "Quiz Submitted!",
        description: "Your answers have been submitted successfully.",
      })

      setShowQuiz(false)
      router.refresh()
    } catch (error) {
      console.error('Error submitting quiz:', error)
      toast({
        title: "Error",
        description: "Failed to submit quiz",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuizAnswerChange = (questionId: string, answer: string | string[]) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
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
          {lesson.has_quiz && (
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
      {lesson.video_url && (
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
                        className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Manual completion button (only shows when video is nearly complete) */}
                    {watchedPercentage >= 95 && !isLessonCompleted && (
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
      )}

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
      {lesson.has_quiz && lesson.quiz_questions && lesson.quiz_questions.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <Award className="h-5 w-5" />
              Lesson Quiz
            </CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Test your understanding of this lesson
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showQuiz ? (
              <div className="text-center">
                {lesson.quiz_passed ? (
                  <div className="space-y-4">
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                      Quiz Passed!
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      You have successfully completed this quiz.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowQuiz(true)}
                      className="mt-4"
                    >
                      Review Quiz
                    </Button>
                  </div>
                ) : lesson.video_fully_watched || isLessonCompleted ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                      Ready to take the quiz?
                    </h3>
                    <p className="text-purple-700 dark:text-purple-300">
                      Test your knowledge of this lesson with {lesson.quiz_questions.length} questions.
                    </p>
                    <Button 
                      onClick={() => setShowQuiz(true)}
                      className="mt-4"
                    >
                      Start Quiz
                    </Button>
                  </div>
                ) : (
                  <p className="text-purple-700 dark:text-purple-300">
                    Complete watching the video to unlock the quiz.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Quiz Questions</h3>
                
                {lesson.quiz_questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <h4 className="font-medium mb-3">
                      {index + 1}. {question.text}
                    </h4>
                    
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type={question.type === 'MSQ' ? 'checkbox' : 'radio'}
                            name={question.id}
                            value={option.id}
                            onChange={(e) => {
                              if (question.type === 'MSQ') {
                                const currentAnswers = (quizAnswers[question.id] as string[]) || []
                                if (e.target.checked) {
                                  handleQuizAnswerChange(question.id, [...currentAnswers, option.id])
                                } else {
                                  handleQuizAnswerChange(question.id, currentAnswers.filter(a => a !== option.id))
                                }
                              } else {
                                handleQuizAnswerChange(question.id, option.id)
                              }
                            }}
                            className="form-checkbox"
                          />
                          <span>{option.text}</span>
                        </label>
                      ))}
                    </div>
                  </Card>
                ))}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleQuizSubmit}
                    disabled={isSaving || Object.keys(quizAnswers).length !== lesson.quiz_questions.length}
                  >
                    {isSaving ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowQuiz(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        {previousLesson ? (
          <Link href={`/app/course/${moduleId}/lesson/${previousLesson.id}`}>
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Lesson
            </Button>
          </Link>
        ) : (
          <Link href={`/app/course/${moduleId}`}>
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Course Overview
            </Button>
          </Link>
        )}

        {nextLesson ? (
          <Link href={`/app/course/${moduleId}/lesson/${nextLesson.id}`}>
            <Button>
              Next Lesson
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Link href={`/app/course/${moduleId}`}>
            <Button>
              Course Overview
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
} 