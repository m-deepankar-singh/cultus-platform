'use client'

import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Trophy, CheckCircle2, Lock, Play, RotateCcw, Eye } from 'lucide-react'
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
        <AnimatedButton disabled variant="outline" className="w-full opacity-50">
          <Lock className="h-4 w-4 mr-2" />
          Locked
        </AnimatedButton>
      )
    }

    if (is_completed) {
      return (
        <div className="flex gap-2">
          <AnimatedButton asChild variant="outline" className="flex-1">
            <Link href={`/app/job-readiness/assessments/${id}/results`}>
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </Link>
          </AnimatedButton>
          <AnimatedButton asChild variant="outline" size="icon">
            <Link href={`/app/job-readiness/assessments/${id}`}>
              <RotateCcw className="h-4 w-4" />
            </Link>
          </AnimatedButton>
        </div>
      )
    }

    return (
      <AnimatedButton asChild className="w-full bg-gradient-to-r from-primary to-accent">
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
        "dashboard-card group h-full transform-gpu",
        is_completed && "border-success/20 bg-success/5",
        is_unlocked && !is_completed && "border-primary/20 bg-primary/5",
        !is_unlocked && "border-muted/50 bg-muted/5 opacity-75"
      )}
    >
      <div className="space-y-6">
        {/* Header with Progress Ring */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
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
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <h3 className="text-xl font-semibold line-clamp-1">{name}</h3>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor()}>
                  {getStatusText()}
                </Badge>
                {is_tier_determining && (
                  <Badge variant="secondary" className="text-xs">
                    <Trophy className="h-3 w-3 mr-1" />
                    Tier Determining
                  </Badge>
                )}
                {tier_achieved && (
                  <Badge className={tierColors[tier_achieved as keyof typeof tierColors]}>
                    {tier_achieved} Achieved
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {is_tier_determining 
                  ? 'This assessment determines your tier level and unlocks appropriate content for your skill level.'
                  : 'Standard assessment to evaluate your knowledge and progress.'
                }
              </p>
            </div>
          </div>
          
          {/* Score Display */}
          {last_score !== null && (
            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-3xl font-bold gradient-text">
                {last_score}%
              </div>
              <div className="text-xs text-muted-foreground">
                Last Score
              </div>
            </div>
          )}
        </div>

        {/* Assessment Details */}
        <div className="grid grid-cols-2 gap-6 py-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">{questions_count}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent/10 border border-accent/20">
              <Clock className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="text-sm font-medium">{configuration.duration_minutes}</div>
              <div className="text-xs text-muted-foreground">Minutes</div>
            </div>
          </div>
        </div>

        {/* Pass Threshold */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-muted/50">
          <span className="text-sm text-muted-foreground">Passing threshold:</span>
          <span className="font-semibold text-foreground">
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
            "text-center p-4 rounded-lg border",
            last_score >= configuration.pass_threshold
              ? "bg-success/10 border-success/20 text-success"
              : "bg-warning/10 border-warning/20 text-warning"
          )}>
            <div className="text-sm font-medium">
              {last_score >= configuration.pass_threshold 
                ? '🎉 Congratulations! You passed this assessment.' 
                : '💪 Keep practicing! You can retake this assessment.'}
            </div>
          </div>
        )}
      </div>
    </PerformantAnimatedCard>
  )
} 