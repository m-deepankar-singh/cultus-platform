"use client";

import { useRef, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedCard({ children, className, ...props }: AnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!cardRef.current || !mounted) return;
    
    const card = cardRef.current;
    
    // Create shine element for hover effect
      const shine = document.createElement("div");
    shine.className = "absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 pointer-events-none";
      card.appendChild(shine);
      
    // Create border glow
      const border = document.createElement("div");
    border.className = "absolute inset-0 rounded-lg border border-white/20 dark:border-neutral-700/40 pointer-events-none opacity-0";
      card.appendChild(border);
      
      // Mouse enter animation
      const handleMouseEnter = () => {
        gsap.to(shine, {
          opacity: 1,
          duration: 0.4,
          ease: "power2.out"
        });
        
        gsap.to(border, {
          opacity: 1,
        boxShadow: theme === "dark" 
          ? "0 0 15px rgba(255, 255, 255, 0.1)" 
          : "0 0 15px rgba(0, 0, 0, 0.05)",
          duration: 0.3
        });
        
        gsap.to(card, {
          y: -5,
          duration: 0.3,
          ease: "power2.out"
        });
      };
      
      // Mouse leave animation
      const handleMouseLeave = () => {
        gsap.to(shine, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.out"
        });
        
        gsap.to(border, {
          opacity: 0,
        boxShadow: "0 0 0px rgba(0, 0, 0, 0)",
          duration: 0.3
        });
        
        gsap.to(card, {
          y: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      };
      
      // Mouse move animation for shine effect
      const handleMouseMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const moveX = (x - centerX) / centerX;
        const moveY = (y - centerY) / centerY;
        
        gsap.to(shine, {
          backgroundPosition: `${moveX * 20}% ${moveY * 20}%`,
          duration: 0.5
        });
      };
      
      card.addEventListener("mouseenter", handleMouseEnter);
      card.addEventListener("mouseleave", handleMouseLeave);
      card.addEventListener("mousemove", handleMouseMove);
      
      return () => {
        card.removeEventListener("mouseenter", handleMouseEnter);
        card.removeEventListener("mouseleave", handleMouseLeave);
        card.removeEventListener("mousemove", handleMouseMove);
        shine.remove();
        border.remove();
      };
  }, [theme, mounted]);
  
  return (
    <div
      ref={cardRef}
      className={cn(
        "relative rounded-lg p-5 transition-all duration-300 bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-white/20 dark:border-neutral-800/30 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 