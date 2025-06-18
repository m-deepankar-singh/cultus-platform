"use client"

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedVideoControlsProps {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  currentTime: number
  duration: number
  onPlayToggle: () => void
  onVolumeChange: (value: number[]) => void
  onMuteToggle: () => void
  onFullscreenToggle: () => void
  formatTime: (time: number) => string
  isUpdatingProgress?: boolean
  className?: string
}

export function EnhancedVideoControls({
  isPlaying,
  volume,
  isMuted,
  isFullscreen,
  currentTime,
  duration,
  onPlayToggle,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  formatTime,
  isUpdatingProgress = false,
  className
}: EnhancedVideoControlsProps) {
  
  const currentPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  
  return (
    <div className={cn("flex items-center justify-between text-white", className)}>
      {/* Left Controls: Play/Pause */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayToggle}
          className="text-white hover:bg-white/20 p-2"
          disabled={isUpdatingProgress}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
        
        {/* Progress Saving Indicator */}
        {isUpdatingProgress && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </div>
        )}
      </div>

      {/* Center: Time Display and Progress Bar (Read-only) */}
      <div className="flex-1 mx-4 space-y-1">
        {/* Read-only Progress Bar */}
        <div className="relative">
          <div className="w-full h-1 bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-400 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${Math.min(currentPercentage, 100)}%` }}
            />
          </div>
          
          {/* Disabled Interaction Overlay */}
          <div 
            className="absolute inset-0 cursor-not-allowed"
            title="Seeking is disabled for expert sessions"
          />
        </div>
        
        {/* Time Display */}
        <div className="flex justify-between items-center text-xs text-gray-300">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Controls: Volume and Fullscreen */}
      <div className="flex items-center gap-3">
        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMuteToggle}
            className="text-white hover:bg-white/20 p-2"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          {/* Volume Slider */}
          <div className="hidden sm:block w-20">
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={onVolumeChange}
              max={1}
              step={0.1}
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onFullscreenToggle}
          className="text-white hover:bg-white/20 p-2"
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
} 