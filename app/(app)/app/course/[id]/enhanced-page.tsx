'use client'

import { Suspense } from 'react'
import { CourseOverview } from '@/components/courses/CourseOverview'
import { useEnhancedCourseContent } from '@/hooks/useEnhancedCourseContent'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Transform API response to component props
function transformCourseData(apiResponse: any) {
  const { course, progress } = apiResponse

  // Transform course data to match CourseOverview component expectations
  const moduleData = {
    id: course.id,
    name: course.name,
    description: course.description || '',
    lessons: course.lessons
  }

  // Transform progress data to match CourseOverview component expectations
  const progressData = {
    completed_videos: progress.fully_watched_video_ids || [],
    video_completion_count: progress.completed_videos_count || 0,
    course_completed_at: progress.course_completed ? new Date().toISOString() : null,
    status: progress.course_completed ? 'Completed' as const : 'InProgress' as const,
    progress_percentage: progress.overall_progress || 0,
    total_lessons: course.lessons_count || course.lessons.length,
    completed_lessons: course.completed_lessons_count || 0
  }

  return { moduleData, progressData }
}

// Enhanced course page using Job Readiness-style UI patterns
function EnhancedCoursePageContent() {
  const params = useParams()
  const moduleId = params.id as string

  const {
    data: courseData,
    isLoading,
    error
  } = useEnhancedCourseContent(moduleId)

  if (isLoading) {
    return <CoursePageSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300">
          <div className="p-6 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error.message || 'An error occurred while loading the course'}</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!courseData) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 backdrop-blur-sm text-amber-700 dark:text-amber-300">
          <div className="p-6 text-center">
            <p>Course not found or not available.</p>
            <Link href="/app/dashboard">
              <Button className="mt-4">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const { moduleData, progressData } = transformCourseData(courseData)

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/app/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="border-l border-gray-300 dark:border-gray-600 h-4" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {moduleData.name}
          </h1>
          {moduleData.description && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
              {moduleData.description}
            </p>
          )}
        </div>
      </div>

      {/* Enhanced Course Overview */}
      <CourseOverview 
        moduleData={moduleData}
        progressData={progressData}
      />
    </div>
  )
}

// Skeleton loader component
function CoursePageSkeleton() {
  return (
    <div className="container mx-auto p-4 animate-pulse">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-9 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          <div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-96"></div>
          </div>
        </div>

        {/* Progress overview skeleton */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <div className="h-6 bg-blue-300 dark:bg-blue-700 rounded w-48"></div>
            <div className="h-4 bg-blue-300 dark:bg-blue-700 rounded w-72"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-blue-300 dark:bg-blue-700 rounded w-32"></div>
              <div className="h-5 bg-blue-300 dark:bg-blue-700 rounded w-16"></div>
            </div>
            <div className="h-3 bg-blue-300 dark:bg-blue-700 rounded w-full"></div>
            <div className="h-4 bg-blue-300 dark:bg-blue-700 rounded w-24"></div>
            <div className="h-10 bg-blue-400 dark:bg-blue-600 rounded w-full"></div>
          </CardContent>
        </Card>

        {/* Course info skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-12 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mx-auto"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lessons skeleton */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
          </div>

          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                        <div>
                          <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-64 mb-1"></div>
                          <div className="flex items-center gap-2">
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                          </div>
                        </div>
                      </div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-9 bg-gray-300 dark:bg-gray-700 rounded w-28"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading wrapper
function LoadingWrapper() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading course content...</p>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function EnhancedCoursePage() {
  return (
    <Suspense fallback={<LoadingWrapper />}>
      <EnhancedCoursePageContent />
    </Suspense>
  )
} 