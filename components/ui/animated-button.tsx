"use client";

import { useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends ButtonProps {
  rippleEffect?: boolean;
}

export function AnimatedButton({
  children,
  className,
  rippleEffect = true,
  ...props
}: AnimatedButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!buttonRef.current || theme !== "dark") return;
    
    const button = buttonRef.current;
    
    // Mouse enter animation
    const handleMouseEnter = () => {
      gsap.to(button, {
        scale: 1.05,
        boxShadow: "0 0 15px rgba(var(--primary) / 0.4)",
        duration: 0.3,
        ease: "power2.out"
      });
    };
    
    // Mouse leave animation
    const handleMouseLeave = () => {
      gsap.to(button, {
        scale: 1,
        boxShadow: "0 0 0px rgba(var(--primary) / 0)",
        duration: 0.3,
        ease: "power2.out"
      });
    };
    
    // Click animation with ripple effect
    const handleClick = (e: MouseEvent) => {
      if (!rippleEffect) return;
      
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Create ripple element
      const ripple = document.createElement("span");
      ripple.className = "absolute rounded-full bg-white/30 pointer-events-none";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = "0";
      ripple.style.height = "0";
      ripple.style.transform = "translate(-50%, -50%)";
      
      button.appendChild(ripple);
      
      // Animate ripple
      gsap.to(ripple, {
        width: button.offsetWidth * 2.5,
        height: button.offsetWidth * 2.5,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => {
          ripple.remove();
        }
      });
    };
    
    button.addEventListener("mouseenter", handleMouseEnter);
    button.addEventListener("mouseleave", handleMouseLeave);
    button.addEventListener("click", handleClick);
    
    return () => {
      button.removeEventListener("mouseenter", handleMouseEnter);
      button.removeEventListener("mouseleave", handleMouseLeave);
      button.removeEventListener("click", handleClick);
    };
  }, [theme, rippleEffect]);
  
  return (
    <Button
      ref={buttonRef}
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        theme === "dark" && "dark:border-primary/20 dark:hover:border-primary/40",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
} 