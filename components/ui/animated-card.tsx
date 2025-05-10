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
    
    // Create elements and set up animations based on theme
    if (theme === "dark") {
      // Dark mode animations
      
      // Create shine element
      const shine = document.createElement("div");
      shine.className = "absolute inset-0 bg-gradient-to-tr from-primary/0 via-primary/5 to-primary/0 opacity-0 pointer-events-none";
      card.appendChild(shine);
      
      // Create glow border
      const border = document.createElement("div");
      border.className = "absolute inset-0 rounded-lg border border-primary/20 pointer-events-none opacity-0";
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
          boxShadow: "0 0 15px rgba(var(--primary) / 0.2)",
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
          boxShadow: "0 0 0px rgba(var(--primary) / 0)",
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
    } else {
      // Light mode animations - more subtle
      
      // Create subtle shadow
      const shadow = document.createElement("div");
      shadow.className = "absolute -inset-0.5 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 pointer-events-none -z-10";
      card.appendChild(shadow);
      
      // Mouse enter animation for light mode
      const handleMouseEnter = () => {
        gsap.to(shadow, {
          opacity: 0.7,
          duration: 0.3,
          ease: "power2.out"
        });
        
        gsap.to(card, {
          y: -3,
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
          duration: 0.3,
          ease: "power2.out"
        });
      };
      
      // Mouse leave animation for light mode
      const handleMouseLeave = () => {
        gsap.to(shadow, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.out"
        });
        
        gsap.to(card, {
          y: 0,
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
          duration: 0.3,
          ease: "power2.out"
        });
      };
      
      card.addEventListener("mouseenter", handleMouseEnter);
      card.addEventListener("mouseleave", handleMouseLeave);
      
      return () => {
        card.removeEventListener("mouseenter", handleMouseEnter);
        card.removeEventListener("mouseleave", handleMouseLeave);
        shadow.remove();
      };
    }
  }, [theme, mounted]);
  
  return (
    <div
      ref={cardRef}
      className={cn(
        "relative bg-card text-card-foreground rounded-lg p-4 transition-all duration-300",
        theme === "dark" ? "dark:bg-black/40 backdrop-blur-sm" : "bg-white shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 