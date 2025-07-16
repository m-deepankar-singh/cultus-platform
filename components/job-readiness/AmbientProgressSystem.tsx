'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, useAnimation } from 'framer-motion'

interface AmbientProgressSystemProps {
  tier?: string | null
  completionPercentage?: number
  assessmentActive?: boolean
  timeOfDay?: 'dawn' | 'day' | 'dusk' | 'night'
  cognitiveLoad?: 'low' | 'medium' | 'high'
}

interface AmbientState {
  primaryHue: number
  saturation: number
  lightness: number
  intensity: number
  pulseRate: number
  particleDensity: number
  energyLevel: number
}

export function AmbientProgressSystem({
  tier,
  completionPercentage = 0,
  assessmentActive = false,
  timeOfDay = 'day',
  cognitiveLoad = 'medium'
}: AmbientProgressSystemProps) {
  const [ambientState, setAmbientState] = useState<AmbientState>({
    primaryHue: 240,
    saturation: 60,
    lightness: 20,
    intensity: 0.3,
    pulseRate: 4000,
    particleDensity: 0.3,
    energyLevel: 0.5
  })
  
  const [timeBasedAdjustments, setTimeBasedAdjustments] = useState({
    temperature: 6500,
    ambientBrightness: 0.8
  })
  
  const controls = useAnimation()
  
  // Calculate adaptive ambient state based on inputs
  const calculateAmbientState = useCallback((): AmbientState => {
    let baseHue = 240 // Default blue
    let baseSaturation = 60
    const baseLightness = 20
    let baseIntensity = 0.3
    
    // Tier-based color adjustment
    switch (tier) {
      case 'BRONZE':
        baseHue = 25 // Orange
        baseSaturation = 70
        baseIntensity = 0.4
        break
      case 'SILVER':
        baseHue = 220 // Blue-gray
        baseSaturation = 40
        baseIntensity = 0.35
        break
      case 'GOLD':
        baseHue = 45 // Gold
        baseSaturation = 80
        baseIntensity = 0.5
        break
    }
    
    // Progress-based intensity scaling
    const progressMultiplier = Math.max(0.3, completionPercentage / 100)
    const adjustedIntensity = baseIntensity * (0.5 + progressMultiplier)
    
    // Assessment activity boost
    const activityMultiplier = assessmentActive ? 1.5 : 1
    
    // Cognitive load affects pulse rate and particle density
    const loadAdjustments = {
      low: { pulseRate: 6000, particleDensity: 0.2 },
      medium: { pulseRate: 4000, particleDensity: 0.3 },
      high: { pulseRate: 2000, particleDensity: 0.5 }
    }
    
    const loadConfig = loadAdjustments[cognitiveLoad]
    
    return {
      primaryHue: baseHue,
      saturation: baseSaturation,
      lightness: baseLightness,
      intensity: adjustedIntensity * activityMultiplier,
      pulseRate: loadConfig.pulseRate,
      particleDensity: loadConfig.particleDensity,
      energyLevel: progressMultiplier
    }
  }, [tier, completionPercentage, assessmentActive, cognitiveLoad])
  
  // Time-based adjustments for circadian rhythm support
  const calculateTimeAdjustments = useCallback(() => {
    const timeConfigs = {
      dawn: { temperature: 3000, ambientBrightness: 0.6 },
      day: { temperature: 6500, ambientBrightness: 0.8 },
      dusk: { temperature: 2700, ambientBrightness: 0.7 },
      night: { temperature: 2200, ambientBrightness: 0.5 }
    }
    
    return timeConfigs[timeOfDay]
  }, [timeOfDay])
  
  // Update ambient state when inputs change
  useEffect(() => {
    const newState = calculateAmbientState()
    const timeAdjustments = calculateTimeAdjustments()
    
    setAmbientState(newState)
    setTimeBasedAdjustments(timeAdjustments)
    
    // Trigger smooth transition animation
    controls.start("update")
  }, [tier, completionPercentage, assessmentActive, timeOfDay, cognitiveLoad, calculateAmbientState, calculateTimeAdjustments, controls])
  
  // Generate neural network background pattern
  const generateNeuralNetwork = () => {
    const nodes = Array.from({ length: Math.floor(ambientState.particleDensity * 50) }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2
    }))
    
    return nodes
  }
  
  const [networkNodes] = useState(() => generateNeuralNetwork())
  
  return (
    <>
      {/* Dynamic CSS variables injection */}
      <style jsx global>{`
        :root {
          --ambient-hue: ${ambientState.primaryHue};
          --ambient-saturation: ${ambientState.saturation}%;
          --ambient-lightness: ${ambientState.lightness}%;
          --ambient-intensity: ${ambientState.intensity};
          --ambient-energy: ${ambientState.energyLevel};
          --color-temperature: ${timeBasedAdjustments.temperature}K;
          --ambient-brightness: ${timeBasedAdjustments.ambientBrightness};
        }
      `}</style>
      
      {/* Layered background system */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Base gradient layer */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, 
                hsla(var(--ambient-hue), var(--ambient-saturation), calc(var(--ambient-lightness) * 1.2), var(--ambient-intensity)) 0%, 
                transparent 70%),
              radial-gradient(ellipse at 80% 20%, 
                hsla(calc(var(--ambient-hue) + 40), var(--ambient-saturation), calc(var(--ambient-lightness) * 0.8), calc(var(--ambient-intensity) * 0.7)) 0%, 
                transparent 70%),
              radial-gradient(ellipse at 40% 80%, 
                hsla(calc(var(--ambient-hue) - 30), calc(var(--ambient-saturation) * 0.8), var(--ambient-lightness), calc(var(--ambient-intensity) * 0.5)) 0%, 
                transparent 70%)
            `
          }}
          variants={{
            update: {
              opacity: [0.8, 1, 0.8],
              scale: [1, 1.02, 1]
            }
          }}
          animate={controls}
          transition={{
            duration: ambientState.pulseRate / 1000,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Subtle pattern overlay */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{
            background: `
              linear-gradient(
                hsla(var(--ambient-hue), 30%, 50%, 0.1) 1px, 
                transparent 1px
              ),
              linear-gradient(
                90deg, 
                hsla(var(--ambient-hue), 30%, 50%, 0.1) 1px, 
                transparent 1px
              )
            `,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Floating neural nodes */}
        <div className="absolute inset-0">
          {networkNodes.map((node) => (
            <motion.div
              key={node.id}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                background: `hsla(var(--ambient-hue), var(--ambient-saturation), 70%, 0.6)`,
                boxShadow: `0 0 6px hsla(var(--ambient-hue), var(--ambient-saturation), 70%, 0.8)`
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
                y: [0, -20, 0]
              }}
              transition={{
                duration: 6 + node.id % 4,
                repeat: Infinity,
                delay: node.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Energy flow streams */}
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: ambientState.pulseRate / 1000,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-full h-0.5"
              style={{
                top: `${25 + i * 25}%`,
                background: `linear-gradient(
                  90deg, 
                  transparent 0%, 
                  hsla(var(--ambient-hue), 80%, 60%, 0.6) 50%, 
                  transparent 100%
                )`,
                filter: 'blur(1px)'
              }}
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: "linear",
                delay: i * 2
              }}
            />
          ))}
        </motion.div>
        
        {/* Cognitive load visualization */}
        {cognitiveLoad === 'high' && (
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: [0, 0.3, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle, hsla(var(--ambient-hue), 100%, 50%, 0.1) 0%, transparent 50%)`
              }}
            />
          </motion.div>
        )}
        
        {/* Assessment activity indicator */}
        {assessmentActive && (
          <motion.div
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
            style={{
              background: `hsla(var(--ambient-hue), 60%, 20%, 0.8)`,
              border: `1px solid hsla(var(--ambient-hue), 60%, 50%, 0.3)`
            }}
            animate={{
              boxShadow: [
                `0 0 10px hsla(var(--ambient-hue), 60%, 50%, 0.3)`,
                `0 0 20px hsla(var(--ambient-hue), 60%, 50%, 0.6)`,
                `0 0 10px hsla(var(--ambient-hue), 60%, 50%, 0.3)`
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{
                background: `hsla(var(--ambient-hue), 80%, 60%, 1)`
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span 
              className="text-xs font-medium"
              style={{
                color: `hsla(var(--ambient-hue), 60%, 80%, 1)`
              }}
            >
              Neural Activity Detected
            </span>
          </motion.div>
        )}
        
        {/* Circadian rhythm overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: timeOfDay === 'night' 
              ? 'radial-gradient(circle, rgba(0, 0, 50, 0.3) 0%, transparent 100%)'
              : timeOfDay === 'dawn' || timeOfDay === 'dusk'
              ? 'linear-gradient(to bottom, rgba(255, 100, 0, 0.1) 0%, transparent 50%)'
              : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 0%, transparent 50%)'
          }}
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    </>
  )
}