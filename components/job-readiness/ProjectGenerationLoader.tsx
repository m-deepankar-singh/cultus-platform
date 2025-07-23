'use client'

import { useState, useEffect } from 'react'
import { Loader2, Brain, Code, Lightbulb, Sparkles } from 'lucide-react'
import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'

interface ProjectGenerationLoaderProps {
  className?: string
}

const LOADING_PHASES = [
  {
    duration: 0,
    icon: Brain,
    title: "Analyzing your background...",
    description: "Understanding your skills and experience level",
    color: "text-blue-500"
  },
  {
    duration: 5000, // 5 seconds
    icon: Code,
    title: "Crafting your personalized project...",
    description: "Creating tasks that match your tier level",
    color: "text-purple-500"
  },
  {
    duration: 15000, // 15 seconds
    icon: Lightbulb,
    title: "Adding creative touches...",
    description: "This is taking longer than usual, but we're creating something special",
    color: "text-amber-500"
  },
  {
    duration: 25000, // 25 seconds
    icon: Sparkles,
    title: "Almost ready...",
    description: "Finalizing your unique project details",
    color: "text-green-500"
  }
]

export function ProjectGenerationLoader({ className }: ProjectGenerationLoaderProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      // Find the appropriate phase based on elapsed time
      let newPhase = 0
      for (let i = LOADING_PHASES.length - 1; i >= 0; i--) {
        if (elapsed >= LOADING_PHASES[i].duration) {
          newPhase = i
          break
        }
      }
      
      setCurrentPhase(newPhase)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const phase = LOADING_PHASES[currentPhase]
  const IconComponent = phase.icon

  return (
    <PerformantAnimatedCard variant="glass" className={`dashboard-card ${className}`}>
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-6 max-w-md">
          {/* Animated icon */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <IconComponent className={`h-12 w-12 mx-auto ${phase.color} opacity-75`} />
            </div>
            <IconComponent className={`h-12 w-12 mx-auto ${phase.color} relative z-10`} />
          </div>

          {/* Loading spinner */}
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />

          {/* Phase-specific content */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{phase.title}</h3>
            <p className="text-muted-foreground text-sm">{phase.description}</p>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-center space-x-1">
              {LOADING_PHASES.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all duration-500 ${
                    index <= currentPhase 
                      ? 'bg-primary scale-110' 
                      : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              AI is working hard to create your perfect project
            </p>
          </div>

          {/* Skeleton preview */}
          <div className="mt-8 space-y-3 text-left">
            <div className="h-4 bg-muted/50 rounded animate-pulse" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted/30 rounded animate-pulse w-1/2" />
            <div className="space-y-2 mt-4">
              <div className="h-2 bg-muted/20 rounded animate-pulse" />
              <div className="h-2 bg-muted/20 rounded animate-pulse w-5/6" />
              <div className="h-2 bg-muted/20 rounded animate-pulse w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </PerformantAnimatedCard>
  )
}