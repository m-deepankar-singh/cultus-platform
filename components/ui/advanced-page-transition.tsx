"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import gsap from "gsap";

interface AdvancedPageTransitionProps {
  children: React.ReactNode;
}

export function AdvancedPageTransition({ children }: AdvancedPageTransitionProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [transitioning, setTransitioning] = useState(false);
  
  // Track previous pathname to determine direction
  useEffect(() => {
    if (prevPathname !== pathname) {
      setTransitioning(true);
      setPrevPathname(pathname);
    }
  }, [pathname, prevPathname]);
  
  // Run animation when transitioning state changes
  useEffect(() => {
    if (!transitioning || !contentRef.current || !overlayRef.current) return;
    
    const content = contentRef.current;
    const overlay = overlayRef.current;
    
    if (theme === "dark") {
      // Dark mode transition - optimized without particles
      
      // Set initial state
      gsap.set(content, { opacity: 0, scale: 0.98 });
      gsap.set(overlay, { 
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        opacity: 0
      });
      
      // Create timeline
      const tl = gsap.timeline({
        onComplete: () => {
          setTransitioning(false);
        }
      });
      
      // Fade in overlay
      tl.to(overlay, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.inOut"
      });
      
      // Fade out overlay
      tl.to(overlay, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut"
      }, "-=0.1");
      
      // Fade in content
      tl.to(content, {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      }, "-=0.2");
      
    } else {
      // Light mode transition with simple fade
      
      // Set initial state
      gsap.set(content, { opacity: 0, y: 20 });
      gsap.set(overlay, { 
        background: "linear-gradient(to bottom, rgba(var(--primary) / 0.05), transparent)",
        opacity: 1,
        height: "100%",
        top: 0
      });
      
      // Create timeline
      const tl = gsap.timeline({
        onComplete: () => {
          setTransitioning(false);
        }
      });
      
      // Slide down overlay
      tl.to(overlay, {
        height: "0%",
        duration: 0.6,
        ease: "power2.inOut"
      });
      
      // Fade in content
      tl.to(content, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.3");
    }
    
  }, [transitioning, theme]);
  
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
        style={{ opacity: 0 }}
      />
    </div>
  );
} 