'use client'

import { useParams } from 'next/navigation'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { CourseOverview } from '@/components/job-readiness/CourseOverview'
import { useCourseContent } from '@/hooks/useCourseContent'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function CourseContentPage() {
  const params = useParams()
  const moduleId = params.moduleId as string

  const { data: courseData, isLoading, error } = useCourseContent(moduleId)

  if (isLoading) {
    return (
      <JobReadinessLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Loading Skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </JobReadinessLayout>
    )
  }

  if (error) {
    return (
      <JobReadinessLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/app/job-readiness/courses">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load course content. Please check if you have access to this course and try again.
            </AlertDescription>
          </Alert>
        </div>
      </JobReadinessLayout>
    )
  }

  if (!courseData?.module) {
    return (
      <JobReadinessLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/app/job-readiness/courses">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
          </div>
          
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                <BookOpen className="h-5 w-5" />
                Course Not Found
              </CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                The requested course could not be found or you may not have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/app/job-readiness/courses">
                <Button variant="outline" className="text-yellow-700 dark:text-yellow-300">
                  Return to Course List
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </JobReadinessLayout>
    )
  }

  return (
    <JobReadinessLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex items-center gap-4">
          <Link href="/app/job-readiness/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Courses • {courseData.module.name}
          </div>
        </div>

        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {courseData.module.name}
            </h1>
          </div>
          
          {courseData.module.description && (
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {courseData.module.description}
            </p>
          )}
        </div>

        {/* Course Overview Component */}
        <CourseOverview
          moduleData={courseData.module}
          progressData={courseData.progress}
        />
      </div>
    </JobReadinessLayout>
  )
} 