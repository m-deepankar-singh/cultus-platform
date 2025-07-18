"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  showPercentage?: boolean;
  className?: string;
  color?: "primary" | "success" | "warning" | "danger";
  animate?: boolean;
  delay?: number;
}

export function OptimizedProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  showValue = true,
  showPercentage = true,
  className,
  color = "primary",
  animate = true,
  delay = 0
}: OptimizedProgressRingProps) {
  const [mounted, setMounted] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  // Calculate SVG dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  // Animation on mount
  useEffect(() => {
    setMounted(true);
    
    if (animate) {
      const timer = setTimeout(() => {
        setAnimatedValue(value);
      }, delay);
      
      return () => clearTimeout(timer);
    } else {
      setAnimatedValue(value);
    }
  }, [value, animate, delay]);

  // Color mapping for different states
  const colorClasses = {
    primary: "text-primary",
    success: "text-green-500",
    warning: "text-cyan-500", 
    danger: "text-red-500"
  };

  const backgroundColorClasses = {
    primary: "text-primary/20",
    success: "text-green-500/20",
    warning: "text-cyan-500/20",
    danger: "text-red-500/20"
  };

  if (!mounted) {
    return (
      <div 
        className={cn("flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <div className="animate-pulse rounded-full bg-muted" style={{ width: size, height: size }} />
      </div>
    );
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 progress-ring"
        style={{ willChange: 'transform' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className={cn("transition-colors duration-300", backgroundColorClasses[color])}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-1000 ease-out",
            colorClasses[color]
          )}
          style={{ 
            transitionDelay: animate ? `${delay + 500}ms` : '0ms',
            willChange: 'stroke-dashoffset'
          }}
        />
      </svg>

      {/* Value display */}
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "text-sm font-semibold tabular-nums transition-colors duration-300",
            colorClasses[color]
          )}>
            {Math.round(animatedValue)}{showPercentage && "%"}
          </span>
        </div>
      )}
    </div>
  );
}

// Compound component for multiple progress rings
interface ProgressRingGroupProps {
  rings: Array<{
    value: number;
    label: string;
    color?: "primary" | "success" | "warning" | "danger";
    size?: number;
  }>;
  className?: string;
}

export function ProgressRingGroup({ rings, className }: ProgressRingGroupProps) {
  return (
    <div className={cn("flex items-center justify-center space-x-6", className)}>
      {rings.map((ring, index) => (
        <div key={index} className="flex flex-col items-center space-y-2">
          <OptimizedProgressRing
            value={ring.value}
            color={ring.color}
            size={ring.size}
            delay={index * 200} // Staggered animation
          />
          <span className="text-xs text-muted-foreground text-center">
            {ring.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Mini version for inline use
export function MiniProgressRing({ 
  value, 
  size = 24, 
  color = "primary" 
}: Pick<OptimizedProgressRingProps, 'value' | 'size' | 'color'>) {
  return (
    <OptimizedProgressRing
      value={value}
      size={size}
      strokeWidth={3}
      showValue={false}
      color={color}
      animate={false}
    />
  );
}