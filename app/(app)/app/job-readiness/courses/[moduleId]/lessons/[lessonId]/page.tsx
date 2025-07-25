'use client'

import { useParams, useRouter } from 'next/navigation'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { LessonViewer } from '@/components/job-readiness/LessonViewer'
import { useCourseContent } from '@/hooks/useCourseContent'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function LessonPage() {
  const params = useParams()
  const moduleId = params.moduleId as string
  const lessonId = params.lessonId as string

  const { data: courseData, isLoading, error } = useCourseContent(moduleId)

  if (isLoading) {
    return (
      <JobReadinessLayout>
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6">
          {/* Loading Skeleton */}
          <div className="space-y-3 sm:space-y-4">
            <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2 sm:w-1/3 animate-pulse" />
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 sm:w-2/3 animate-pulse" />
          </div>
          
          <div className="space-y-4">
            <div className="h-48 sm:h-64 md:h-96 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-24 sm:h-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </JobReadinessLayout>
    )
  }

  if (error) {
    return (
      <JobReadinessLayout>
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/app/job-readiness/courses">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Back to Courses</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <AlertDescription className="text-sm sm:text-base">
              Failed to load lesson content. Please check if you have access to this lesson and try again.
            </AlertDescription>
          </Alert>
        </div>
      </JobReadinessLayout>
    )
  }

  const lesson = courseData?.module?.lessons?.find(l => l.id === lessonId)

  if (!courseData?.module || !lesson) {
    return (
      <JobReadinessLayout>
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href={`/app/job-readiness/courses/${moduleId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Back to Course</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>
          
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100 text-lg sm:text-xl">
                <BookOpen className="h-5 w-5 flex-shrink-0" />
                Lesson Not Found
              </CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300 text-sm sm:text-base">
                The requested lesson could not be found or you may not have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href={`/app/job-readiness/courses/${moduleId}`}>
                <Button variant="outline" className="text-yellow-700 dark:text-yellow-300">
                  <span className="hidden sm:inline">Return to Course</span>
                  <span className="sm:hidden">Back to Course</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </JobReadinessLayout>
    )
  }

  // Find previous and next lessons for navigation
  const sortedLessons = courseData.module.lessons.sort((a, b) => a.sequence - b.sequence)
  const currentIndex = sortedLessons.findIndex(l => l.id === lessonId)
  const previousLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null

  return (
    <JobReadinessLayout>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6">
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link href={`/app/job-readiness/courses/${moduleId}`}>
            <Button variant="outline" size="sm" className="self-start">
              <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Back to Course</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{courseData.module.name}</span> • Lesson {lesson.sequence}
          </div>
        </div>

        {/* Lesson Viewer Component */}
        <LessonViewer
          lesson={lesson}
          moduleId={moduleId}
          courseName={courseData.module.name}
          previousLesson={previousLesson}
          nextLesson={nextLesson}
          progressData={{
            completed_videos: courseData.progress.fully_watched_video_ids || [],
            video_completion_count: courseData.progress.fully_watched_video_ids?.length || 0,
            course_completed_at: null, // This would need to be calculated based on business logic
            last_viewed_lesson_sequence: courseData.progress.last_viewed_lesson_sequence,
            lesson_quiz_results: Object.fromEntries(
              Object.entries(courseData.progress.lesson_quiz_results || {}).map(([lessonId, result]) => [
                lessonId,
                {
                  score: result.score,
                  total_questions: 0, // This field is missing in CourseProgress type
                  passed: result.passed,
                  attempts: result.attempts,
                  answers: {}, // This field is missing in CourseProgress type
                  submitted_at: new Date().toISOString() // This field is missing in CourseProgress type
                }
              ])
            )
          }}
        />
      </div>
    </JobReadinessLayout>
  )
} 