# Student App UI Design System Documentation

## Overview

This document provides comprehensive guidelines for maintaining UI consistency across all student-facing pages in the Cultus Platform. The design system is based on analysis of the student dashboard (`app/(app)/app/dashboard/page.tsx`) which showcases the platform's modern, animated, and responsive design patterns.

## Table of Contents

1. [Core Design Principles](#core-design-principles)
2. [Layout Architecture](#layout-architecture)
3. [Component Library](#component-library)
4. [Animation System](#animation-system)
5. [Color & Status System](#color--status-system)
6. [Typography](#typography)
7. [CSS Classes Reference](#css-classes-reference)
8. [Implementation Guidelines](#implementation-guidelines)
9. [Common Patterns](#common-patterns)
10. [Inconsistencies & Fixes](#inconsistencies--fixes)

## Core Design Principles

### 1. **Glassmorphism & Modern Design**
- Use glass-like transparent backgrounds with backdrop blur effects
- Subtle animations and hover effects for enhanced user experience
- Gradient text and button elements for visual appeal
- Theme-aware particle systems for ambient background effects

### 2. **Performance-First Animation**
- GPU-accelerated animations using `transform-gpu` class
- Staggered entry animations with configurable delays
- Optimized progress indicators and smooth transitions
- Respect user's motion preferences (`prefers-reduced-motion`)

### 3. **Responsive & Accessible**
- Mobile-first responsive design with breakpoint-aware layouts
- Touch-optimized interactions for mobile devices
- Semantic HTML structure with proper ARIA labels
- Color contrast compliance for accessibility

## Layout Architecture

### Container Structure
```tsx
<div className="relative min-h-screen">
  {/* Background Effects */}
  <AdaptiveParticles />
  
  <div className="relative space-y-8">
    {/* Page Content */}
  </div>
</div>
```

### Standard Layout Classes
- **Main Container**: `container mx-auto py-8 px-4 md:px-0`
- **Content Wrapper**: `max-w-6xl mx-auto space-y-8`
- **Section Spacing**: `space-y-6` or `space-y-8`
- **Responsive Grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

## Component Library

### 1. **PerformantAnimatedCard**

Primary card component with built-in animations and glassmorphism effects.

**Variants:**
- `glass` - Glassmorphism effect with backdrop blur
- `elevated` - Traditional card with shadow
- `subtle` - Minimal styling for nested content
- `default` - Standard card appearance

**Hover Effects:**
- `lift` - Translates and scales on hover
- `glow` - Adds glowing border effect
- `scale` - Simple scale transformation
- `none` - No hover effects

**Usage Example:**
```tsx
<PerformantAnimatedCard 
  variant="glass" 
  hoverEffect="lift"
  staggerIndex={1}
  className="dashboard-card"
>
  <div className="space-y-4">
    {/* Card content */}
  </div>
</PerformantAnimatedCard>
```

### 2. **CardGrid**

Responsive grid layout for organizing cards.

**Properties:**
- `columns`: 1 | 2 | 3 | 4 (responsive breakpoints)
- `gap`: "sm" | "md" | "lg"

**Usage Example:**
```tsx
<CardGrid columns={4} gap="lg">
  {items.map((item, index) => (
    <PerformantAnimatedCard key={item.id} staggerIndex={index}>
      {/* Card content */}
    </PerformantAnimatedCard>
  ))}
</CardGrid>
```

### 3. **OptimizedProgressRing**

Circular progress indicators with smooth animations.

**Properties:**
- `value`: 0-100 (progress percentage)
- `size`: number (diameter in pixels)
- `color`: "primary" | "success" | "warning" | "danger"
- `showValue`: boolean (display percentage text)
- `delay`: number (animation delay in ms)

**Usage Example:**
```tsx
<OptimizedProgressRing
  value={75}
  size={80}
  color="primary"
  delay={300}
/>
```

### 4. **AnimatedButton**

Enhanced button component with ripple effects and hover animations.

**Features:**
- GSAP-powered hover animations
- Ripple effect on click
- Theme-aware styling
- Gradient background support

**Usage Example:**
```tsx
<AnimatedButton className="bg-gradient-to-r from-primary to-accent">
  Continue Learning
</AnimatedButton>
```

### 5. **AdaptiveParticles**

Theme-aware background particle system.

**Variants:**
- `AdaptiveParticles` - Auto-switches based on theme
- `CosmicParticles` - Dark theme cosmic effects
- `BubbleParticles` - Light theme bubble effects
- `InteractiveParticles` - Mouse-responsive particles

**Usage Example:**
```tsx
<div className="relative min-h-screen">
  <AdaptiveParticles />
  {/* Page content */}
</div>
```

## Animation System

### Entry Animations

**Staggered Card Animation:**
```tsx
// Automatic staggered animation for elements with .dashboard-card class
<PerformantAnimatedCard 
  staggerIndex={index}
  className="dashboard-card"
>
```

**GSAP Animations (Dashboard Pattern):**
```tsx
useEffect(() => {
  if (!isPending) {
    // Animate cards on mount
    gsap.fromTo(
      ".dashboard-card",
      { y: 30, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        stagger: 0.1, 
        duration: 0.6, 
        ease: "power2.out"
      }
    );
  }
}, [isPending]);
```

### Progress Animations

**Animated Progress Bars:**
```tsx
<div 
  className="h-2 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
  style={{ 
    width: `${mounted ? progress : 0}%`,
    transitionDelay: `${delay}ms`
  }}
/>
```

## Color & Status System

### Status Color Mapping

```tsx
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
    case 'InProgress':
      return 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
    case 'NotStarted':
    default:
      return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
  }
};
```

### Type Color Mapping

```tsx
const getTypeColor = (type: string): string => {
  return type === 'Course' 
    ? 'bg-sky-500/20 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' 
    : 'bg-violet-500/20 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400';
};
```

### Progress Ring Colors

- **Primary**: Default blue theme color
- **Success**: Green (for completed items)
- **Warning**: Yellow/Orange (for in-progress items)
- **Danger**: Red (for failed/blocked items)

## Typography

### Hierarchy

```css
/* Page Titles */
.text-4xl.md:text-5xl.font-bold.tracking-tight.gradient-text

/* Section Headers */
.text-2xl.font-semibold

/* Descriptions */
.text-lg.text-muted-foreground

/* Card Titles */
.font-semibold.text-lg

/* Body Text */
.text-sm.text-muted-foreground

/* Button Text */
.text-primary-foreground
```

### Gradient Text

```tsx
<h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
  Welcome back!
</h1>
```

## CSS Classes Reference

### Custom Classes (from globals.css)

```css
/* Glass morphism effect */
.glass-card {
  background: hsl(var(--background) / 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border) / 0.5);
  box-shadow: 0 8px 32px hsl(var(--foreground) / 0.1);
}

/* Enhanced glow effect */
.enhanced-glow:hover {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.3);
}

/* Dashboard card animations */
.dashboard-card {
  animation: slideInStagger 0.6s ease-out;
  animation-delay: calc(var(--stagger-index, 0) * 0.1s);
  animation-fill-mode: both;
}

/* GPU acceleration */
.transform-gpu {
  transform: translateZ(0);
  will-change: transform;
}

/* Gradient text */
.gradient-text {
  color: hsl(var(--foreground));
  font-weight: 700;
}
```

### Utility Classes

```css
/* Floating particles system */
.floating-particles /* Fixed positioned particle container */
.particle /* Individual particle styling */

/* Progress animations */
.progress-ring /* Optimized progress ring styling */

/* Performance optimizations */
.transform-gpu /* GPU acceleration */
```

## Implementation Guidelines

### 1. **Page Structure Template**

```tsx
"use client";

import { useState, useEffect } from "react";
import { PerformantAnimatedCard, CardGrid } from "@/components/ui/performant-animated-card";
import { OptimizedProgressRing } from "@/components/ui/optimized-progress-ring";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AdaptiveParticles } from "@/components/ui/floating-particles";
import gsap from "gsap";

export default function StudentPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // GSAP animations
    gsap.fromTo(
      ".dashboard-card",
      { y: 30, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        stagger: 0.1, 
        duration: 0.6, 
        ease: "power2.out"
      }
    );
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Background particles */}
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
            Page Title
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Page description
          </p>
        </div>

        {/* Content Sections */}
        <CardGrid columns={4} gap="lg">
          {/* Cards with staggered animations */}
        </CardGrid>
      </div>
    </div>
  );
}
```

### 2. **Loading States**

```tsx
// Use the built-in skeleton for loading states
if (isPending) {
  return <DashboardLoadingSkeleton message="Loading your content..." />;
}
```

### 3. **Error States**

```tsx
if (isError) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <h2 className="text-xl font-semibold text-destructive">Error</h2>
      <p className="text-center max-w-md">
        {error?.message || 'Something went wrong. Please try again.'}
      </p>
      <AnimatedButton onClick={() => window.location.reload()}>
        Try Again
      </AnimatedButton>
    </div>
  );
}
```

## Common Patterns

### 1. **Statistics Cards**

```tsx
<CardGrid columns={4} gap="md">
  {stats.map((stat, index) => (
    <PerformantAnimatedCard 
      key={stat.id}
      variant="subtle" 
      hoverEffect="scale"
      className="text-center space-y-3"
      staggerIndex={index}
    >
      <div className="flex justify-center">
        <OptimizedProgressRing
          value={stat.value}
          size={70}
          color={stat.color}
          delay={300 + index * 100}
        />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{stat.label}</p>
        <p className="text-2xl font-bold text-foreground">{stat.displayValue}</p>
      </div>
    </PerformantAnimatedCard>
  ))}
</CardGrid>
```

### 2. **Course/Module Cards**

```tsx
<CardGrid columns={4} gap="lg">
  {courses.map((course, index) => (
    <PerformantAnimatedCard 
      key={course.id}
      variant="glass"
      hoverEffect="lift"
      staggerIndex={index}
      className="dashboard-card group h-full flex flex-col"
    >
      {/* Course Header Image */}
      <div className="relative h-40 w-full mb-4 rounded-lg overflow-hidden">
        <img
          src={course.image_url}
          alt={course.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Progress Overlay */}
        <div className="absolute top-2 right-2">
          <OptimizedProgressRing
            value={course.progress}
            size={36}
            strokeWidth={3}
            showValue={false}
            color={getProgressColor(course.progress)}
            delay={800 + index * 100}
          />
        </div>
      </div>

      {/* Course Content */}
      <div className="space-y-4 flex-1 flex flex-col">
        <div>
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{course.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <AnimatedButton className="w-full bg-gradient-to-r from-primary to-accent">
            {getButtonText(course.status)}
          </AnimatedButton>
        </div>
      </div>
    </PerformantAnimatedCard>
  ))}
</CardGrid>
```

### 3. **Status Badges**

```tsx
<span className={cn(
  "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
  getStatusColor(status)
)}>
  {status === 'InProgress' ? 
    <Clock className="h-3 w-3 mr-1" /> : 
    <CheckCircle className="h-3 w-3 mr-1" />
  }
  {status.replace(/([A-Z])/g, ' $1').trim()}
</span>
```

## Inconsistencies & Fixes

### Current Issues Identified

1. **Product Details Page** (`app/product-details/[productId]/page.tsx`):
   - ❌ Uses basic `AnimatedCard` instead of `PerformantAnimatedCard`
   - ❌ Missing `AdaptiveParticles` background
   - ❌ Not using `AnimatedButton` components
   - ❌ No progress rings for visual appeal
   - ❌ Basic gradient implementation instead of proper gradient text

2. **Job Readiness Layout** (`components/job-readiness/JobReadinessLayout.tsx`):
   - ❌ Missing glass card effects
   - ❌ No background particles
   - ❌ Inconsistent spacing patterns
   - ❌ Different gradient text implementation

### Recommended Fixes

#### 1. **Update Product Details Page**

```tsx
// Replace basic imports
import { PerformantAnimatedCard, CardGrid } from "@/components/ui/performant-animated-card";
import { OptimizedProgressRing } from "@/components/ui/optimized-progress-ring";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AdaptiveParticles } from "@/components/ui/floating-particles";

// Update layout structure
return (
  <div className="relative min-h-screen">
    <AdaptiveParticles />
    
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="relative space-y-8">
        {/* Use gradient-text class */}
        <h1 className="text-4xl font-bold tracking-tight gradient-text">
          {productData.name}
        </h1>
        
        {/* Replace AnimatedCard with PerformantAnimatedCard */}
        {productData.modules.map((module, index) => (
          <PerformantAnimatedCard 
            key={module.id}
            variant="glass"
            hoverEffect="lift"
            staggerIndex={index}
            className="dashboard-card"
          >
            {/* Add progress rings for visual appeal */}
            <OptimizedProgressRing
              value={module.progress_percentage}
              size={40}
              color={getProgressColor(module.progress_percentage)}
              delay={200 + index * 100}
            />
            
            {/* Use AnimatedButton */}
            <AnimatedButton className="bg-gradient-to-r from-primary to-accent">
              {getModuleCtaText(module)}
            </AnimatedButton>
          </PerformantAnimatedCard>
        ))}
      </div>
    </div>
  </div>
);
```

#### 2. **Update Job Readiness Layout**

```tsx
// Add missing imports
import { AdaptiveParticles } from "@/components/ui/floating-particles";
import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card";

export function JobReadinessLayout({ children, title, description, showProgress = true }) {
  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {(title || description) && (
            <div className="text-center space-y-4">
              {title && (
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {description}
                </p>
              )}
            </div>
          )}

          {showProgress && (
            <PerformantAnimatedCard variant="glass" className="dashboard-card">
              <OverallProgressDisplay />
            </PerformantAnimatedCard>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
```

## Performance Considerations

### 1. **Animation Performance**
- Use `transform-gpu` class for GPU acceleration
- Implement `prefers-reduced-motion` respect
- Optimize GSAP animations with `will-change` property
- Use passive event listeners for scroll/touch events

### 2. **Memory Management**
- Clean up GSAP animations in useEffect cleanup
- Optimize particle count based on device capabilities
- Use `React.memo` for expensive card components
- Implement virtual scrolling for large lists

### 3. **Loading Optimization**
- Use skeleton loaders during data fetching
- Implement progressive image loading
- Lazy load non-critical animations
- Batch DOM updates for better performance

## Testing Guidelines

### 1. **Animation Testing**
- Test on various devices and screen sizes
- Verify animations work with reduced motion preferences
- Check performance on lower-end devices
- Validate smooth transitions between states

### 2. **Accessibility Testing**
- Ensure proper color contrast ratios
- Test with screen readers
- Verify keyboard navigation works
- Check focus management in modal states

### 3. **Cross-browser Testing**
- Test glassmorphism effects across browsers
- Verify backdrop-filter support and fallbacks
- Check animation performance in different browsers
- Validate responsive behavior

## Migration Checklist

When updating existing pages to match the dashboard design:

- [ ] Replace basic card components with `PerformantAnimatedCard`
- [ ] Add `AdaptiveParticles` background effect
- [ ] Update buttons to use `AnimatedButton`
- [ ] Implement progress rings where appropriate
- [ ] Add staggered animations with proper `staggerIndex`
- [ ] Update typography to use gradient text classes
- [ ] Ensure proper spacing with `space-y-8` pattern
- [ ] Add loading and error states
- [ ] Test animations and performance
- [ ] Verify accessibility compliance

---

**Last Updated**: July 14, 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team

This documentation should be updated whenever new UI patterns are introduced or existing patterns are modified. All student-facing pages should follow these guidelines to ensure a consistent and polished user experience.