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
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <PerformantAnimatedCard variant="glass" className="h-64">
                  <div className="h-full bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg animate-pulse" />
                </PerformantAnimatedCard>
                <PerformantAnimatedCard variant="glass" className="h-32">
                  <div className="h-full bg-gradient-to-br from-muted/20 to-muted/10 rounded-lg animate-pulse" />
                </PerformantAnimatedCard>
              </div>
              <div className="space-y-4">
                <PerformantAnimatedCard variant="glass" className="h-48">
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
          <div className="relative space-y-8">
            <div className="flex items-center gap-4">
              <Link href="/app/job-readiness/courses">
                <AnimatedButton variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Courses
                </AnimatedButton>
              </Link>
            </div>
            
            <PerformantAnimatedCard variant="glass" className="dashboard-card border-destructive/20 bg-destructive/5">
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="p-3 rounded-full bg-destructive/10 backdrop-blur-sm">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-destructive">Error Loading Course</h2>
                <p className="text-muted-foreground max-w-md">
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
          <div className="relative space-y-8">
            <div className="flex items-center gap-4">
              <Link href="/app/job-readiness/courses">
                <AnimatedButton variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Courses
                </AnimatedButton>
              </Link>
            </div>
            
            <PerformantAnimatedCard 
              variant="glass" 
              className="dashboard-card border-amber-500/20 bg-amber-500/5"
              staggerIndex={0}
            >
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="p-3 rounded-full bg-amber-500/10 backdrop-blur-sm">
                  <BookOpen className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100">Course Not Found</h2>
                <p className="text-amber-700 dark:text-amber-300 max-w-md">
                  The requested course could not be found or you may not have access to it.
                </p>
                <Link href="/app/job-readiness/courses">
                  <AnimatedButton variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10">
                    Return to Course List
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
          <div className="flex items-center gap-4">
            <Link href="/app/job-readiness/courses">
              <AnimatedButton variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </AnimatedButton>
            </Link>
            <div className="text-sm text-muted-foreground">
              Courses • {courseData.module.name}
            </div>
          </div>

          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-blue-500/20 dark:bg-blue-500/10 backdrop-blur-sm border border-blue-500/20">
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                {courseData.module.name}
              </h1>
            </div>
            
            {courseData.module.description && (
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
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