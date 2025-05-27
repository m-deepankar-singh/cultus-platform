'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Play, CheckCircle, Clock, Target, Video, Award } from 'lucide-react'
import Link from 'next/link'

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
}

interface CourseOverviewProps {
  moduleData: Module
  progressData: CourseProgress
}

export function CourseOverview({ moduleData, progressData }: CourseOverviewProps) {
  const totalLessons = moduleData.lessons.length
  const completedLessons = Object.keys(progressData.lesson_quiz_results || {}).filter(
    lessonId => progressData.lesson_quiz_results[lessonId]?.passed
  ).length
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  
  const lastViewedSequence = progressData.last_viewed_lesson_sequence || 0
  const nextLessonToWatch = moduleData.lessons.find(lesson => lesson.sequence > lastViewedSequence) || moduleData.lessons[0]

  const getLessonStatus = (lesson: Lesson) => {
    const quizResult = progressData.lesson_quiz_results?.[lesson.id]
    const hasVideoPosition = progressData.video_playback_positions?.[lesson.id] > 0
    
    if (quizResult?.passed) return 'completed'
    if (hasVideoPosition || quizResult) return 'in-progress'
    return 'not-started'
  }

  const getLessonBadgeProps = (lesson: Lesson) => {
    const status = getLessonStatus(lesson)
    
    switch (status) {
      case 'completed':
        return { variant: 'default' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
      case 'in-progress':
        return { variant: 'default' as const, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' }
      default:
        return { variant: 'outline' as const, className: 'text-gray-600 dark:text-gray-400' }
    }
  }

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

          {/* Continue Learning Button */}
          {nextLessonToWatch && (
            <div className="pt-2">
              <Link href={`/app/job-readiness/courses/${moduleData.id}/lessons/${nextLessonToWatch.id}`}>
                <Button className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  {lastViewedSequence === 0 ? 'Start Course' : 'Continue Learning'}
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Content */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Lessons List */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Course Lessons
            </h2>
            <Badge variant="outline">
              {totalLessons} lessons
            </Badge>
          </div>

          <div className="space-y-4">
            {moduleData.lessons
              .sort((a, b) => a.sequence - b.sequence)
              .map((lesson) => {
                const status = getLessonStatus(lesson)
                const badgeProps = getLessonBadgeProps(lesson)
                const quizResult = progressData.lesson_quiz_results?.[lesson.id]
                
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
                                  {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Not Started'}
                                </Badge>
                                {lesson.enable_ai_quiz && (
                                  <Badge variant="outline" className="text-xs">
                                    <Award className="h-3 w-3 mr-1" />
                                    Quiz
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <CardDescription className="text-sm">
                            {lesson.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quiz Results (if available) */}
                        {quizResult && (
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Quiz Result:</span>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${
                                  quizResult.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {quizResult.score}% {quizResult.passed ? '(Passed)' : '(Failed)'}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  • {quizResult.attempts} attempt{quizResult.attempts !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <Link href={`/app/job-readiness/courses/${moduleData.id}/lessons/${lesson.id}`}>
                          <Button 
                            variant={status === 'completed' ? "outline" : "default"} 
                            className="w-full"
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

        {/* Course Information Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Lessons</span>
                  <span className="font-medium">{totalLessons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Completed</span>
                  <span className="font-medium">{completedLessons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last Viewed</span>
                  <span className="font-medium">
                    {lastViewedSequence > 0 ? `Lesson ${lastViewedSequence}` : 'None'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Tips */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <CardTitle className="text-green-900 dark:text-green-100 text-lg">
                Learning Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-green-800 dark:text-green-200">
              <div>• Watch each video completely for best understanding</div>
              <div>• Complete the AI quiz to test your knowledge</div>
              <div>• You can review lessons anytime</div>
              <div>• Take notes while learning for better retention</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 