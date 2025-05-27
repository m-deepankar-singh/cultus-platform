'use client'

import { useState } from 'react'
import { useJobReadinessModuleGroups } from '@/hooks/useJobReadinessModuleGroups'
import { useCourseList } from '@/hooks/useCourseList'
import { CourseCard } from './CourseCard'
import { TierDisplay } from './TierDisplay'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Clock, Trophy, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function CourseList() {
  const { data: moduleGroups, isLoading: groupsLoading, error: groupsError } = useJobReadinessModuleGroups()
  
  // Get the primary product ID for fetching courses
  const productId = moduleGroups?.primaryProduct?.id || ''
  
  const { data: courseData, isLoading: coursesLoading, error: coursesError } = useCourseList(productId)
  
  const isLoading = groupsLoading || coursesLoading
  const error = groupsError || coursesError

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load courses. Please refresh the page to try again.
        </AlertDescription>
      </Alert>
    )
  }

  if (!moduleGroups?.primaryProduct) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No Job Readiness product found. Please contact support.
        </AlertDescription>
      </Alert>
    )
  }

  if (!courseData?.courses || courseData.courses.length === 0) {
    return (
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <BookOpen className="h-5 w-5" />
            No Courses Available
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Courses will be available after completing the initial assessments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="text-blue-700 dark:text-blue-300">
            Complete Assessments First
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { courses, current_tier, completed_courses_count, total_courses_count } = courseData
  const overallProgress = total_courses_count > 0 ? Math.round((completed_courses_count / total_courses_count) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Overall Progress Card */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <Trophy className="h-5 w-5" />
            Course Progress
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            Complete all courses to earn your second star and advance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Overall Progress
            </span>
            <span className="text-lg font-bold text-green-900 dark:text-green-100">
              {completed_courses_count} / {total_courses_count} completed
            </span>
          </div>
          
          <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-3">
            <div 
              className="bg-green-600 dark:bg-green-400 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          
          <div className="text-sm text-green-700 dark:text-green-300">
            {overallProgress}% complete • Current tier: {current_tier}
          </div>
        </CardContent>
      </Card>

      {/* Current Tier Display */}
      <TierDisplay productId={productId} />

      {/* Course Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Available Courses
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            Self-paced learning
          </div>
        </div>
        
        <div className="grid gap-6">
          {courses
            .sort((a, b) => a.sequence - b.sequence)
            .map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                currentTier={current_tier as 'BRONZE' | 'SILVER' | 'GOLD'}
              />
            ))}
        </div>
      </div>

      {/* Next Steps */}
      {completed_courses_count === total_courses_count && total_courses_count > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <Trophy className="h-5 w-5" />
              Congratulations!
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              You have completed all available courses. Time to move to the next stage!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
              Continue to Expert Sessions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 