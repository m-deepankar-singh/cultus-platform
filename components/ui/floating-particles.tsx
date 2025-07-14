"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface FloatingParticlesProps {
  count?: number;
  size?: "sm" | "md" | "lg";
  speed?: "slow" | "normal" | "fast";
  opacity?: number;
  className?: string;
}

export function FloatingParticles({ 
  count = 6, 
  size = "md", 
  speed = "normal",
  opacity = 0.3,
  className 
}: FloatingParticlesProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    top: number;
    delay: number;
    scale: number;
  }>>([]);

  useEffect(() => {
    setMounted(true);
    
    // Generate random particle positions and properties
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: i * 1000, // Staggered delays in milliseconds
      scale: 0.5 + Math.random() * 0.5 // Random scale between 0.5 and 1
    }));
    
    setParticles(newParticles);
  }, [count]);

  // Don't render on server or if user prefers reduced motion
  if (!mounted) return null;

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3", 
    lg: "w-4 h-4"
  };

  const getAnimationDuration = (speed: "slow" | "normal" | "fast") => {
    const durations = {
      slow: "8000ms",
      normal: "6000ms", 
      fast: "4000ms"
    };
    return durations[speed];
  };

  return (
    <div className={cn("floating-particles", className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={cn(
            "particle",
            sizeClasses[size],
            "absolute rounded-full animate-float"
          )}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}ms`,
            animationDuration: getAnimationDuration(speed),
            opacity: opacity,
            transform: `scale(${particle.scale})`,
            background: resolvedTheme === 'dark' 
              ? `radial-gradient(circle, hsl(270 90% 70% / 0.6) 0%, transparent 70%)`
              : `radial-gradient(circle, hsl(210 100% 45% / 0.6) 0%, transparent 70%)`
          }}
        />
      ))}
    </div>
  );
}

// Theme-aware cosmic particles for dark mode
export function CosmicParticles({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  
  if (resolvedTheme !== 'dark') return null;
  
  return (
    <FloatingParticles
      count={8}
      size="sm"
      speed="slow"
      opacity={0.4}
      className={className}
    />
  );
}

// Light bubbles for light mode
export function BubbleParticles({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  
  if (resolvedTheme !== 'light') return null;
  
  return (
    <FloatingParticles
      count={6}
      size="md"
      speed="normal"
      opacity={0.25}
      className={className}
    />
  );
}

// Adaptive particles that change based on theme
export function AdaptiveParticles({ className }: { className?: string }) {
  return (
    <>
      <CosmicParticles className={className} />
      <BubbleParticles className={className} />
    </>
  );
}

// Interactive particles that respond to mouse movement (performance-conscious)
export function InteractiveParticles({ 
  className,
  sensitivity = 0.1 
}: { 
  className?: string;
  sensitivity?: number;
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle mouse events for performance
      if (rafId) return;
      
      rafId = requestAnimationFrame(() => {
        setMousePosition({
          x: (e.clientX / window.innerWidth) * 100,
          y: (e.clientY / window.innerHeight) * 100
        });
        rafId = 0;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className={cn("floating-particles", className)}>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="particle w-2 h-2 absolute rounded-full transition-transform duration-1000 ease-out"
          style={{
            left: `${20 + i * 20}%`,
            top: `${30 + i * 15}%`,
            transform: `translate(${(mousePosition.x - 50) * sensitivity * (i + 1)}px, ${(mousePosition.y - 50) * sensitivity * (i + 1)}px)`,
            background: `radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 70%)`,
            opacity: 0.3 - i * 0.05
          }}
        />
      ))}
    </div>
  );
}