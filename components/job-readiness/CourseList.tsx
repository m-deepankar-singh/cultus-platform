'use client'

import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card'
import { useCourseList } from '@/hooks/useCourseList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { CourseCard } from './CourseCard'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DashboardLoadingSkeleton } from '@/components/ui/dashboard-skeleton'

interface CourseListProps {
  productId?: string
}

export function CourseList({ productId: providedProductId }: CourseListProps = {}) {
  const { data: progress, isLoading: progressLoading } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const productId = providedProductId || fallbackProductId
  const { data: courseData, isLoading: coursesLoading, error } = useCourseList(productId || '')

  if (progressLoading || coursesLoading) {
    return <DashboardLoadingSkeleton message="Loading your courses..." />
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
    <div className="space-y-6 px-4 sm:px-0">
      {/* Completion Status */}
      <PerformantAnimatedCard 
        variant="subtle" 
        hoverEffect="glow"
        className="dashboard-card text-center"
        staggerIndex={0}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 dark:bg-green-500/10 backdrop-blur-sm border border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {completed_courses_count} of {total_courses_count} courses completed
          </span>
        </div>
      </PerformantAnimatedCard>

      {/* Available Courses */}
      {pendingCourses.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Available Courses
          </h2>
          <CardGrid columns={2} gap="md">
            {pendingCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                currentTier={current_tier as 'BRONZE' | 'SILVER' | 'GOLD'}
                staggerIndex={index + 1}
              />
            ))}
          </CardGrid>
        </div>
      )}

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Completed Courses
          </h2>
          <CardGrid columns={2} gap="md">
            {completedCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                currentTier={current_tier as 'BRONZE' | 'SILVER' | 'GOLD'}
                staggerIndex={pendingCourses.length + index + 1}
              />
            ))}
          </CardGrid>
        </div>
      )}

      {/* Locked Courses */}
      {lockedCourses.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-muted-foreground">
            Coming Soon
          </h2>
          <CardGrid columns={2} gap="md">
            {lockedCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                currentTier={current_tier as 'BRONZE' | 'SILVER' | 'GOLD'}
                staggerIndex={pendingCourses.length + completedCourses.length + index + 1}
              />
            ))}
          </CardGrid>
        </div>
      )}

      {/* Empty State for Completed Users */}
      {pendingCourses.length === 0 && completedCourses.length === courses.length && (
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="glow"
          className="dashboard-card text-center border-green-500/20 bg-green-500/5"
          staggerIndex={courses.length + 1}
        >
          <div className="space-y-4 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
            <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
              All Courses Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300 max-w-md mx-auto">
              You've successfully completed all available courses. Great job on your learning journey!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              You can now proceed to the next module in your Job Readiness program.
            </p>
          </div>
        </PerformantAnimatedCard>
      )}
    </div>
  )
} 