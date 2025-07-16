'use client'

import { useState, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { 
  Clock, Users, Trophy, CheckCircle2, Lock, Play, RotateCcw, Eye,
  Zap, Star, Target, Brain, Sparkles, ArrowRight, Layers
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

interface DimensionalPortalCardProps {
  assessment: Assessment
  current_tier?: string | null
  current_star_level?: string | null
  index?: number
}

const tierColors = {
  BRONZE: {
    primary: 'rgb(251, 146, 60)',
    glow: 'rgba(251, 146, 60, 0.3)',
    gradient: 'from-orange-500/20 to-orange-600/10'
  },
  SILVER: {
    primary: 'rgb(148, 163, 184)',
    glow: 'rgba(148, 163, 184, 0.3)',
    gradient: 'from-slate-400/20 to-slate-500/10'
  },
  GOLD: {
    primary: 'rgb(251, 191, 36)',
    glow: 'rgba(251, 191, 36, 0.3)',
    gradient: 'from-yellow-400/20 to-yellow-500/10'
  }
}

export function DimensionalPortalCard({ 
  assessment, 
  current_tier, 
  current_star_level, 
  index = 0 
}: DimensionalPortalCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPortalActive, setIsPortalActive] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const springConfig = { damping: 25, stiffness: 400 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)
  
  const rotateX = useTransform(y, [-100, 100], [5, -5])
  const rotateY = useTransform(x, [-100, 100], [-5, 5])
  
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
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    mouseX.set(e.clientX - rect.left - centerX)
    mouseY.set(e.clientY - rect.top - centerY)
  }
  
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setIsHovered(false)
    setIsPortalActive(false)
  }
  
  const getStatusConfig = () => {
    if (is_completed) {
      return {
        icon: CheckCircle2,
        text: 'Complete',
        color: 'rgb(34, 197, 94)',
        glow: 'rgba(34, 197, 94, 0.3)',
        gradient: 'from-green-500/20 to-emerald-600/10'
      }
    }
    if (!is_unlocked) {
      return {
        icon: Lock,
        text: 'Locked',
        color: 'rgb(100, 116, 139)',
        glow: 'rgba(100, 116, 139, 0.2)',
        gradient: 'from-slate-500/10 to-slate-600/5'
      }
    }
    return {
      icon: Play,
      text: 'Available',
      color: 'rgb(59, 130, 246)',
      glow: 'rgba(59, 130, 246, 0.3)',
      gradient: 'from-blue-500/20 to-indigo-600/10'
    }
  }
  
  const statusConfig = getStatusConfig()
  const tierConfig = tier_achieved ? tierColors[tier_achieved as keyof typeof tierColors] : null
  
  const portalDepth = isPortalActive ? 8 : 4
  
  return (
    <motion.div
      ref={cardRef}
      className="relative group perspective-1000"
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Portal activation field */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle at center, ${statusConfig.glow} 0%, transparent 70%)`,
        }}
        animate={{
          scale: isHovered ? 1.1 : 1,
          opacity: isHovered ? 0.6 : 0.3
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Main card container */}
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-xl",
          "transition-all duration-500",
          is_completed && "border-green-400/30",
          !is_unlocked && "border-slate-600/30 opacity-75",
          is_unlocked && !is_completed && "border-blue-400/30"
        )}
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(0, 0, 0, 0.8) 0%, 
              rgba(0, 0, 0, 0.6) 50%,
              rgba(0, 0, 0, 0.8) 100%),
            linear-gradient(${statusConfig.gradient})
          `,
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 0 40px ${statusConfig.glow},
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          z: isHovered ? 20 : 0,
        }}
        transition={{ duration: 0.3 }}
        onClick={() => setIsPortalActive(!isPortalActive)}
      >
        
        {/* Card content layers */}
        <div className="relative p-6 space-y-6">
          {/* Header section */}
          <motion.div
            className="space-y-4"
            style={{ transform: `translateZ(${portalDepth}px)` }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <motion.h3 
                  className="text-xl font-bold text-white flex items-center gap-3"
                  animate={{
                    scale: isHovered ? 1.02 : 1
                  }}
                >
                  <motion.div
                    className="p-2 rounded-lg"
                    style={{
                      background: `radial-gradient(circle, ${statusConfig.glow} 0%, transparent 70%)`,
                      border: `1px solid ${statusConfig.color}66`
                    }}
                    animate={{
                      boxShadow: isHovered 
                        ? `0 0 20px ${statusConfig.glow}` 
                        : `0 0 10px ${statusConfig.glow}`
                    }}
                  >
                    <statusConfig.icon 
                      className="w-5 h-5" 
                      style={{ color: statusConfig.color }}
                    />
                  </motion.div>
                  {name}
                </motion.h3>
                
                {/* Status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.div
                    className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
                    style={{
                      background: `${statusConfig.glow}`,
                      color: statusConfig.color,
                      border: `1px solid ${statusConfig.color}66`
                    }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {statusConfig.text}
                  </motion.div>
                  
                  {is_tier_determining && (
                    <motion.div
                      className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border border-yellow-400/30"
                      style={{
                        background: 'rgba(251, 191, 36, 0.2)',
                        color: 'rgb(251, 191, 36)'
                      }}
                      animate={{
                        boxShadow: ['0 0 10px rgba(251, 191, 36, 0.3)', '0 0 20px rgba(251, 191, 36, 0.6)', '0 0 10px rgba(251, 191, 36, 0.3)']
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Trophy className="w-3 h-3 inline mr-1" />
                      Tier Determining
                    </motion.div>
                  )}
                  
                  {tier_achieved && tierConfig && (
                    <motion.div
                      className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
                      style={{
                        background: tierConfig.glow,
                        color: tierConfig.primary,
                        border: `1px solid ${tierConfig.primary}66`
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {tier_achieved} Achieved
                    </motion.div>
                  )}
                </div>
              </div>
              
              {/* Score display */}
              {last_score !== null && (
                <motion.div
                  className="text-right"
                  style={{ transform: `translateZ(${portalDepth * 2}px)` }}
                  animate={{
                    scale: isHovered ? 1.1 : 1
                  }}
                >
                  <motion.div 
                    className="text-3xl font-bold text-white"
                    animate={{
                      textShadow: isHovered 
                        ? `0 0 20px ${statusConfig.color}` 
                        : `0 0 10px ${statusConfig.color}`
                    }}
                  >
                    {last_score}%
                  </motion.div>
                  <div className="text-xs text-gray-400">Last Score</div>
                </motion.div>
              )}
            </div>
          </motion.div>
          
          {/* Assessment description */}
          <motion.p 
            className="text-gray-300 text-sm leading-relaxed"
            style={{ transform: `translateZ(${portalDepth}px)` }}
          >
            {is_tier_determining 
              ? 'Neural pathway assessment that calibrates your learning trajectory and unlocks personalized content streams.'
              : 'Advanced skill validation protocol designed to map your knowledge architecture and optimize learning efficiency.'
            }
          </motion.p>
          
          {/* Assessment metrics */}
          <motion.div
            className="grid grid-cols-2 gap-4 py-4 border-t border-white/10"
            style={{ transform: `translateZ(${portalDepth}px)` }}
          >
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <Brain className="w-4 h-4 text-blue-400" />
              </div>
              <span>{questions_count} Neural Probes</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <span>{configuration.duration_minutes} min Session</span>
            </div>
          </motion.div>
          
          {/* Success threshold */}
          <motion.div
            className="flex items-center justify-between text-sm"
            style={{ transform: `translateZ(${portalDepth}px)` }}
          >
            <span className="text-gray-400">Success Threshold:</span>
            <motion.span 
              className="font-medium text-white"
              animate={{
                textShadow: isHovered ? '0 0 10px rgba(255, 255, 255, 0.5)' : 'none'
              }}
            >
              {configuration.pass_threshold}%
            </motion.span>
          </motion.div>
          
          {/* Action portal */}
          <motion.div
            className="space-y-3"
            style={{ transform: `translateZ(${portalDepth * 2}px)` }}
          >
            {!is_unlocked ? (
              <motion.div
                className="w-full py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-600/30 text-slate-400 text-center backdrop-blur-md"
                whileHover={{ scale: 1.02 }}
              >
                <Lock className="w-4 h-4 inline mr-2" />
                Neural Interface Locked
              </motion.div>
            ) : is_completed ? (
              <div className="flex gap-2">
                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href={`/app/job-readiness/assessments/${id}/results`}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-700/20 border border-green-400/30 text-green-300 font-medium text-center backdrop-blur-md flex items-center justify-center gap-2 hover:from-green-600/30 hover:to-emerald-700/30 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    View Neural Map
                  </Link>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href={`/app/job-readiness/assessments/${id}`}
                    className="py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-600/30 text-slate-300 backdrop-blur-md flex items-center justify-center hover:bg-slate-700/50 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link 
                  href={`/app/job-readiness/assessments/${id}`}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-700/20 border border-blue-400/30 text-blue-300 font-medium text-center backdrop-blur-md flex items-center justify-center gap-2 hover:from-blue-600/30 hover:to-indigo-700/30 transition-all group"
                >
                  <Zap className="w-4 h-4" />
                  Initiate Neural Probe
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            )}
          </motion.div>
          
          {/* Completion celebration */}
          {is_completed && last_score !== null && (
            <motion.div
              className="text-center p-4 rounded-xl backdrop-blur-md"
              style={{
                background: last_score >= configuration.pass_threshold
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                border: last_score >= configuration.pass_threshold
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
                transform: `translateZ(${portalDepth}px)`
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div 
                className={cn(
                  "text-sm font-medium",
                  last_score >= configuration.pass_threshold ? "text-green-300" : "text-red-300"
                )}
                animate={{
                  textShadow: last_score >= configuration.pass_threshold
                    ? ['0 0 10px rgba(34, 197, 94, 0.5)', '0 0 20px rgba(34, 197, 94, 0.8)', '0 0 10px rgba(34, 197, 94, 0.5)']
                    : 'none'
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {last_score >= configuration.pass_threshold 
                  ? '🌟 Neural pathways successfully mapped! Advancement protocol unlocked.' 
                  : '⚡ Recalibration recommended. Neural mapping can be repeated for optimization.'}
              </motion.div>
            </motion.div>
          )}
        </div>
        
        {/* Portal depth layers */}
        {isPortalActive && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-2 rounded-xl border border-white/10"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ 
                  opacity: [0, 0.3, 0],
                  scale: [1, 1.1, 1.2]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}