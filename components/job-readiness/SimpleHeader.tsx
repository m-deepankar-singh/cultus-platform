'use client'

import { Medal, Trophy, Crown, Star } from 'lucide-react'

interface SimpleHeaderProps {
  tier?: string | null
  completionPercentage?: number
  assessmentCount?: number
  completedCount?: number
  starLevel?: number
}

export function SimpleHeader({
  tier,
  completionPercentage = 0,
  assessmentCount = 0,
  completedCount = 0,
  starLevel = 4
}: SimpleHeaderProps) {
  const tierConfig = {
    BRONZE: {
      color: 'rgb(251, 146, 60)',
      name: 'Bronze Tier',
      icon: Medal
    },
    SILVER: {
      color: 'rgb(148, 163, 184)', 
      name: 'Silver Tier',
      icon: Trophy
    },
    GOLD: {
      color: 'rgb(251, 191, 36)',
      name: 'Gold Tier', 
      icon: Crown
    }
  }
  
  const currentTierConfig = tier ? tierConfig[tier as keyof typeof tierConfig] : null
  
  // Render star progress (4 filled, 1 empty for the example)
  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-8 h-8 ${
          i < starLevel ? 'text-orange-400 fill-orange-400' : 'text-gray-600 fill-none'
        }`}
      />
    ))
  }
  
  return (
    <div className="relative py-16">
      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="flex items-center justify-between p-6 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/5">
          {/* Your Progress */}
          <div className="flex items-center gap-4">
            <span className="text-white font-medium text-lg">Your Progress</span>
          </div>
          
          {/* Star Progress */}
          <div className="flex items-center gap-2">
            {renderStars()}
          </div>
          
          {/* Tier Badge */}
          {currentTierConfig && (
            <div 
              className="flex items-center gap-3 px-4 py-2 rounded-full border"
              style={{
                background: `${currentTierConfig.color}20`,
                borderColor: `${currentTierConfig.color}40`,
                color: currentTierConfig.color
              }}
            >
              <currentTierConfig.icon className="w-5 h-5" />
              <span className="font-medium">{currentTierConfig.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}