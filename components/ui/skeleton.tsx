"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  );
}

// Enhanced skeleton with shimmer effect
function ShimmerSkeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/50",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// Progress ring skeleton
function ProgressRingSkeleton({ 
  size = 80, 
  className 
}: { 
  size?: number; 
  className?: string; 
}) {
  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <ShimmerSkeleton 
        className="rounded-full" 
        style={{ width: size, height: size }} 
      />
    </div>
  );
}

// Card skeleton with predefined layouts
function CardSkeleton({ 
  className,
  variant = "default"
}: { 
  className?: string;
  variant?: "default" | "course" | "analytics" | "assessment";
}) {
  const variants = {
    default: (
      <div className="space-y-4">
        <ShimmerSkeleton className="h-4 w-3/4" />
        <ShimmerSkeleton className="h-3 w-full" />
        <ShimmerSkeleton className="h-3 w-2/3" />
      </div>
    ),
    course: (
      <div className="space-y-4">
        <ShimmerSkeleton className="h-40 w-full rounded-lg" />
        <div className="space-y-2">
          <ShimmerSkeleton className="h-5 w-3/4" />
          <ShimmerSkeleton className="h-3 w-full" />
          <ShimmerSkeleton className="h-3 w-2/3" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <ShimmerSkeleton className="h-3 w-16" />
            <ShimmerSkeleton className="h-3 w-8" />
          </div>
          <ShimmerSkeleton className="h-2 w-full rounded-full" />
        </div>
        <ShimmerSkeleton className="h-10 w-full rounded-md" />
      </div>
    ),
    analytics: (
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <ProgressRingSkeleton size={70} />
        </div>
        <div className="space-y-1">
          <ShimmerSkeleton className="h-3 w-20 mx-auto" />
          <ShimmerSkeleton className="h-6 w-12 mx-auto" />
        </div>
      </div>
    ),
    assessment: (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <ShimmerSkeleton className="h-5 w-3/4" />
            <ShimmerSkeleton className="h-3 w-1/2" />
          </div>
          <ProgressRingSkeleton size={60} />
        </div>
        <ShimmerSkeleton className="h-10 w-full rounded-md" />
      </div>
    )
  };

  return (
    <div className={cn(
      "rounded-lg p-5 bg-card/60 backdrop-blur-sm border border-border",
      className
    )}>
      {variants[variant]}
    </div>
  );
}

// Text skeleton with different sizes
function TextSkeleton({ 
  lines = 1, 
  className 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerSkeleton 
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// Button skeleton
function ButtonSkeleton({ 
  className,
  size = "default" 
}: { 
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 px-3",
    default: "h-10 px-4",
    lg: "h-12 px-6"
  };

  return (
    <ShimmerSkeleton 
      className={cn(
        "rounded-md",
        sizeClasses[size],
        className
      )} 
    />
  );
}

// Grid skeleton for card layouts
function GridSkeleton({ 
  columns = 3, 
  rows = 2, 
  variant = "default",
  gap = "md",
  className 
}: { 
  columns?: 1 | 2 | 3 | 4;
  rows?: number;
  variant?: "default" | "course" | "analytics" | "assessment";
  gap?: "sm" | "md" | "lg";
  className?: string;
}) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6"
  };

  const totalCards = columns * rows;

  return (
    <div className={cn(
      "grid",
      gridClasses[columns],
      gapClasses[gap],
      className
    )}>
      {Array.from({ length: totalCards }).map((_, i) => (
        <CardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  ShimmerSkeleton, 
  ProgressRingSkeleton, 
  CardSkeleton, 
  TextSkeleton, 
  ButtonSkeleton, 
  GridSkeleton 
};
