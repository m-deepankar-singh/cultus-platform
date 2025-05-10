"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import gsap from "gsap";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Run animation when pathname changes
  useEffect(() => {
    if (!contentRef.current || !overlayRef.current) return;
    
    const content = contentRef.current;
    const overlay = overlayRef.current;
    
    // Set initial state
    gsap.set(content, { opacity: 0, y: 20 });
    gsap.set(overlay, { 
      scaleY: 1, 
      transformOrigin: "top", 
      backgroundColor: theme === "dark" ? "rgba(var(--primary) / 0.1)" : "rgba(var(--primary) / 0.05)" 
    });
    
    // Create timeline
    const tl = gsap.timeline();
    
    // Animate overlay out
    tl.to(overlay, {
      scaleY: 0,
      transformOrigin: "bottom",
      duration: 0.6,
      ease: "power2.inOut"
    });
    
    // Animate content in
    tl.to(content, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out"
    }, "-=0.3");
    
    return () => {
      tl.kill();
    };
  }, [pathname, theme]);
  
  return (
    <div className="relative w-full h-full">
      {/* Content container */}
      <div ref={contentRef} className="w-full h-full">
        {children}
      </div>
      
      {/* Transition overlay */}
      <div 
        ref={overlayRef} 
        className="fixed inset-0 z-50 pointer-events-none"
      />
    </div>
  );
} 