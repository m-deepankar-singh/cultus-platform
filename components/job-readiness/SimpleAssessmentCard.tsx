'use client'

import { 
  Clock, Users, Trophy, CheckCircle2, Lock, Play, Eye,
  Star, Brain, ArrowRight
} from 'lucide-react'
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

interface SimpleAssessmentCardProps {
  assessment: Assessment
  current_tier?: string | null
  current_star_level?: string | null
  index?: number
}

const tierColors = {
  BRONZE: {
    primary: 'rgb(251, 146, 60)',
    bg: 'rgba(251, 146, 60, 0.1)',
    border: 'rgba(251, 146, 60, 0.3)'
  },
  SILVER: {
    primary: 'rgb(148, 163, 184)',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.3)'
  },
  GOLD: {
    primary: 'rgb(251, 191, 36)',
    bg: 'rgba(251, 191, 36, 0.1)',
    border: 'rgba(251, 191, 36, 0.3)'
  }
}

export function SimpleAssessmentCard({ 
  assessment, 
  current_tier, 
  current_star_level, 
  index = 0 
}: SimpleAssessmentCardProps) {
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
  
  const getStatusConfig = () => {
    if (is_completed) {
      return {
        icon: CheckCircle2,
        text: 'Complete',
        color: 'rgb(34, 197, 94)',
        bg: 'rgba(34, 197, 94, 0.1)',
        border: 'rgba(34, 197, 94, 0.3)'
      }
    }
    if (!is_unlocked) {
      return {
        icon: Lock,
        text: 'Locked',
        color: 'rgb(100, 116, 139)',
        bg: 'rgba(100, 116, 139, 0.1)',
        border: 'rgba(100, 116, 139, 0.3)'
      }
    }
    return {
      icon: Play,
      text: 'Available',
      color: 'rgb(59, 130, 246)',
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)'
    }
  }
  
  const statusConfig = getStatusConfig()
  const tierConfig = tier_achieved ? tierColors[tier_achieved as keyof typeof tierColors] : null
  
  return (
    <div className="relative group">
      {/* Main card container */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300",
          "hover:border-opacity-60 hover:shadow-lg",
          is_completed && "border-green-400/30",
          !is_unlocked && "border-slate-600/30 opacity-75",
          is_unlocked && !is_completed && "border-blue-400/30"
        )}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(0, 0, 0, 0.8) 0%, 
              rgba(0, 0, 0, 0.6) 50%,
              rgba(0, 0, 0, 0.8) 100%)
          `,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${statusConfig.border}`,
        }}
      >
        {/* Card content */}
        <div className="relative p-6 space-y-6">
          {/* Header section */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg border"
                    style={{
                      background: statusConfig.bg,
                      borderColor: statusConfig.border
                    }}
                  >
                    <statusConfig.icon 
                      className="w-5 h-5" 
                      style={{ color: statusConfig.color }}
                    />
                  </div>
                  {name}
                </h3>
                
                {/* Status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border"
                    style={{
                      background: statusConfig.bg,
                      color: statusConfig.color,
                      borderColor: statusConfig.border
                    }}
                  >
                    {statusConfig.text}
                  </div>
                  
                  {is_tier_determining && (
                    <div
                      className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border"
                      style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        color: 'rgb(251, 191, 36)',
                        borderColor: 'rgba(251, 191, 36, 0.3)'
                      }}
                    >
                      <Trophy className="w-3 h-3 inline mr-1" />
                      Tier Determining
                    </div>
                  )}
                  
                  {tier_achieved && tierConfig && (
                    <div
                      className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border"
                      style={{
                        background: tierConfig.bg,
                        color: tierConfig.primary,
                        borderColor: tierConfig.border
                      }}
                    >
                      {tier_achieved} Achieved
                    </div>
                  )}
                </div>
              </div>
              
              {/* Score display */}
              {last_score !== null && (
                <div className="text-right">
                  <div 
                    className="text-3xl font-bold text-white"
                    style={{
                      textShadow: `0 0 10px ${statusConfig.color}`
                    }}
                  >
                    {last_score}%
                  </div>
                  <div className="text-xs text-gray-400">Last Score</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Assessment description */}
          <p className="text-gray-300 text-sm leading-relaxed">
            {is_tier_determining 
              ? 'This assessment determines your tier level and unlocks appropriate content for your skill level.'
              : 'Standard assessment to evaluate your knowledge and progress in this subject area.'
            }
          </p>
          
          {/* Assessment metrics */}
          <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <Brain className="w-4 h-4 text-blue-400" />
              </div>
              <span>{questions_count} Questions</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <span>{configuration.duration_minutes} min</span>
            </div>
          </div>
          
          {/* Success threshold */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Passing Score:</span>
            <span className="font-medium text-white">
              {configuration.pass_threshold}%
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            {!is_unlocked ? (
              <div className="w-full py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-600/30 text-slate-400 text-center backdrop-blur-md">
                <Lock className="w-4 h-4 inline mr-2" />
                Assessment Locked
              </div>
            ) : is_completed ? (
              <Link 
                href={`/app/job-readiness/assessments/${id}/results`}
                className="w-full py-3 px-4 rounded-xl border text-center backdrop-blur-md flex items-center justify-center gap-2 transition-all hover:bg-white/5"
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderColor: 'rgba(34, 197, 94, 0.3)',
                  color: 'rgb(34, 197, 94)'
                }}
              >
                <Eye className="w-4 h-4" />
                View Results
              </Link>
            ) : (
              <Link 
                href={`/app/job-readiness/assessments/${id}`}
                className="w-full py-3 px-4 rounded-xl border text-center backdrop-blur-md flex items-center justify-center gap-2 transition-all hover:bg-white/5 group"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                  color: 'rgb(59, 130, 246)'
                }}
              >
                <Play className="w-4 h-4" />
                Start Assessment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
          
          {/* Completion message */}
          {is_completed && last_score !== null && (
            <div
              className="text-center p-4 rounded-xl backdrop-blur-md border"
              style={{
                background: last_score >= configuration.pass_threshold
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                borderColor: last_score >= configuration.pass_threshold
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <div 
                className={cn(
                  "text-sm font-medium",
                  last_score >= configuration.pass_threshold ? "text-green-300" : "text-red-300"
                )}
              >
                {last_score >= configuration.pass_threshold 
                  ? '🎉 Congratulations! You passed this assessment.' 
                  : '💪 Keep practicing to improve your skills!'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}