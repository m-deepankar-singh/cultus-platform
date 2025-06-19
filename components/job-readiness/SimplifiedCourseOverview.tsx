'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Play, Clock, Award, Video, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface SimplifiedLesson {
  id: string
  title: string
  description: string
  sequence: number
  duration_minutes?: number
  enable_ai_quiz: boolean
}

interface SimplifiedModuleData {
  id: string
  name: string
  description?: string
  lessons: SimplifiedLesson[]
}

interface SimplifiedCourseProgress {
  completed_videos: string[]
  video_completion_count: number
  course_completed_at?: string
  status: 'InProgress' | 'Completed'
}

interface SimplifiedCourseOverviewProps {
  moduleData: SimplifiedModuleData
  progressData: SimplifiedCourseProgress
}

export function SimplifiedCourseOverview({ moduleData, progressData }: SimplifiedCourseOverviewProps) {
  const totalLessons = moduleData.lessons.length
  const completedLessons = progressData.video_completion_count
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const isCourseCompleted = progressData.status === 'Completed'
  
  // Find next lesson to watch (first incomplete lesson)
  const nextLessonToWatch = moduleData.lessons.find(lesson => 
    !progressData.completed_videos.includes(lesson.id)
  ) || moduleData.lessons[0]

  const getLessonStatus = (lesson: SimplifiedLesson) => {
    if (progressData.completed_videos.includes(lesson.id)) {
      return 'completed'
    }
    return 'not-started'
  }

  const getLessonBadgeProps = (lesson: SimplifiedLesson) => {
    const status = getLessonStatus(lesson)
    
    switch (status) {
      case 'completed':
        return { 
          variant: 'default' as const, 
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
          text: 'Completed'
        }
      default:
        return { 
          variant: 'outline' as const, 
          className: 'text-gray-600 dark:text-gray-400',
          icon: <Play className="h-3 w-3 mr-1" />,
          text: 'Start'
        }
    }
  }

  const totalEstimatedTime = moduleData.lessons.reduce((total, lesson) => 
    total + (lesson.duration_minutes || 5), 0)

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className={`p-3 rounded-full ${
            isCourseCompleted 
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            {isCourseCompleted ? (
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            ) : (
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {moduleData.name}
          </h1>
        </div>
        
        {moduleData.description && (
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {moduleData.description}
          </p>
        )}
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Course Progress
          </CardTitle>
          <CardDescription>
            {completedLessons} of {totalLessons} lessons completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{totalLessons}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Lessons</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{completedLessons}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">{totalLessons - completedLessons}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">{totalEstimatedTime}m</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Est. Time</div>
            </div>
          </div>

          {isCourseCompleted ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Course Completed!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Congratulations! You've completed all lessons in this course.
                    {progressData.course_completed_at && (
                      <span className="block mt-1">
                        Completed on {new Date(progressData.course_completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                      Continue Learning
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Next: {nextLessonToWatch?.title}
                    </p>
                  </div>
                </div>
                <Link href={`/app/job-readiness/courses/${moduleData.id}/lessons/${nextLessonToWatch?.id}`}>
                  <Button>
                    Continue Course
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lessons List */}
      <Card>
        <CardHeader>
          <CardTitle>Course Lessons</CardTitle>
          <CardDescription>
            Complete lessons in order. You must finish each video to progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {moduleData.lessons.map((lesson, index) => {
              const badgeProps = getLessonBadgeProps(lesson)
              const isCompleted = getLessonStatus(lesson) === 'completed'
              const canAccess = index === 0 || progressData.completed_videos.includes(moduleData.lessons[index - 1]?.id)
              
              return (
                <div
                  key={lesson.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    isCompleted 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : canAccess
                      ? 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      isCompleted
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : canAccess
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        lesson.sequence
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        canAccess ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className={`text-sm mt-1 ${
                          canAccess ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {lesson.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lesson.duration_minutes || 5} min
                        </span>
                        {lesson.enable_ai_quiz && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            Quiz Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={badgeProps.variant} 
                      className={badgeProps.className}
                    >
                      {badgeProps.icon}
                      {badgeProps.text}
                    </Badge>
                    
                    {canAccess && (
                      <Link href={`/app/job-readiness/courses/${moduleData.id}/lessons/${lesson.id}`}>
                        <Button
                          variant={isCompleted ? "outline" : "default"}
                          size="sm"
                        >
                          {isCompleted ? 'Review' : 'Start'}
                        </Button>
                      </Link>
                    )}
                    
                    {!canAccess && (
                      <Button variant="ghost" size="sm" disabled>
                        Locked
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 