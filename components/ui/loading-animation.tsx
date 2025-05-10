"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import gsap from "gsap";

interface LoadingAnimationProps {
  isLoading: boolean;
}

export function LoadingAnimation({ isLoading }: LoadingAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const dots: HTMLDivElement[] = [];
    
    // Create dots
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      dot.className = theme === "dark" 
        ? "w-3 h-3 rounded-full bg-primary mx-1" 
        : "w-3 h-3 rounded-full bg-primary/70 mx-1";
      container.appendChild(dot);
      dots.push(dot);
    }
    
    // Animate dots
    const tl = gsap.timeline({ repeat: -1 });
    
    dots.forEach((dot, index) => {
      // Set initial state
      gsap.set(dot, { scale: 0.5, opacity: 0.5 });
      
      // Add to timeline with stagger
      tl.to(dot, {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: "power2.inOut"
      }, index * 0.15)
      .to(dot, {
        scale: 0.5,
        opacity: 0.5,
        duration: 0.4,
        ease: "power2.inOut"
      }, index * 0.15 + 0.4);
    });
    
    // If not loading, pause animation
    if (!isLoading) {
      tl.pause();
    }
    
    return () => {
      tl.kill();
      dots.forEach(dot => dot.remove());
    };
  }, [isLoading, theme]);
  
  if (!isLoading) return null;
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === "dark" ? "bg-black/60" : "bg-white/70"} backdrop-blur-sm`}>
      <div className="flex items-center justify-center p-4 rounded-lg">
        <div ref={containerRef} className="flex items-center">
          {/* Dots will be created by GSAP */}
        </div>
      </div>
    </div>
  );
} 