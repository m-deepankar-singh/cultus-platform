'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Clock, CheckCircle, Play, Lock, Star } from 'lucide-react'
import Link from 'next/link'

interface CourseProgress {
  status: string
  progress_percentage: number
  last_updated: string
  completed_at?: string
}

interface Course {
  id: string
  name: string
  type: string
  configuration: {
    description?: string
    estimated_duration_hours?: number
    difficulty_level?: string
    required_tier?: string
  }
  sequence: number
  is_unlocked: boolean
  is_completed: boolean
  progress: CourseProgress
  lessons_count: number
  description: string
  completion_percentage: number
}

interface CourseCardProps {
  course: Course
  currentTier: 'BRONZE' | 'SILVER' | 'GOLD'
}

const tierColors = {
  BRONZE: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20',
  SILVER: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20',
  GOLD: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
}

const statusColors = {
  'NotStarted': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'InProgress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
}

export function CourseCard({ course, currentTier }: CourseCardProps) {
  const isLocked = !course.is_unlocked
  const isCompleted = course.is_completed
  const isInProgress = course.progress?.status === 'InProgress'
  const progressPercentage = course.completion_percentage || course.progress?.progress_percentage || 0
  
  const requiredTier = course.configuration?.required_tier || 'BRONZE'
  const estimatedHours = course.configuration?.estimated_duration_hours || 0
  const difficultyLevel = course.configuration?.difficulty_level || 'Beginner'
  
  const statusText = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'
  const statusColor = statusColors[isCompleted ? 'Completed' : isInProgress ? 'InProgress' : 'NotStarted']

  return (
    <Card className={`transition-all hover:shadow-md ${
      isLocked 
        ? 'opacity-60 border-gray-300 dark:border-gray-600' 
        : isCompleted
        ? tierColors[currentTier]
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-full ${
                isLocked 
                  ? 'bg-gray-200 dark:bg-gray-700' 
                  : isCompleted 
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {isLocked ? (
                  <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{course.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Course {course.sequence}
                  </Badge>
                </div>
              </div>
            </div>
            
            <CardDescription className="text-sm">
              {course.description || course.configuration?.description || 'Learn essential skills through hands-on practice and examples.'}
            </CardDescription>
          </div>
          
          <Badge className={statusColor}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Course Info */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span>{course.lessons_count} lessons</span>
            </div>
            {estimatedHours > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>{estimatedHours}h estimated</span>
              </div>
            )}
          </div>

          {/* Progress Bar (only show if started) */}
          {progressPercentage > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 dark:bg-green-400' 
                      : 'bg-blue-500 dark:bg-blue-400'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {isLocked ? (
              <Button variant="outline" disabled className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Locked - Complete Previous Requirements
              </Button>
            ) : (
              <Link href={`/app/job-readiness/courses/${course.id}`} className="block">
                <Button className="w-full" variant={isCompleted ? "outline" : "default"}>
                  {isCompleted ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Review Course
                    </>
                  ) : isInProgress ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Course
                    </>
                  )}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 