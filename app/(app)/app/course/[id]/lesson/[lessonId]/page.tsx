'use client'

import { Suspense } from 'react'
import { LessonViewer } from '@/components/courses/LessonViewer'
import { useEnhancedCourseContent } from '@/hooks/useEnhancedCourseContent'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Transform API response to LessonViewer component props
interface LessonApiResponse {
  course: any;
  progress: any;
}

function transformLessonData(apiResponse: LessonApiResponse, lessonId: string) {
  const { course, progress } = apiResponse
  
  // Find the specific lesson
  const lesson = course.lessons.find((l: any) => l.id === lessonId)
  if (!lesson) {
    throw new Error('Lesson not found')
  }

  // Transform lesson data to match LessonViewer component expectations
  const lessonData = {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description || '',
    video_url: lesson.video_url,
    sequence: lesson.sequence,
    has_quiz: lesson.has_quiz || false,
    quiz_questions: lesson.quiz_questions || [],
    is_completed: lesson.is_completed || false,
    quiz_passed: lesson.quiz_passed || false,
    quiz_attempts: lesson.quiz_attempts || 0,
    last_watched_position: lesson.last_watched_position || 0,
    video_fully_watched: lesson.video_fully_watched || false
  }

  // Transform module data
  const moduleData = {
    id: course.id,
    name: course.name,
    description: course.description || '',
    lessons: course.lessons
  }

  // Transform progress data
  const progressData = {
    completed_videos: progress.fully_watched_video_ids || [],
    video_completion_count: progress.completed_videos_count || 0,
    course_completed_at: progress.course_completed ? new Date().toISOString() : null,
    status: progress.course_completed ? 'Completed' as const : 'InProgress' as const,
    progress_percentage: progress.overall_progress || 0,
    total_lessons: course.lessons_count || course.lessons.length,
    completed_lessons: course.completed_lessons_count || 0
  }

  return { lessonData, moduleData, progressData }
}

// Enhanced lesson page using Job Readiness-style UI patterns
function EnhancedLessonPageContent() {
  const params = useParams()
  const courseId = params.id as string
  const lessonId = params.lessonId as string

  const {
    data: courseData,
    isLoading,
    error
  } = useEnhancedCourseContent(courseId)

  if (isLoading) {
    return <LessonPageSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300">
          <div className="p-6 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error.message || 'An error occurred while loading the lesson'}</p>
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
            <p>Course or lesson not found.</p>
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

  try {
    const { lessonData, moduleData, progressData } = transformLessonData(courseData, lessonId)
    
    // Find previous and next lessons
    const currentIndex = moduleData.lessons.findIndex((l: any) => l.id === lessonId)
    const previousLesson = currentIndex > 0 ? moduleData.lessons[currentIndex - 1] : null
    const nextLesson = currentIndex < moduleData.lessons.length - 1 ? moduleData.lessons[currentIndex + 1] : null

    return (
      <div className="container mx-auto p-4 space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center gap-4">
          <Link href={`/app/course/${courseId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </Link>
          <div className="border-l border-gray-300 dark:border-gray-600 h-4" />
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {moduleData.name}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Lesson {lessonData.sequence}: {lessonData.title}
            </h1>
          </div>
        </div>

        {/* Enhanced Lesson Viewer */}
        <LessonViewer 
          lesson={lessonData}
          moduleId={moduleData.id}
          courseName={moduleData.name}
          previousLesson={previousLesson}
          nextLesson={nextLesson}
          progressData={progressData}
          totalLessons={progressData.total_lessons}
        />
      </div>
    )
  } catch {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 backdrop-blur-sm text-amber-700 dark:text-amber-300">
          <div className="p-6 text-center">
            <p>Lesson not found in this course.</p>
            <Link href={`/app/course/${courseId}`}>
              <Button className="mt-4">
                Return to Course
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }
}

// Skeleton loader component
function LessonPageSkeleton() {
  return (
    <div className="container mx-auto p-4 animate-pulse">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-9 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          <div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-96"></div>
          </div>
        </div>

        {/* Video player skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-gray-300 dark:bg-gray-700 rounded-t-lg"></div>
            <div className="p-6 space-y-4">
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz skeleton */}
        <Card>
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-48"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 border rounded">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ))}
            </div>
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </Card>
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
        <p className="text-gray-600 dark:text-gray-400">Loading lesson content...</p>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function EnhancedLessonPage() {
  return (
    <Suspense fallback={<LoadingWrapper />}>
      <EnhancedLessonPageContent />
    </Suspense>
  )
} 