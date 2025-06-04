'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useCourseList } from '@/hooks/useCourseList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { CourseCard } from './CourseCard'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CourseListProps {
  productId?: string
}

export function CourseList({ productId: providedProductId }: CourseListProps = {}) {
  const { data: progress, isLoading: progressLoading } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const productId = providedProductId || fallbackProductId
  const { data: courseData, isLoading: coursesLoading, error } = useCourseList(productId || '')

  if (progressLoading || coursesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading courses...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load courses. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (!courseData?.courses || courseData.courses.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No courses are currently available. Please check back later or contact support.
        </AlertDescription>
      </Alert>
    )
  }

  const { courses, current_tier, completed_courses_count, total_courses_count } = courseData
  const completedCourses = courses.filter(c => c.is_completed)
  const pendingCourses = courses.filter(c => !c.is_completed && c.is_unlocked)
  const lockedCourses = courses.filter(c => !c.is_unlocked)

  return (
    <div className="space-y-6">
      {/* Completion Status */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {completed_courses_count} of {total_courses_count} courses completed
          </span>
        </div>
      </div>

      {/* Available Courses */}
      {pendingCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Available Courses
          </h2>
          <div className="grid gap-4">
            {pendingCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                currentTier={current_tier as 'BRONZE' | 'SILVER' | 'GOLD'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Completed Courses
          </h2>
          <div className="grid gap-4">
            {completedCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                currentTier={current_tier as 'BRONZE' | 'SILVER' | 'GOLD'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked Courses */}
      {lockedCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Coming Soon
          </h2>
          <div className="grid gap-4">
            {lockedCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                currentTier={current_tier as 'BRONZE' | 'SILVER' | 'GOLD'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Completed Users */}
      {pendingCourses.length === 0 && completedCourses.length === courses.length && (
        <div className="text-center py-8">
          <div className="p-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              All Courses Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-4">
              You've successfully completed all available courses. Great job on your learning journey!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              You can now proceed to the next module in your Job Readiness program.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 