"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import gsap from "gsap";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  
  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    
    if (!cursor || !cursorDot) return;
    
    // Set initial position off-screen
    gsap.set(cursor, { x: -100, y: -100 });
    gsap.set(cursorDot, { x: -100, y: -100 });
    
    // Update cursor styles based on theme
    if (resolvedTheme === "dark") {
      cursor.classList.add("border-primary/50");
      cursor.classList.remove("border-primary/30");
      cursorDot.classList.add("bg-primary");
      cursorDot.classList.remove("bg-primary/70");
    } else {
      cursor.classList.add("border-primary/30");
      cursor.classList.remove("border-primary/50");
      cursorDot.classList.add("bg-primary/70");
      cursorDot.classList.remove("bg-primary");
    }
    
    // Track mouse movement
    const onMouseMove = (e: MouseEvent) => {
      // Animate cursor to follow mouse with slight delay
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: "power2.out"
      });
      
      // Animate dot to follow mouse with no delay
      gsap.to(cursorDot, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.1
      });
    };
    
    // Handle mouse enter/leave on interactive elements
    const onMouseEnter = () => {
      gsap.to(cursor, {
        scale: 1.5,
        opacity: resolvedTheme === "dark" ? 0.5 : 0.4,
        duration: 0.3
      });
      
      gsap.to(cursorDot, {
        scale: 0.5,
        duration: 0.3
      });
    };
    
    const onMouseLeave = () => {
      gsap.to(cursor, {
        scale: 1,
        opacity: resolvedTheme === "dark" ? 0.7 : 0.6,
        duration: 0.3
      });
      
      gsap.to(cursorDot, {
        scale: 1,
        duration: 0.3
      });
    };
    
    // Add event listeners
    document.addEventListener("mousemove", onMouseMove);
    
    // Add event listeners to interactive elements and hide default cursor
    const interactiveElements = document.querySelectorAll("a, button, input, select, textarea, [role='button']");
    interactiveElements.forEach(element => {
      element.addEventListener("mouseenter", onMouseEnter);
      element.addEventListener("mouseleave", onMouseLeave);
      (element as HTMLElement).style.cursor = "none";
    });
    
    // Add event listeners to animated cards and hide default cursor
    const animatedCards = document.querySelectorAll(".animated-card");
    animatedCards.forEach(card => {
      card.addEventListener("mouseenter", onMouseEnter);
      card.addEventListener("mouseleave", onMouseLeave);
      (card as HTMLElement).style.cursor = "none";
    });
    
    // Create and inject a style element to hide default cursor on all elements
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      * {
        cursor: none !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Clean up
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      
      interactiveElements.forEach(element => {
        element.removeEventListener("mouseenter", onMouseEnter);
        element.removeEventListener("mouseleave", onMouseLeave);
        (element as HTMLElement).style.removeProperty("cursor");
      });
      
      animatedCards.forEach(card => {
        card.removeEventListener("mouseenter", onMouseEnter);
        card.removeEventListener("mouseleave", onMouseLeave);
        (card as HTMLElement).style.removeProperty("cursor");
      });
      
      // Remove the style element
      document.head.removeChild(styleElement);
      
      // Restore default cursor
      document.body.style.cursor = "auto";
    };
  }, [resolvedTheme]);
  
  return (
    <>
      {/* Main cursor ring */}
      <div
        ref={cursorRef}
        className={`fixed pointer-events-none z-[9999] w-8 h-8 rounded-full border opacity-70 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
          resolvedTheme === "dark" ? "border-primary/50" : "border-primary/30"
        }`}
      />
      
      {/* Cursor dot */}
      <div
        ref={cursorDotRef}
        className={`fixed pointer-events-none z-[9999] w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
          resolvedTheme === "dark" ? "bg-primary" : "bg-primary/70"
        }`}
      />
    </>
  );
} 