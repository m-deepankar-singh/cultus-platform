'use client'

import { useMemo, useEffect, useState } from 'react'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { useExpertSessions } from '@/hooks/useExpertSessions'
import { ExpertSessionList } from '@/components/job-readiness/ExpertSessionList'
import { OverallSessionProgress } from '@/components/job-readiness/OverallSessionProgress'
import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { AdaptiveParticles } from '@/components/ui/floating-particles'
import { AlertCircle, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Toaster } from 'sonner'
import gsap from 'gsap'

export default function ExpertSessionsPage() {
  const [mounted, setMounted] = useState(false)
  const { data: progressData, isLoading: progressLoading } = useJobReadinessProgress()
  
  // Memoize productId to prevent unnecessary re-fetches
  const productId = useMemo(() => {
    return progressData?.products?.[0]?.id || ''
  }, [progressData?.products?.[0]?.id])

  const { data: sessionsData, isLoading: sessionsLoading, error } = useExpertSessions(productId)

  useEffect(() => {
    setMounted(true)
    
    if (!progressLoading && !sessionsLoading && !error) {
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
    }
  }, [progressLoading, sessionsLoading, error])

  if (progressLoading || sessionsLoading) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="container mx-auto py-8 px-4 md:px-0">
          <div className="relative space-y-8">
            <div className="flex flex-col space-y-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                Expert Sessions
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Learn from industry experts through exclusive video sessions
              </p>
            </div>
            
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-muted-foreground">Loading expert sessions...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="container mx-auto py-8 px-4 md:px-0">
          <div className="relative space-y-8">
            <div className="flex flex-col space-y-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                Expert Sessions
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Learn from industry experts through exclusive video sessions
              </p>
            </div>
            
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load expert sessions. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  // Check if module is unlocked (requires star level 2 or higher)
  const currentStars = progressData?.currentStars || 0
  const isUnlocked = currentStars >= 2
  
  // Also check if the module is explicitly unlocked via the modules data
  const isModuleUnlocked = progressData?.modules?.expert_sessions?.unlocked || false
  


  if (!isUnlocked && !isModuleUnlocked) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="container mx-auto py-8 px-4 md:px-0">
          <div className="relative space-y-8">
            <div className="flex flex-col space-y-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                Expert Sessions
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Learn from industry experts through exclusive video sessions
              </p>
            </div>
            
            <PerformantAnimatedCard variant="glass" className="max-w-2xl mx-auto dashboard-card">
              <div className="text-center space-y-6 p-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Expert Sessions Locked</h2>
                  <p className="text-muted-foreground">
                    Complete the Courses module to unlock Expert Sessions
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  You need to achieve <strong>Star 2</strong> by completing the required courses 
                  before you can access expert sessions. Current level: <strong>{currentStars} stars</strong>
                </p>
              </div>
            </PerformantAnimatedCard>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      <div className="container mx-auto py-8 px-4 md:px-0">
        <div className="relative space-y-8">
          <Toaster richColors position="top-right" />
          
          {/* Hero Section */}
          <div className="flex flex-col space-y-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
              Expert Sessions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Learn from industry experts through exclusive video sessions
            </p>
          </div>

          {/* Overall Progress */}
          {sessionsData && (
            <OverallSessionProgress overallProgress={sessionsData.overall_progress} />
          )}

          {/* Sessions List */}
          {sessionsData && (
            <ExpertSessionList sessions={sessionsData.sessions} />
          )}
        </div>
      </div>
    </div>
  )
} 