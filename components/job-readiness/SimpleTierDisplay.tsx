'use client'

import { useState, useEffect } from 'react'
import { Medal, Trophy, Crown, Star, Target, CheckCircle } from 'lucide-react'
import { useAssessmentList } from '@/hooks/useAssessmentList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { cn } from '@/lib/utils'

interface TierData {
  name: string
  key: 'BRONZE' | 'SILVER' | 'GOLD'
  colors: {
    primary: string
    bg: string
    border: string
  }
  icon: typeof Medal
  description: string
  scoreRange: { min: number; max: number }
}

const tierConfigs: TierData[] = [
  {
    name: 'Bronze',
    key: 'BRONZE',
    colors: {
      primary: 'rgb(251, 146, 60)',
      bg: 'rgba(251, 146, 60, 0.1)',
      border: 'rgba(251, 146, 60, 0.3)'
    },
    icon: Medal,
    description: 'Foundation Level',
    scoreRange: { min: 0, max: 60 }
  },
  {
    name: 'Silver',
    key: 'SILVER',
    colors: {
      primary: 'rgb(148, 163, 184)',
      bg: 'rgba(148, 163, 184, 0.1)',
      border: 'rgba(148, 163, 184, 0.3)'
    },
    icon: Trophy,
    description: 'Intermediate Level',
    scoreRange: { min: 61, max: 80 }
  },
  {
    name: 'Gold',
    key: 'GOLD',
    colors: {
      primary: 'rgb(251, 191, 36)',
      bg: 'rgba(251, 191, 36, 0.1)',
      border: 'rgba(251, 191, 36, 0.3)'
    },
    icon: Crown,
    description: 'Advanced Level',
    scoreRange: { min: 81, max: 100 }
  }
]

interface SimpleTierDisplayProps {
  currentTier?: string | null
  assessmentComplete?: boolean
  completionPercentage?: number
  tierCriteria?: any
  productId?: string
}

export function SimpleTierDisplay({
  currentTier,
  assessmentComplete = false,
  completionPercentage = 0,
  tierCriteria,
  productId
}: SimpleTierDisplayProps) {
  const { data: progress } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const finalProductId = productId || fallbackProductId
  const { data: assessmentData } = useAssessmentList(finalProductId || '')
  
  const currentTierConfig = currentTier ? tierConfigs.find(t => t.key === currentTier) : null
  
  const { 
    tier_criteria, 
    current_tier, 
    all_assessments_complete = false,
    completed_assessments_count = 0,
    total_assessments_count = 0
  } = assessmentData || {}

  const hasAssessments = total_assessments_count > 0
  const progressPercentage = hasAssessments ? Math.round((completed_assessments_count / total_assessments_count) * 100) : 0

  const safeTierCriteria = tier_criteria || {
    bronze: { min_score: 0, max_score: 60 },
    silver: { min_score: 61, max_score: 80 },
    gold: { min_score: 81, max_score: 100 }
  }
  
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Target className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-semibold text-white">Tier System</h2>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Your tier is determined by assessment scores and affects content difficulty
        </p>
      </div>

      {/* Current Tier Status */}
      {all_assessments_complete && current_tier && currentTierConfig && (
        <div 
          className="relative overflow-hidden rounded-2xl border backdrop-blur-xl p-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${currentTierConfig.colors.bg} 0%, rgba(0, 0, 0, 0.8) 100%)`,
            borderColor: currentTierConfig.colors.border,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${currentTierConfig.colors.border}`
          }}
        >
          <div className="space-y-6">
            <div className="relative inline-block">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center border-2"
                style={{
                  background: currentTierConfig.colors.bg,
                  borderColor: currentTierConfig.colors.border
                }}
              >
                <currentTierConfig.icon 
                  className="w-12 h-12" 
                  style={{ color: currentTierConfig.colors.primary }}
                />
              </div>
              
              <div className="absolute -top-2 -right-2">
                <CheckCircle className="w-8 h-8 text-green-400 bg-slate-900 rounded-full" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-white">
                {currentTierConfig.name} Tier
              </h3>
              <p 
                className="text-lg"
                style={{ color: currentTierConfig.colors.primary }}
              >
                Content difficulty: {currentTierConfig.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tier Requirements */}
      <div className="space-y-8">
        <h3 className="text-xl font-semibold text-center text-white">Tier Requirements</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(safeTierCriteria).map(([tier, criteria]) => {
            const tierName = tier.toUpperCase() as keyof typeof tierConfigs
            const tierConfig = tierConfigs.find(t => t.key === tierName)
            if (!tierConfig) return null
            
            const isCurrentTier = all_assessments_complete && current_tier === tierName
            const isAchieved = isCurrentTier
            
            return (
              <div
                key={tier}
                className={cn(
                  "relative overflow-hidden rounded-2xl border backdrop-blur-xl p-6 text-center transition-all duration-300",
                  isCurrentTier && "ring-2 ring-blue-400/50"
                )}
                style={{
                  background: `linear-gradient(135deg, ${tierConfig.colors.bg} 0%, rgba(0, 0, 0, 0.8) 100%)`,
                  borderColor: tierConfig.colors.border,
                  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${tierConfig.colors.border}`
                }}
              >
                <div className="space-y-4">
                  {/* Tier Icon */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                        style={{
                          background: isAchieved 
                            ? `linear-gradient(135deg, ${tierConfig.colors.primary}, ${tierConfig.colors.primary}dd)`
                            : tierConfig.colors.bg,
                          borderColor: tierConfig.colors.border,
                          boxShadow: isAchieved ? `0 0 20px ${tierConfig.colors.primary}44` : 'none'
                        }}
                      >
                        <tierConfig.icon 
                          className="w-8 h-8"
                          style={{ 
                            color: isAchieved ? 'white' : tierConfig.colors.primary
                          }}
                        />
                      </div>
                      
                      {isAchieved && (
                        <div className="absolute -top-2 -right-2">
                          <CheckCircle className="w-6 h-6 text-green-400 bg-slate-900 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 
                      className="text-lg font-semibold flex items-center justify-center gap-2"
                      style={{ color: tierConfig.colors.primary }}
                    >
                      <span className="capitalize">{tier}</span>
                      {isAchieved && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-400/20 text-green-400 border border-green-400/30">
                          Achieved
                        </span>
                      )}
                    </h4>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">
                        Score Range: {criteria.min_score}% - {criteria.max_score}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {tierConfig.description}
                      </p>
                    </div>
                    
                    {!all_assessments_complete && (
                      <p className="text-xs text-amber-400 font-medium">
                        Complete assessments to determine your tier
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Help Section */}
      {!all_assessments_complete && hasAssessments && (
        <div className="p-6 rounded-2xl backdrop-blur-xl border border-blue-400/30 bg-blue-400/5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Target className="h-6 w-6 text-blue-400 mt-1" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-lg text-white">How Tier Assignment Works</h4>
              <p className="text-sm text-gray-300">
                Your tier is determined by your assessment performance and sets the difficulty level for all program content. 
                All learners follow the same progression path regardless of their tier - Bronze, Silver, and Gold 
                learners just experience content tailored to their skill level.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Initial State - No Assessments */}
      {!hasAssessments && (
        <div className="p-8 rounded-2xl backdrop-blur-xl border border-blue-400/30 bg-blue-400/5 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-400/20 flex items-center justify-center border border-blue-400/30">
              <Target className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-lg mb-2 text-white">Ready to Get Started?</h4>
              <p className="text-sm text-gray-300">
                Take assessments to determine your tier level and begin your learning journey with content matched to your skill level.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}