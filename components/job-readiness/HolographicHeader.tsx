'use client'

import { useState, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { 
  Brain, 
  Zap, 
  Sparkles, 
  Target, 
  Layers,
  Globe,
  Cpu,
  Network
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HolographicHeaderProps {
  tier?: string | null
  completionPercentage?: number
  assessmentCount?: number
  completedCount?: number
}

const floatingIcons = [Brain, Zap, Sparkles, Target, Layers, Globe, Cpu, Network]

export function HolographicHeader({
  tier,
  completionPercentage = 0,
  assessmentCount = 0,
  completedCount = 0
}: HolographicHeaderProps) {
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number, icon: typeof Brain}>>([])
  const controls = useAnimation()
  const textControls = useAnimation()
  
  useEffect(() => {
    // Generate floating icon particles
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      icon: floatingIcons[Math.floor(Math.random() * floatingIcons.length)]
    }))
    setParticles(newParticles)
    
    // Start animations
    controls.start("animate")
    textControls.start("animate")
  }, [controls, textControls])
  
  const tierConfig = {
    BRONZE: {
      color: 'rgb(251, 146, 60)',
      glow: 'rgba(251, 146, 60, 0.4)',
      name: 'Bronze Neural Network'
    },
    SILVER: {
      color: 'rgb(148, 163, 184)',
      glow: 'rgba(148, 163, 184, 0.4)',
      name: 'Silver Cognitive Matrix'
    },
    GOLD: {
      color: 'rgb(251, 191, 36)',
      glow: 'rgba(251, 191, 36, 0.4)',
      name: 'Gold Intelligence Core'
    }
  }
  
  const currentTierConfig = tier ? tierConfig[tier as keyof typeof tierConfig] : null
  
  return (
    <div className="relative overflow-hidden py-16">
      {/* Floating particle background */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => {
          const IconComponent = particle.icon
          return (
            <motion.div
              key={particle.id}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.sin(particle.id) * 20, 0],
                opacity: [0.2, 0.6, 0.2],
                rotate: [0, 360, 0],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 8 + particle.id,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut"
              }}
            >
              <IconComponent 
                className="w-4 h-4 text-white/30" 
              />
            </motion.div>
          )
        })}
      </div>
      
      {/* Main header content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Floating title assembly */}
        <motion.div
          className="space-y-6"
          variants={{
            animate: {
              y: [0, -10, 0],
              transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }
          }}
          animate={controls}
        >
          {/* Icon constellation */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <motion.div
              className="relative"
              animate={{
                rotate: 360
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-md border border-white/20">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              
              {/* Orbiting mini icons */}
              {[Target, Zap, Sparkles].map((Icon, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 120}deg) translateY(-40px)`
                  }}
                  animate={{
                    rotate: -360
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                    <Icon className="w-3 h-3 text-white/70" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            {/* Central title */}
            <motion.div
              className="space-y-2"
              variants={{
                animate: {
                  scale: [1, 1.02, 1],
                  transition: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }
              }}
              animate={textControls}
            >
              <motion.h1 
                className="text-5xl md:text-6xl font-bold text-white"
                style={{
                  textShadow: currentTierConfig ? `0 0 20px ${currentTierConfig.glow}` : '0 0 20px rgba(255,255,255,0.3)'
                }}
              >
                Neural Assessment
              </motion.h1>
              
              {/* Subtitle that morphs based on tier */}
              <motion.div
                className="text-lg md:text-xl font-medium"
                animate={{
                  color: currentTierConfig ? [currentTierConfig.color, '#ffffff', currentTierConfig.color] : ['#ffffff', '#94a3b8', '#ffffff'],
                  textShadow: currentTierConfig 
                    ? [`0 0 10px ${currentTierConfig.glow}`, `0 0 20px ${currentTierConfig.glow}`, `0 0 10px ${currentTierConfig.glow}`]
                    : ['0 0 10px rgba(255,255,255,0.3)', '0 0 20px rgba(255,255,255,0.5)', '0 0 10px rgba(255,255,255,0.3)']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {currentTierConfig ? currentTierConfig.name : 'Intelligence Calibration System'}
              </motion.div>
            </motion.div>
            
            <motion.div
              className="relative"
              animate={{
                rotate: -360
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-md border border-white/20">
                <Network className="w-8 h-8 text-purple-400" />
              </div>
              
              {/* Data flow lines */}
              <motion.div
                className="absolute inset-0"
                animate={{
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-8 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateX(30px)`
                    }}
                    animate={{
                      scaleX: [0, 1, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Advanced description with dynamic text */}
        <motion.div
          className="max-w-4xl mx-auto space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <motion.p 
            className="text-lg md:text-xl text-gray-300 leading-relaxed"
            animate={{
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Initiate cognitive mapping protocols to establish your neural baseline and unlock 
            adaptive learning trajectories tailored to your synaptic architecture.
          </motion.p>
          
          {/* Progress quantum display */}
          {assessmentCount > 0 && (
            <motion.div
              className="flex items-center justify-center gap-4 pt-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <div className="flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
                {/* Quantum progress ring */}
                <div className="relative w-6 h-6">
                  <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                    />
                    <motion.circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="rgb(59, 130, 246)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: completionPercentage / 100 }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      style={{
                        pathLength: completionPercentage / 100,
                        filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))'
                      }}
                    />
                  </svg>
                  
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Cpu className="w-3 h-3 text-blue-400" />
                  </motion.div>
                </div>
                
                <motion.span 
                  className="text-white font-medium"
                  animate={{
                    textShadow: ['0 0 5px rgba(255,255,255,0.5)', '0 0 15px rgba(255,255,255,0.8)', '0 0 5px rgba(255,255,255,0.5)']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {completedCount} of {assessmentCount} Neural Probes Complete
                </motion.span>
                
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-400"
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.3, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
        
      </div>
    </div>
  )
}