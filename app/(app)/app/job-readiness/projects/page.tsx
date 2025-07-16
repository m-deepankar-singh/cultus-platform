"use client"

import { useState, useEffect } from "react"
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { ProjectInterface } from '@/components/job-readiness/ProjectInterface'
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Lightbulb, 
  Target, 
  RefreshCw, 
  FileText, 
  Trophy,
  Info
} from 'lucide-react'
import gsap from "gsap"

export default function ProjectsPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    
    // GSAP animations for cards
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
  }, [])

  return (
    <JobReadinessLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">Real-World Projects</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete AI-generated projects tailored to your background and demonstrate your skills in real-world scenarios.
          </p>
        </div>

        {/* Info Cards */}
        <CardGrid columns={3} gap="lg">
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="scale"
            staggerIndex={0}
            className="dashboard-card border-blue-200/50 bg-blue-50/80 dark:border-blue-800/50 dark:bg-blue-950/80 backdrop-blur-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Target className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Dynamic Projects</h3>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Each project is uniquely generated based on your background and tier level for maximum relevance.
              </p>
            </div>
          </PerformantAnimatedCard>

          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="scale"
            staggerIndex={1}
            className="dashboard-card border-amber-200/50 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/80 backdrop-blur-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <RefreshCw className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Fresh Each Time</h3>
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                Projects change on page refresh until you submit your work, giving you options to find the right fit.
              </p>
            </div>
          </PerformantAnimatedCard>

          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="scale"
            staggerIndex={2}
            className="dashboard-card border-green-200/50 bg-green-50/80 dark:border-green-800/50 dark:bg-green-950/80 backdrop-blur-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Trophy className="h-5 w-5" />
                <h3 className="font-semibold text-lg">AI Feedback</h3>
              </div>
              <p className="text-green-700 dark:text-green-300 text-sm">
                Receive detailed AI-powered feedback with strengths, improvements, and actionable recommendations.
              </p>
            </div>
          </PerformantAnimatedCard>
        </CardGrid>

        {/* Important Notice */}
        <PerformantAnimatedCard
          variant="glass"
          hoverEffect="glow"
          staggerIndex={3}
          className="dashboard-card border-purple-200/50 bg-purple-50/80 dark:border-purple-800/50 dark:bg-purple-950/80 backdrop-blur-sm"
        >
          <Alert className="border-none bg-transparent">
            <Lightbulb className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800 dark:text-purple-200">
              <strong>Project Guidelines:</strong> You need a score of 80% or higher to pass. 
              Failed projects can be retried with a new project generation. Take your time to create quality work!
            </AlertDescription>
          </Alert>
        </PerformantAnimatedCard>

        {/* Submission Types Info */}
        <PerformantAnimatedCard
          variant="glass"
          hoverEffect="lift"
          staggerIndex={4}
          className="dashboard-card"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h2 className="font-semibold text-lg">Submission Information</h2>
            </div>
            <p className="text-muted-foreground">
              How to submit your project work
            </p>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Text Submissions</h4>
                <p className="text-sm text-muted-foreground">
                  Most projects accept detailed text responses. For coding projects, you can use 
                  <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">
                    GitIngest
                  </a>
                  to convert your code repositories into text format.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Content Requirements</h4>
                <p className="text-sm text-muted-foreground">
                  Submissions must be at least 100 characters long and should thoroughly address all project tasks and deliverables.
                </p>
              </div>
            </div>
          </div>
        </PerformantAnimatedCard>

        {/* Main Project Interface */}
        <div className="dashboard-card" style={{ '--stagger-index': 5 } as React.CSSProperties}>
          <ProjectInterface />
        </div>
      </div>
    </JobReadinessLayout>
  )
} 