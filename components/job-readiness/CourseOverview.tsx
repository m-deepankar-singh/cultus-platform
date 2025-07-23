'use client'

import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Play, CheckCircle, Target, Video, Award, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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

interface Module {
  id: string
  name: string
  description: string
  lessons: Lesson[]
}

interface CourseProgress {
  last_viewed_lesson_sequence: number
  video_playback_positions: Record<string, number>
  lesson_quiz_results: Record<string, LessonQuizResult>
  fully_watched_video_ids?: string[]
}

interface CourseOverviewProps {
  moduleData: Module
  progressData: CourseProgress
}

export function CourseOverview({ moduleData, progressData }: CourseOverviewProps) {
  const totalLessons = moduleData.lessons.length
  
  // Define lesson status function first
  const getLessonStatus = (lesson: Lesson) => {
    const quizResult = progressData.lesson_quiz_results?.[lesson.id]
    const hasVideoPosition = progressData.video_playback_positions?.[lesson.id] > 0
    const isVideoCompleted = progressData.fully_watched_video_ids?.includes(lesson.id)
    
    // Lesson is completed if:
    // 1. Has quiz: video watched AND quiz passed
    // 2. No quiz: video watched
    if (lesson.enable_ai_quiz) {
      if (quizResult?.passed) return 'completed'
      if (isVideoCompleted || hasVideoPosition || quizResult) return 'in-progress'
    } else {
      if (isVideoCompleted) return 'completed'
      if (hasVideoPosition) return 'in-progress'
    }
    
    return 'not-started'
  }
  
  // Count lessons based on their actual status (completed + in-progress)
  const lessonStatusCounts = moduleData.lessons.reduce((acc, lesson) => {
    const status = getLessonStatus(lesson)
    if (status === 'completed') acc.completed++
    else if (status === 'in-progress') acc.inProgress++
    return acc
  }, { completed: 0, inProgress: 0 })
  
  const completedLessons = lessonStatusCounts.completed
  // For progress calculation, only count fully completed lessons (video + quiz if required)
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  
  const lastViewedSequence = progressData.last_viewed_lesson_sequence || 0
  const nextLessonToWatch = moduleData.lessons.find(lesson => lesson.sequence > lastViewedSequence) || moduleData.lessons[0]

  const getProgressColor = (percentage: number): "primary" | "success" | "warning" | "danger" => {
    if (percentage >= 100) return "success"
    if (percentage >= 70) return "primary"
    if (percentage >= 30) return "warning"
    return "danger"
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      case 'in-progress':
        return 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
      case 'not-started':
      default:
        return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
    }
  }

  return (
    <div className="space-y-8">
      {/* Course Progress Overview */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="glow"
        className="dashboard-card border-blue-500/20 bg-blue-500/5"
        staggerIndex={0}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
              Course Progress
            </h3>
          </div>
          
          <p className="text-blue-700 dark:text-blue-300">
            Track your learning progress through this course
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
            <div className="text-center flex-shrink-0">
              <div className="sm:hidden">
                <OptimizedProgressRing
                  value={progressPercentage}
                  size={100}
                  color={getProgressColor(progressPercentage)}
                  showValue={true}
                  delay={300}
                />
              </div>
              <div className="hidden sm:block">
                <OptimizedProgressRing
                  value={progressPercentage}
                  size={120}
                  color={getProgressColor(progressPercentage)}
                  showValue={true}
                  delay={300}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">Overall Progress</p>
            </div>
            
            <div className="space-y-3 sm:space-y-4 flex-1 w-full sm:w-auto">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Lessons Completed
                </span>
                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {completedLessons} / {totalLessons}
                </span>
              </div>
              
              <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-3">
                <div 
                  className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${progressPercentage}%`,
                    transitionDelay: '600ms'
                  }}
                />
              </div>
              
              <div className="text-sm text-blue-700 dark:text-blue-300 text-center sm:text-left">
                {progressPercentage}% complete
              </div>
            </div>
          </div>

        </div>
      </PerformantAnimatedCard>

      {/* Course Content */}
      <div className="space-y-8">
        {/* Lessons List */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-semibold gradient-text">
              Course Lessons
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 self-start sm:self-auto">
              {totalLessons} lessons
            </Badge>
          </div>

          <div className="space-y-4">
            {moduleData.lessons
              .sort((a, b) => a.sequence - b.sequence)
              .map((lesson, index) => {
                const status = getLessonStatus(lesson)
                const quizResult = progressData.lesson_quiz_results?.[lesson.id]
                
                return (
                  <PerformantAnimatedCard 
                    key={lesson.id} 
                    variant="glass"
                    hoverEffect="lift"
                    staggerIndex={index + 1}
                    className="dashboard-card group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex items-center flex-shrink-0">
                          <div className={cn(
                            "p-2 sm:p-3 rounded-full backdrop-blur-sm border transition-all duration-300",
                            status === 'completed' 
                              ? 'bg-emerald-500/20 border-emerald-500/30 dark:bg-emerald-500/10' 
                              : status === 'in-progress'
                              ? 'bg-amber-500/20 border-amber-500/30 dark:bg-amber-500/10'
                              : 'bg-muted/50 border-muted-foreground/20'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                            ) : status === 'in-progress' ? (
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Video className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-3 min-w-0">
                          <div>
                            <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">
                              Lesson {lesson.sequence}: {lesson.title}
                            </h3>
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium flex-shrink-0",
                                getStatusColor(status)
                              )}>
                                {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Not Started'}
                              </span>
                              {lesson.enable_ai_quiz && (
                                <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 flex-shrink-0">
                                  <Award className="h-3 w-3 mr-1" />
                                  AI Quiz
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 pr-2">
                              {lesson.description}
                            </p>
                          </div>

                          {/* Quiz Results (if available) */}
                          {quizResult && (
                            <div className="p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm border border-muted">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Quiz Result:</span>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-semibold",
                                    quizResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                  )}>
                                    {quizResult.score}% {quizResult.passed ? '(Passed)' : '(Failed)'}
                                  </span>
                                  <span className="text-muted-foreground">
                                    • {quizResult.attempts} attempt{quizResult.attempts !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Button */}
                          <Link href={`/app/job-readiness/courses/${moduleData.id}/lessons/${lesson.id}`}>
                            <AnimatedButton 
                              variant={status === 'completed' ? "outline" : "default"} 
                              className={cn(
                                "w-full",
                                status !== 'completed' && "bg-gradient-to-r from-primary to-accent"
                              )}
                            >
                              {status === 'completed' ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="hidden sm:inline">Review Lesson</span>
                                  <span className="sm:hidden">Review</span>
                                </>
                              ) : status === 'in-progress' ? (
                                <>
                                  <Play className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="hidden sm:inline">Continue Lesson</span>
                                  <span className="sm:hidden">Continue</span>
                                </>
                              ) : (
                                <>
                                  <Video className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="hidden sm:inline">Start Lesson</span>
                                  <span className="sm:hidden">Start</span>
                                </>
                              )}
                            </AnimatedButton>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </PerformantAnimatedCard>
                )
              })}
          </div>
        </div>

        {/* Course Information Cards - Stack on mobile, side-by-side on tablet+ */}
        <div className="grid sm:grid-cols-2 gap-6">
          <PerformantAnimatedCard 
            variant="glass"
            hoverEffect="scale"
            className="dashboard-card"
            staggerIndex={2}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                <h3 className="font-semibold text-base sm:text-lg">Course Details</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total Lessons</div>
                  <div className="font-semibold text-lg">{totalLessons}</div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Completed</div>
                  <div className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">{completedLessons}</div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Progress</div>
                  <div className="font-semibold text-lg text-primary">{progressPercentage}%</div>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Last Viewed</div>
                  <div className="font-semibold text-sm">
                    {lastViewedSequence > 0 ? `Lesson ${lastViewedSequence}` : 'None'}
                  </div>
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>

          {/* Learning Tips */}
          <PerformantAnimatedCard 
            variant="glass"
            hoverEffect="glow"
            className="dashboard-card border-emerald-500/20 bg-emerald-500/5"
            staggerIndex={3}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-500/20 flex-shrink-0">
                  <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg text-emerald-900 dark:text-emerald-100">
                  Learning Tips
                </h3>
              </div>
              
              <div className="space-y-3 text-sm text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>Watch each video completely for best understanding</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>Complete the AI quiz to test your knowledge</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>You can review lessons anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>Take notes while learning for better retention</span>
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    </div>
  )
} 