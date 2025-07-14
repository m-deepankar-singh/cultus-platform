"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface PerformantAnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "elevated" | "subtle";
  hoverEffect?: "lift" | "glow" | "scale" | "none";
  staggerIndex?: number;
}

export function PerformantAnimatedCard({ 
  children, 
  className, 
  variant = "default",
  hoverEffect = "lift",
  staggerIndex = 0,
  ...props 
}: PerformantAnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Touch optimization for mobile devices
  const [isHovered, setIsHovered] = useState(false);
  
  const handleTouchStart = useCallback(() => {
    setIsHovered(true);
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setIsHovered(false), 300);
  }, []);
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !mounted || hoverEffect === "none") return;

    // Subtle hover animations using CSS transforms
    const handleMouseEnter = () => {
      switch (hoverEffect) {
        case "lift":
          card.style.transform = "translateY(-2px)";
          break;
        case "scale":
          card.style.transform = "scale(1.01)";
          break;
        case "glow":
          // Minimal glow effect handled by CSS classes
          break;
      }
    };

    const handleMouseLeave = () => {
      card.style.transform = "translateY(0) scale(1)";
    };

    // Use passive event listeners for better performance
    card.addEventListener("mouseenter", handleMouseEnter, { passive: true });
    card.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mounted, hoverEffect]);

  // Variant styles
  const variantClasses = {
    default: "bg-card/60 backdrop-blur-sm border border-border",
    glass: "glass-card",
    elevated: "bg-card shadow-lg border border-border",
    subtle: "bg-muted/30 border border-muted"
  };

  // Subtle hover effect classes
  const hoverClasses = {
    lift: "hover:shadow-md",
    glow: "hover:shadow-sm",
    scale: "hover:shadow-sm",
    none: ""
  };

  if (!mounted) {
    return (
      <div 
        className={cn(
          "rounded-lg p-5 animate-pulse bg-muted",
          className
        )}
        style={{ 
          animationDelay: `${staggerIndex * 100}ms`,
          minHeight: "120px" 
        }}
      />
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        // Base styles
        "relative rounded-lg p-5 transition-all duration-300 ease-out transform-gpu",
        "dashboard-card",
        // Variant styles
        variantClasses[variant],
        // Hover effects
        hoverEffect !== "none" && hoverClasses[hoverEffect],
        // Additional styles
        className
      )}
      style={{ 
        willChange: 'transform',
        "--stagger-index": staggerIndex
      } as React.CSSProperties}
      {...touchHandlers}
      {...props}
    >
      {children}
      
    </div>
  );
}

// Specialized card variants as compound components
export function GlassCard({ children, className, ...props }: Omit<PerformantAnimatedCardProps, 'variant'>) {
  return (
    <PerformantAnimatedCard 
      variant="glass" 
      className={className}
      {...props}
    >
      {children}
    </PerformantAnimatedCard>
  );
}

export function ElevatedCard({ children, className, ...props }: Omit<PerformantAnimatedCardProps, 'variant'>) {
  return (
    <PerformantAnimatedCard 
      variant="elevated" 
      className={className}
      {...props}
    >
      {children}
    </PerformantAnimatedCard>
  );
}

export function SubtleCard({ children, className, ...props }: Omit<PerformantAnimatedCardProps, 'variant'>) {
  return (
    <PerformantAnimatedCard 
      variant="subtle" 
      hoverEffect="scale"
      className={className}
      {...props}
    >
      {children}
    </PerformantAnimatedCard>
  );
}

// Performance-optimized card grid
interface CardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function CardGrid({ 
  children, 
  columns = 3, 
  gap = "md", 
  className 
}: CardGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6"
  };

  return (
    <div className={cn(
      "grid",
      gridClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}