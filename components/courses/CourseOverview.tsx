'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Play, Clock, Award, Video, BookOpen, Target } from 'lucide-react'
import Link from 'next/link'

// Interface matching our enhanced API structure
interface EnhancedLesson {
  id: string
  title: string
  description?: string | null
  video_url?: string | null
  sequence: number
  has_quiz?: boolean
  quiz_questions?: any[] | null
  is_completed: boolean
  quiz_passed?: boolean
  quiz_attempts: number
  last_watched_position: number
  video_fully_watched: boolean
}

interface CourseModule {
  id: string
  name: string
  description: string
  lessons: EnhancedLesson[]
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

interface CourseOverviewProps {
  moduleData: CourseModule
  progressData: CourseProgress
}

export function CourseOverview({ moduleData, progressData }: CourseOverviewProps) {
  const totalLessons = moduleData.lessons.length
  const completedLessons = progressData.completed_lessons
  const progressPercentage = progressData.progress_percentage
  const isCourseCompleted = progressData.status === 'Completed'
  
  // Find next lesson to watch (first incomplete lesson)
  const nextLessonToWatch = moduleData.lessons.find(lesson => 
    !lesson.is_completed
  ) || moduleData.lessons[0]

  const getLessonStatus = (lesson: EnhancedLesson) => {
    if (lesson.is_completed) {
      return 'completed'
    }
    if (lesson.last_watched_position > 0) {
      return 'in-progress'
    }
    return 'not-started'
  }

  const getLessonBadgeProps = (lesson: EnhancedLesson) => {
    const status = getLessonStatus(lesson)
    
    switch (status) {
      case 'completed':
        return { 
          variant: 'default' as const, 
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
          text: 'Completed'
        }
      case 'in-progress':
        return { 
          variant: 'default' as const, 
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          icon: <Play className="h-3 w-3 mr-1" />,
          text: 'In Progress'
        }
      default:
        return { 
          variant: 'outline' as const, 
          className: 'text-gray-600 dark:text-gray-400',
          icon: <Video className="h-3 w-3 mr-1" />,
          text: 'Start'
        }
    }
  }

  const totalEstimatedTime = moduleData.lessons.length * 5 // Estimate 5 minutes per lesson

  return (
    <div className="space-y-8">
      {/* Course Progress Overview */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Target className="h-5 w-5" />
            Course Progress
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Track your learning progress through this course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Lessons Completed
            </span>
            <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {completedLessons} / {totalLessons}
            </span>
          </div>
          
          <Progress value={progressPercentage} className="h-3" />
          
          <div className="text-sm text-blue-700 dark:text-blue-300">
            {progressPercentage}% complete
          </div>

          {/* Course Completion Status */}
          {isCourseCompleted ? (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  🎉 Course Completed!
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  Congratulations! You have successfully completed this course.
                </p>
              </CardContent>
            </Card>
          ) : nextLessonToWatch ? (
            <div className="pt-2">
              <Link href={`/app/course/${moduleData.id}/lesson/${nextLessonToWatch.id}`}>
                <Button className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  {completedLessons === 0 ? 'Start Course' : 'Continue Learning'}
                </Button>
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Course Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalLessons}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Lessons
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ~{totalEstimatedTime}min
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Estimated Time
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {moduleData.lessons.filter(l => l.has_quiz).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Quizzes
              </div>
            </div>
          </div>
          
          {moduleData.description && (
            <div className="pt-4 border-t">
              <p className="text-gray-600 dark:text-gray-400">
                {moduleData.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Course Content
          </h2>
          <Badge variant="outline" className="text-sm">
            {totalLessons} lessons
          </Badge>
        </div>

        <div className="space-y-4">
          {moduleData.lessons
            .sort((a, b) => a.sequence - b.sequence)
            .map((lesson) => {
              const status = getLessonStatus(lesson)
              const badgeProps = getLessonBadgeProps(lesson)
              
              return (
                <Card key={lesson.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-2 rounded-full ${
                            status === 'completed' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : status === 'in-progress'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            {status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <Video className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              Lesson {lesson.sequence}: {lesson.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge {...badgeProps}>
                                {badgeProps.icon}
                                {badgeProps.text}
                              </Badge>
                              {lesson.has_quiz && (
                                <Badge variant="outline" className="text-xs">
                                  <Award className="h-3 w-3 mr-1" />
                                  Quiz
                                  {lesson.quiz_passed && (
                                    <CheckCircle className="h-3 w-3 ml-1 text-green-600" />
                                  )}
                                </Badge>
                              )}
                              {lesson.video_fully_watched && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  Video Complete
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {lesson.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {lesson.description}
                          </p>
                        )}

                        {/* Progress Bar for In-Progress Lessons */}
                        {status === 'in-progress' && lesson.video_url && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <span>Progress</span>
                              <span>{Math.round((lesson.last_watched_position / 300) * 100)}%</span>
                            </div>
                            <Progress 
                              value={(lesson.last_watched_position / 300) * 100} 
                              className="h-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {lesson.video_url && (
                          <>
                            <Clock className="h-4 w-4" />
                            <span>~5 min</span>
                          </>
                        )}
                        {lesson.has_quiz && lesson.quiz_attempts > 0 && (
                          <>
                            <span>•</span>
                            <span>Quiz attempts: {lesson.quiz_attempts}</span>
                          </>
                        )}
                      </div>
                      
                      <Link href={`/app/course/${moduleData.id}/lesson/${lesson.id}`}>
                        <Button 
                          variant={status === 'completed' ? "outline" : "default"} 
                          size="sm"
                        >
                          {status === 'completed' ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Review Lesson
                            </>
                          ) : status === 'in-progress' ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Continue Lesson
                            </>
                          ) : (
                            <>
                              <Video className="h-4 w-4 mr-2" />
                              Start Lesson
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>
    </div>
  )
} 