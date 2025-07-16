'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useAnimation } from 'framer-motion'
import { Medal, Trophy, Crown, Sparkles, Zap, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TierData {
  name: string
  key: 'BRONZE' | 'SILVER' | 'GOLD'
  colors: {
    primary: string
    secondary: string
    glow: string
    particle: string
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
      secondary: 'rgb(217, 119, 6)',
      glow: 'rgba(251, 146, 60, 0.4)',
      particle: 'rgb(253, 186, 116)'
    },
    icon: Medal,
    description: 'Foundation Explorer',
    scoreRange: { min: 0, max: 60 }
  },
  {
    name: 'Silver',
    key: 'SILVER',
    colors: {
      primary: 'rgb(148, 163, 184)',
      secondary: 'rgb(100, 116, 139)',
      glow: 'rgba(148, 163, 184, 0.4)',
      particle: 'rgb(203, 213, 225)'
    },
    icon: Trophy,
    description: 'Skill Architect',
    scoreRange: { min: 61, max: 80 }
  },
  {
    name: 'Gold',
    key: 'GOLD',
    colors: {
      primary: 'rgb(251, 191, 36)',
      secondary: 'rgb(217, 119, 6)',
      glow: 'rgba(251, 191, 36, 0.4)',
      particle: 'rgb(254, 240, 138)'
    },
    icon: Crown,
    description: 'Mastery Vanguard',
    scoreRange: { min: 81, max: 100 }
  }
]

interface HolographicTierDisplayProps {
  currentTier?: string | null
  assessmentComplete?: boolean
  completionPercentage?: number
  tierCriteria?: any
}

export function HolographicTierDisplay({
  currentTier,
  assessmentComplete = false,
  completionPercentage = 0,
  tierCriteria
}: HolographicTierDisplayProps) {
  const [selectedTier, setSelectedTier] = useState<TierData | null>(null)
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()
  
  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2
    }))
    setParticles(newParticles)
  }, [])
  
  useEffect(() => {
    if (assessmentComplete && currentTier) {
      controls.start("celebration")
    }
  }, [assessmentComplete, currentTier, controls])
  
  const ParticleField = ({ tierConfig }: { tierConfig: TierData }) => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: tierConfig.colors.particle,
            boxShadow: `0 0 6px ${tierConfig.colors.glow}`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
  
  const TierMedallion = ({ tier, index }: { tier: TierData; index: number }) => {
    const isActive = currentTier === tier.key
    const isAchieved = assessmentComplete && isActive
    const isHovered = selectedTier?.key === tier.key
    
    return (
      <motion.div
        className="relative group cursor-pointer"
        initial={{ opacity: 0, scale: 0, rotateY: 180 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          rotateY: 0,
          y: isHovered ? -10 : 0
        }}
        transition={{ 
          duration: 0.8, 
          delay: index * 0.2,
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
        whileHover={{ 
          scale: 1.05,
          rotateY: 5,
          z: 50
        }}
        onHoverStart={() => setSelectedTier(tier)}
        onHoverEnd={() => setSelectedTier(null)}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Floating particle field for this tier */}
        {isHovered && <ParticleField tierConfig={tier} />}
        
        {/* Main medallion container */}
        <div 
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center",
            "transition-all duration-500",
            isActive && "ring-4 ring-white/30"
          )}
          style={{
            background: `
              conic-gradient(from 0deg,
                ${tier.colors.primary}22 0%,
                ${tier.colors.secondary}44 25%,
                ${tier.colors.primary}66 50%,
                ${tier.colors.secondary}88 75%,
                ${tier.colors.primary}22 100%)
            `,
            boxShadow: `
              0 0 40px ${tier.colors.glow},
              inset 0 0 40px ${tier.colors.glow}
            `
          }}
        >
          {/* Rotating inner glow */}
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${tier.colors.glow} 0%, transparent 70%)`,
            }}
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Icon container */}
          <motion.div
            className="relative z-10 p-6 rounded-full backdrop-blur-sm"
            style={{
              background: `rgba(0, 0, 0, 0.3)`,
              border: `2px solid ${tier.colors.primary}66`
            }}
            animate={isAchieved ? {
              scale: [1, 1.1, 1],
              rotate: [0, 360]
            } : {}}
            transition={{
              duration: 2,
              repeat: isAchieved ? Infinity : 0,
              repeatDelay: 3
            }}
          >
            <tier.icon 
              className="w-8 h-8" 
              style={{ color: tier.colors.primary }}
            />
          </motion.div>
          
          {/* Achievement pulse */}
          {isAchieved && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${tier.colors.glow} 0%, transparent 70%)`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.8, 0, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
          
          {/* Sparkle effects for achieved tier */}
          {isAchieved && (
            <div className="absolute inset-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `rotate(${i * 45}deg) translateY(-40px)`
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles 
                    className="w-3 h-3" 
                    style={{ color: tier.colors.primary }}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        {/* Tier information panel */}
        <motion.div
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 min-w-max"
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: isHovered ? 1 : 0, 
            y: isHovered ? 0 : 10 
          }}
          transition={{ duration: 0.3 }}
          style={{ transformStyle: 'preserve-3d', transform: 'translateZ(20px)' }}
        >
          <div 
            className="px-4 py-3 rounded-lg backdrop-blur-md border border-white/20"
            style={{
              background: `linear-gradient(135deg, 
                ${tier.colors.primary}20 0%, 
                rgba(0, 0, 0, 0.8) 100%)`,
              boxShadow: `0 8px 32px ${tier.colors.glow}`
            }}
          >
            <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
            <p className="text-sm text-gray-300 mb-2">{tier.description}</p>
            <div className="text-xs text-gray-400">
              Score: {tier.scoreRange.min}% - {tier.scoreRange.max}%
            </div>
            {isActive && (
              <motion.div
                className="flex items-center gap-1 mt-2 text-xs"
                style={{ color: tier.colors.primary }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Star className="w-3 h-3" />
                <span>Current Tier</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    )
  }
  
  return (
    <div ref={containerRef} className="relative py-16">
      {/* Section header */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h2 
          className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-4"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
          }}
          style={{
            backgroundSize: "200% 200%"
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          Tier Constellation
        </motion.h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Your mastery level determines content complexity and unlocks specialized learning pathways
        </p>
      </motion.div>
      
      {/* Tier medallions arranged in constellation */}
      <div className="flex justify-center items-center gap-16 mb-12">
        {tierConfigs.map((tier, index) => (
          <TierMedallion key={tier.key} tier={tier} index={index} />
        ))}
      </div>
      
      {/* Progress indicator */}
      {!assessmentComplete && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-5 h-5 text-blue-400" />
            </motion.div>
            <span className="text-white font-medium">
              Complete assessments to unlock your tier designation
            </span>
          </div>
        </motion.div>
      )}
      
      {/* Celebration mode overlay */}
      {assessmentComplete && currentTier && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          variants={{
            celebration: {
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 1]
            }
          }}
          animate={controls}
          transition={{ duration: 3, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent" />
        </motion.div>
      )}
    </div>
  )
}