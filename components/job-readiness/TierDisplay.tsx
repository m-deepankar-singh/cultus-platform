'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card'
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring'
import { useAssessmentList } from '@/hooks/useAssessmentList'
import { Medal, Trophy, Star, Target, Clock, CheckCircle, Crown, Award } from 'lucide-react'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { cn } from '@/lib/utils'

const tierConfigs = {
  BRONZE: {
    name: 'Bronze',
    colors: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      accent: 'text-orange-600 dark:text-orange-400',
      ring: 'danger' as const,
      gradient: 'from-orange-400 to-orange-600'
    },
    icon: Medal,
    description: 'Entry level',
  },
  SILVER: {
    name: 'Silver',
    colors: {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-800 dark:text-gray-300',
      accent: 'text-gray-600 dark:text-gray-400',
      ring: 'primary' as const,
      gradient: 'from-gray-400 to-gray-600'
    },
    icon: Trophy,
    description: 'Intermediate',
  },
  GOLD: {
    name: 'Gold',
    colors: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      accent: 'text-yellow-600 dark:text-yellow-400',
      ring: 'warning' as const,
      gradient: 'from-yellow-400 to-yellow-600'
    },
    icon: Crown,
    description: 'Advanced',
  }
}

interface TierDisplayProps {
  productId?: string
}

export function TierDisplay({ productId: providedProductId }: TierDisplayProps = {}) {
  const { data: progress } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const productId = providedProductId || fallbackProductId
  const { data: assessmentData } = useAssessmentList(productId || '')
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!assessmentData) {
    return (
      <PerformantAnimatedCard variant="glass" className="animate-pulse">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-16 w-16 bg-muted rounded-full mx-auto"></div>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </PerformantAnimatedCard>
    )
  }

  const { 
    tier_criteria, 
    current_tier, 
    all_assessments_complete = false,
    completed_assessments_count = 0,
    total_assessments_count = 0
  } = assessmentData

  const hasAssessments = total_assessments_count > 0
  const progressPercentage = hasAssessments ? Math.round((completed_assessments_count / total_assessments_count) * 100) : 0

  // Provide fallback for tier_criteria if it's undefined or null
  const safeTierCriteria = tier_criteria || {
    bronze: { min_score: 0, max_score: 60 },
    silver: { min_score: 61, max_score: 80 },
    gold: { min_score: 81, max_score: 100 }
  }
  
  const currentTierConfig = current_tier ? tierConfigs[current_tier as keyof typeof tierConfigs] : null

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Tier System</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your tier is determined by assessment scores and affects content difficulty, not star progression
        </p>
      </div>

      {/* Current Tier Status */}
      {all_assessments_complete && current_tier && (
        <PerformantAnimatedCard 
          variant="glass" 
          className={cn(
            "relative overflow-hidden",
            currentTierConfig?.colors.bg
          )}
        >
          <div className="p-8 text-center space-y-6">
            <div className="space-y-4">
              <div className="relative inline-block">
                <OptimizedProgressRing
                  value={100}
                  size={120}
                  strokeWidth={6}
                  showValue={false}
                  color={currentTierConfig?.colors.ring || 'primary'}
                  delay={300}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn(
                    "p-4 rounded-full",
                    currentTierConfig?.colors.bg
                  )}>
                    {currentTierConfig && (
                      <currentTierConfig.icon className={cn("w-12 h-12", currentTierConfig.colors.text)} />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-bold">
                  {currentTierConfig?.name} Tier
                </h3>
                <p className={cn("text-lg", currentTierConfig?.colors.text)}>
                  Content difficulty: {currentTierConfig?.description}
                </p>
              </div>
            </div>
          </div>
        </PerformantAnimatedCard>
      )}

      {/* Enhanced Tier Goals Display */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-center">Tier Requirements</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {Object.entries(safeTierCriteria).map(([tier, criteria], index) => {
            const tierName = tier.toUpperCase() as keyof typeof tierConfigs
            const tierConfig = tierConfigs[tierName]
            const isCurrentTier = all_assessments_complete && current_tier === tierName
            const isAchieved = isCurrentTier
            
            return (
              <PerformantAnimatedCard
                key={tier}
                variant="glass"
                staggerIndex={index}
                className={cn(
                  "relative overflow-hidden",
                  isCurrentTier && "ring-2 ring-primary/50",
                  tierConfig.colors.bg
                )}
              >
                
                <div className="p-4 sm:p-6 lg:p-8 text-center space-y-4 sm:space-y-6">
                  {/* Tier Icon with Progress Ring - Centered */}
                  <div className="flex justify-center">
                    <div className="relative inline-block">
                      <OptimizedProgressRing
                        value={isAchieved ? 100 : 0}
                        size={80}
                        strokeWidth={4}
                        showValue={false}
                        color={tierConfig.colors.ring}
                        delay={600 + index * 200}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={cn(
                          "p-3 rounded-full transition-all duration-300",
                          isAchieved 
                            ? `bg-gradient-to-br ${tierConfig.colors.gradient} shadow-lg`
                            : "bg-muted"
                        )}>
                          <tierConfig.icon className={cn(
                            "w-6 h-6 transition-all duration-300",
                            isAchieved ? "text-white" : "text-muted-foreground"
                          )} />
                        </div>
                      </div>
                      
                      {isAchieved && (
                        <div className="absolute -top-2 -right-2">
                          <CheckCircle className="w-6 h-6 text-success bg-background rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className={cn(
                      "text-lg font-semibold flex items-center justify-center gap-2",
                      tierConfig.colors.text
                    )}>
                      <span className="capitalize">{tier}</span>
                      {isAchieved && (
                        <Badge variant="secondary" className="text-xs">
                          Achieved
                        </Badge>
                      )}
                    </h4>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Score Range: {criteria.min_score}% - {criteria.max_score}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Content difficulty: {tierConfig.description}
                      </p>
                    </div>
                    
                    {!all_assessments_complete && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Complete assessments to determine your tier
                      </p>
                    )}
                  </div>
                </div>
              </PerformantAnimatedCard>
            )
          })}
        </div>
      </div>

      {/* Help Section */}
      {!all_assessments_complete && hasAssessments && (
        <PerformantAnimatedCard variant="subtle" className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Target className="h-6 w-6 text-primary mt-1" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-lg">How Tier Assignment Works</h4>
              <p className="text-sm text-muted-foreground">
                Your tier is determined by your assessment performance and sets the difficulty level for all program content. 
                All learners follow the same 5-star progression path regardless of their tier - Bronze, Silver, and Gold 
                learners just experience content tailored to their skill level.
              </p>
            </div>
          </div>
        </PerformantAnimatedCard>
      )}

      {/* Initial State - No Assessments */}
      {!hasAssessments && (
        <PerformantAnimatedCard variant="glass" className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-lg mb-2">Ready to Get Started?</h4>
              <p className="text-sm text-muted-foreground">
                Take assessments to determine your tier level and begin your Job Readiness journey with content matched to your skill level.
              </p>
            </div>
          </div>
        </PerformantAnimatedCard>
      )}
    </div>
  )
} 