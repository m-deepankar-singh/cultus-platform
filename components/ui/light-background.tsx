"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface LightBackgroundProps {
  children: React.ReactNode;
}

export function LightBackground({ children }: LightBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!containerRef.current || theme === "dark") return;
    
    // Create subtle pattern elements
    const patternCount = 10;
    const patterns: HTMLDivElement[] = [];
    
    for (let i = 0; i < patternCount; i++) {
      const pattern = document.createElement("div");
      
      // Create different shapes for variety
      if (i % 3 === 0) {
        // Circles
        pattern.className = "absolute rounded-full bg-primary/5 pointer-events-none";
        const size = Math.random() * 200 + 50;
        pattern.style.width = `${size}px`;
        pattern.style.height = `${size}px`;
      } else if (i % 3 === 1) {
        // Squares
        pattern.className = "absolute rounded-md bg-primary/5 pointer-events-none";
        const size = Math.random() * 150 + 50;
        pattern.style.width = `${size}px`;
        pattern.style.height = `${size}px`;
        pattern.style.transform = `rotate(${Math.random() * 45}deg)`;
      } else {
        // Blobs
        pattern.className = "absolute bg-primary/5 pointer-events-none";
        const width = Math.random() * 200 + 100;
        const height = Math.random() * 200 + 100;
        pattern.style.width = `${width}px`;
        pattern.style.height = `${height}px`;
        pattern.style.borderRadius = `${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}%`;
      }
      
      // Position randomly
      pattern.style.top = `${Math.random() * 100}%`;
      pattern.style.left = `${Math.random() * 100}%`;
      pattern.style.opacity = `${Math.random() * 0.2 + 0.05}`;
      
      containerRef.current.appendChild(pattern);
      patterns.push(pattern);
    }
    
    // Add a subtle gradient overlay
    const gradientOverlay = document.createElement("div");
    gradientOverlay.className = "absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 pointer-events-none";
    containerRef.current.appendChild(gradientOverlay);
    
    return () => {
      // Clean up
      patterns.forEach(pattern => pattern.remove());
      gradientOverlay.remove();
    };
  }, [theme]);
  
  return (
    <div ref={containerRef} className="relative w-full h-full bg-muted/40">
      {children}
    </div>
  );
} 