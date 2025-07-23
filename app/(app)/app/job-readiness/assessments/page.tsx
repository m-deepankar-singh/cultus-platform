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
        <div className="relative space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-3 sm:space-y-4 px-3 sm:px-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-full bg-primary/10 border border-primary/20">
                <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight gradient-text order-first sm:order-none">
                Standard Assessments
              </h1>
              <div className="p-2 sm:p-3 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
            </div>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-0 sm:px-2">
              Complete tier-determining assessments to establish your skill level and unlock your learning path. 
              Your performance will determine your initial tier: Bronze, Silver, or Gold.
            </p>
          </div>

          {/* Assessment Information Card */}
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            className="dashboard-card border-primary/20 bg-primary/5 p-4 sm:p-6 mx-2 sm:mx-0"
            staggerIndex={0}
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h3 className="text-lg sm:text-xl font-semibold">About These Assessments</h3>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                These assessments are designed to evaluate your current skill level and place you in the appropriate tier.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-3">
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="font-semibold text-primary text-sm sm:text-base">Assessment Features:</h4>
                  <ul className="space-y-1.5 sm:space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                      <span>Tier-determining questions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                      <span>Multiple choice format</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                      <span>Timed assessments</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                      <span>Immediate results</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="font-semibold text-primary text-sm sm:text-base">What to Expect:</h4>
                  <ul className="space-y-1.5 sm:space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <span>Questions tailored to your background</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <span>60-90 minute time limits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <span>Passing threshold: 60%</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <span>Earn your first star upon completion</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>

          {/* Assessment List */}
          <div>
            <AssessmentList productId={resolvedSearchParams.productId} />
          </div>

          {/* Tier Information */}
          <div>
            <TierDisplay productId={resolvedSearchParams.productId} />
          </div>
        </div>
      </JobReadinessLayout>
    </div>
  )
} 