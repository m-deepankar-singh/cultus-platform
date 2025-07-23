'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { CourseOverview } from '@/components/job-readiness/CourseOverview'
import { useCourseContent } from '@/hooks/useCourseContent'
import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { AdaptiveParticles } from '@/components/ui/floating-particles'
import { BookOpen, AlertCircle, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import gsap from 'gsap'

export default function CourseContentPage() {
  const params = useParams()
  const moduleId = params.moduleId as string
  const [mounted, setMounted] = useState(false)

  const { data: courseData, isLoading, error } = useCourseContent(moduleId)

  useEffect(() => {
    setMounted(true)
    
    if (!isLoading && mounted) {
      gsap.fromTo(
        ".dashboard-card",
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.1, 
          duration: 0.6, 
          ease: "power2.out"
        }
      )
    }
  }, [isLoading, mounted])

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        
        <JobReadinessLayout>
          <div className="relative space-y-8">
            {/* Loading Skeleton */}
            <div className="space-y-4">
              <div className="h-8 bg-gradient-to-r from-muted/60 to-muted/30 rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded w-2/3 animate-pulse" />
            </div>
            
            <div className="space-y-6 px-4 sm:px-0">
              <div className="space-y-4">
                <PerformantAnimatedCard variant="glass" className="h-48 sm:h-64">
                  <div className="h-full bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg animate-pulse" />
                </PerformantAnimatedCard>
                <PerformantAnimatedCard variant="glass" className="h-24 sm:h-32">
                  <div className="h-full bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg animate-pulse" />
                </PerformantAnimatedCard>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <PerformantAnimatedCard variant="glass" className="h-32 sm:h-40">
                  <div className="h-full bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg animate-pulse" />
                </PerformantAnimatedCard>
                <PerformantAnimatedCard variant="glass" className="h-32 sm:h-40">
                  <div className="h-full bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg animate-pulse" />
                </PerformantAnimatedCard>
              </div>
            </div>
          </div>
        </JobReadinessLayout>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        
        <JobReadinessLayout>
          <div className="relative space-y-8 px-4 sm:px-0">
            <div className="flex items-center gap-4">
              <Link href="/app/job-readiness/courses">
                <AnimatedButton variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Courses</span>
                  <span className="sm:hidden">Back</span>
                </AnimatedButton>
              </Link>
            </div>
            
            <PerformantAnimatedCard variant="glass" className="dashboard-card border-destructive/20 bg-destructive/5">
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4">
                <div className="p-3 rounded-full bg-destructive/10 backdrop-blur-sm">
                  <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-destructive">Error Loading Course</h2>
                <p className="text-muted-foreground max-w-md text-sm sm:text-base">
                  Failed to load course content. Please check if you have access to this course and try again.
                </p>
                <AnimatedButton onClick={() => window.location.reload()} className="bg-gradient-to-r from-primary to-accent">
                  Try Again
                </AnimatedButton>
              </div>
            </PerformantAnimatedCard>
          </div>
        </JobReadinessLayout>
      </div>
    )
  }

  if (!courseData?.module) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        
        <JobReadinessLayout>
          <div className="relative space-y-8 px-4 sm:px-0">
            <div className="flex items-center gap-4">
              <Link href="/app/job-readiness/courses">
                <AnimatedButton variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Courses</span>
                  <span className="sm:hidden">Back</span>
                </AnimatedButton>
              </Link>
            </div>
            
            <PerformantAnimatedCard 
              variant="glass" 
              className="dashboard-card border-amber-500/20 bg-amber-500/5"
              staggerIndex={0}
            >
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4">
                <div className="p-3 rounded-full bg-amber-500/10 backdrop-blur-sm">
                  <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-amber-900 dark:text-amber-100">Course Not Found</h2>
                <p className="text-amber-700 dark:text-amber-300 max-w-md text-sm sm:text-base">
                  The requested course could not be found or you may not have access to it.
                </p>
                <Link href="/app/job-readiness/courses">
                  <AnimatedButton variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10">
                    <span className="hidden sm:inline">Return to Course List</span>
                    <span className="sm:hidden">Back to Courses</span>
                  </AnimatedButton>
                </Link>
              </div>
            </PerformantAnimatedCard>
          </div>
        </JobReadinessLayout>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <JobReadinessLayout>
        <div className="relative space-y-8">
          {/* Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link href="/app/job-readiness/courses">
              <AnimatedButton variant="outline" size="sm" className="self-start">
                <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Back to Courses</span>
                <span className="sm:hidden">Back</span>
              </AnimatedButton>
            </Link>
            <div className="text-sm text-muted-foreground">
              Courses • <span className="font-medium">{courseData.module.name}</span>
            </div>
          </div>

          {/* Header Section */}
          <div className="text-center space-y-4 px-4">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 flex-wrap">
              <div className="p-2 sm:p-3 rounded-full bg-blue-500/20 dark:bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 flex-shrink-0">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight gradient-text text-center">
                {courseData.module.name}
              </h1>
            </div>
            
            {courseData.module.description && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
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
    </div>
  )
} 