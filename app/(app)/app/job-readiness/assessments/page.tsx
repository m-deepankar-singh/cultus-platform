"use client"

import { useState, useEffect } from 'react'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { AssessmentList } from '@/components/job-readiness/AssessmentList'
import { TierDisplay } from '@/components/job-readiness/TierDisplay'
import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { AdaptiveParticles } from '@/components/ui/floating-particles'
import { GraduationCap, Trophy } from 'lucide-react'
import gsap from 'gsap'

interface SearchParams {
  productId?: string
}

export default function AssessmentsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const [mounted, setMounted] = useState(false)
  const [resolvedSearchParams, setResolvedSearchParams] = useState<SearchParams>({})
  
  useEffect(() => {
    setMounted(true)
    searchParams.then(setResolvedSearchParams)
    
    // GSAP animations for staggered entry
    if (mounted) {
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
  }, [mounted, searchParams])

  return (
    <div className="relative min-h-screen">
      {/* Background particles */}
      <AdaptiveParticles />
      
      <JobReadinessLayout>
        <div className="relative space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                Standard Assessments
              </h1>
              <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Complete tier-determining assessments to establish your skill level and unlock your learning path. 
              Your performance will determine your initial tier: Bronze, Silver, or Gold.
            </p>
          </div>

          {/* Assessment Information Card */}
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            className="dashboard-card border-primary/20 bg-primary/5"
            staggerIndex={0}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">About These Assessments</h3>
              </div>
              <p className="text-muted-foreground">
                These assessments are designed to evaluate your current skill level and place you in the appropriate tier.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">Assessment Features:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Tier-determining questions
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Multiple choice format
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Timed assessments
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Immediate results
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-primary">What to Expect:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      Questions tailored to your background
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      60-90 minute time limits
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      Passing threshold: 60%
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      Earn your first star upon completion
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>

          {/* Assessment List */}
          <div className="dashboard-card">
            <AssessmentList productId={resolvedSearchParams.productId} />
          </div>

          {/* Tier Information */}
          <div className="dashboard-card">
            <TierDisplay productId={resolvedSearchParams.productId} />
          </div>
        </div>
      </JobReadinessLayout>
    </div>
  )
} 