'use client'

import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Trophy, CheckCircle2, Lock, Play, Eye } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Assessment {
  id: string
  name: string
  type: string
  configuration: {
    pass_threshold: number
    duration_minutes: number
  }
  sequence: number
  is_unlocked: boolean
  is_completed: boolean
  is_tier_determining: boolean
  questions_count: number
  last_score: number | null
  tier_achieved: string | null
}

interface AssessmentCardProps {
  assessment: Assessment
  current_tier?: string | null
  current_star_level?: string | null
  staggerIndex?: number
}

const tierColors = {
  BRONZE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  SILVER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', 
  GOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
}

export function AssessmentCard({ assessment, staggerIndex = 0 }: AssessmentCardProps) {
  const {
    id,
    name,
    configuration,
    is_unlocked,
    is_completed,
    is_tier_determining,
    questions_count,
    last_score,
    tier_achieved
  } = assessment

  const getStatusIcon = () => {
    if (is_completed) return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
    if (!is_unlocked) return <Lock className="h-5 w-5 text-gray-400" />
    return <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  }

  const getStatusText = () => {
    if (is_completed) return 'Completed'
    if (!is_unlocked) return 'Locked'
    return 'Available'
  }

  const getStatusColor = () => {
    if (is_completed) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    if (!is_unlocked) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  }

  const getActionButton = () => {
    if (!is_unlocked) {
      return (
        <AnimatedButton disabled variant="outline" className="w-full opacity-50 min-h-[44px]">
          <Lock className="h-4 w-4 mr-2" />
          Locked
        </AnimatedButton>
      )
    }

    if (is_completed) {
      return (
        <AnimatedButton asChild variant="outline" className="w-full min-h-[44px]">
          <Link href={`/app/job-readiness/assessments/${id}/results`}>
            <Eye className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">View Results</span>
            <span className="sm:hidden">Results</span>
          </Link>
        </AnimatedButton>
      )
    }

    return (
      <AnimatedButton asChild className="w-full bg-gradient-to-r from-primary to-accent min-h-[44px]">
        <Link href={`/app/job-readiness/assessments/${id}`}>
          <Play className="h-4 w-4 mr-2" />
          Start Assessment
        </Link>
      </AnimatedButton>
    )
  }

  const getCardVariant = () => {
    if (is_completed) return 'glass'
    if (!is_unlocked) return 'subtle'
    return 'glass'
  }

  const getHoverEffect = () => {
    if (!is_unlocked) return 'none'
    return 'lift'
  }

  const getProgressValue = () => {
    if (is_completed) return 100
    if (!is_unlocked) return 0
    return 0
  }

  const getProgressColor = () => {
    if (is_completed) return 'success'
    if (!is_unlocked) return 'warning'
    return 'primary'
  }

  return (
    <PerformantAnimatedCard 
      variant={getCardVariant()}
      hoverEffect={getHoverEffect()}
      staggerIndex={staggerIndex}
      className={cn(
        "dashboard-card group h-full transform-gpu p-4 sm:p-6 mx-2 sm:mx-0",
        is_completed && "border-success/20 bg-success/5",
        is_unlocked && !is_completed && "border-primary/20 bg-primary/5",
        !is_unlocked && "border-muted/50 bg-muted/5 opacity-75"
      )}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Progress Ring */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4 flex-1">
            {/* Progress Ring */}
            <div className="flex-shrink-0 pt-1">
              <OptimizedProgressRing
                value={getProgressValue()}
                size={50}
                strokeWidth={3}
                showValue={false}
                color={getProgressColor()}
                delay={400 + staggerIndex * 100}
              />
            </div>
            
            {/* Content */}
            <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <h3 className="text-lg sm:text-xl font-semibold line-clamp-2 leading-tight">{name}</h3>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor()}>
                  {getStatusText()}
                </Badge>
                {is_tier_determining && (
                  <Badge variant="secondary" className="text-xs">
                    <Trophy className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Tier Determining</span>
                    <span className="sm:hidden">Tier</span>
                  </Badge>
                )}
                {tier_achieved && (
                  <Badge className={tierColors[tier_achieved as keyof typeof tierColors]}>
                    <span className="hidden sm:inline">{tier_achieved} Achieved</span>
                    <span className="sm:hidden">{tier_achieved}</span>
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3 leading-relaxed">
                {is_tier_determining 
                  ? 'This assessment determines your tier level and unlocks appropriate content for your skill level.'
                  : 'Standard assessment to evaluate your knowledge and progress.'
                }
              </p>
            </div>
          </div>
          
          {/* Score Display - Mobile: Below content, Desktop: Right side */}
          {last_score !== null && (
            <div className="flex justify-center sm:justify-end">
              <div className="text-center sm:text-right flex-shrink-0 bg-muted/30 sm:bg-transparent rounded-lg p-3 sm:p-0">
                <div className="text-2xl sm:text-3xl font-bold gradient-text">
                  {last_score}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Last Score
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assessment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-3 sm:py-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{questions_count}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent/10 border border-accent/20 flex-shrink-0">
              <Clock className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{configuration.duration_minutes}</div>
              <div className="text-xs text-muted-foreground">Minutes</div>
            </div>
          </div>
        </div>

        {/* Pass Threshold */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-3 rounded-lg bg-muted/30 border border-muted/50">
          <span className="text-sm text-muted-foreground">Passing threshold:</span>
          <span className="font-semibold text-foreground text-sm sm:text-base">
            {configuration.pass_threshold}%
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {getActionButton()}
        </div>

        {/* Completion Message */}
        {is_completed && last_score !== null && (
          <div className={cn(
            "text-center p-3 sm:p-4 rounded-lg border",
            last_score >= configuration.pass_threshold
              ? "bg-success/10 border-success/20 text-success"
              : "bg-warning/10 border-warning/20 text-warning"
          )}>
            <div className="text-sm font-medium leading-relaxed">
              {last_score >= configuration.pass_threshold 
                ? '🎉 Congratulations! You passed this assessment.' 
                : '💪 Keep practicing to improve your skills!'}
            </div>
          </div>
        )}
      </div>
    </PerformantAnimatedCard>
  )
} 