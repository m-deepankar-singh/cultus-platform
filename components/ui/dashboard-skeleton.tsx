"use client";

import { 
  ShimmerSkeleton, 
  ProgressRingSkeleton, 
  CardSkeleton, 
  TextSkeleton, 
  GridSkeleton,
  ButtonSkeleton 
} from "@/components/ui/skeleton";
import { AdaptiveParticles } from "@/components/ui/floating-particles";
import { cn } from "@/lib/utils";

// Main dashboard skeleton component
export function DashboardSkeleton() {
  return (
    <div className="relative min-h-screen">
      {/* Ambient background particles */}
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        {/* Hero Section Skeleton */}
        <HeroSectionSkeleton />
        
        {/* Analytics Section Skeleton */}
        <AnalyticsSectionSkeleton />
        
        {/* Courses Section Skeleton */}
        <CoursesSectionSkeleton />
        
        {/* Assessments Section Skeleton */}
        <AssessmentsSectionSkeleton />
      </div>
    </div>
  );
}

// Hero section skeleton
function HeroSectionSkeleton() {
  return (
    <div className="flex flex-col space-y-4 text-center">
      {/* Welcome text skeleton */}
      <div className="space-y-2">
        <ShimmerSkeleton className="h-12 w-80 mx-auto rounded-lg" />
        <ShimmerSkeleton className="h-5 w-96 mx-auto" />
      </div>
      
      {/* Progress rings overview skeleton */}
      <div className="mt-8">
        <div className="flex items-center justify-center space-x-6">
          {[100, 80, 80].map((size, index) => (
            <div key={index} className="flex flex-col items-center space-y-2">
              <ProgressRingSkeleton size={size} />
              <ShimmerSkeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Analytics section skeleton
function AnalyticsSectionSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="flex flex-col space-y-6">
        {/* Section header skeleton */}
        <div className="flex items-center space-x-2">
          <ShimmerSkeleton className="h-6 w-6" />
          <ShimmerSkeleton className="h-7 w-40" />
        </div>
        
        {/* Analytics cards grid skeleton */}
        <GridSkeleton 
          columns={4} 
          rows={1} 
          variant="analytics" 
          gap="md" 
        />
      </div>
    </div>
  );
}

// Courses section skeleton
function CoursesSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Section header skeleton */}
      <div className="flex items-center space-x-2">
        <ShimmerSkeleton className="h-6 w-6" />
        <ShimmerSkeleton className="h-7 w-32" />
      </div>
      
      {/* Courses grid skeleton */}
      <GridSkeleton 
        columns={4} 
        rows={2} 
        variant="course" 
        gap="lg" 
      />
    </div>
  );
}

// Assessments section skeleton
function AssessmentsSectionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Section header skeleton */}
      <div className="flex items-center space-x-2">
        <ShimmerSkeleton className="h-6 w-6" />
        <ShimmerSkeleton className="h-7 w-48" />
      </div>
      
      {/* Assessments grid skeleton */}
      <GridSkeleton 
        columns={2} 
        rows={1} 
        variant="assessment" 
        gap="lg" 
      />
    </div>
  );
}

// Individual component skeletons for specific use cases

export function ProgressOverviewSkeleton() {
  return (
    <div className="flex items-center justify-center space-x-6">
      {[100, 80, 80].map((size, index) => (
        <div key={index} className="flex flex-col items-center space-y-2">
          <ProgressRingSkeleton size={size} />
          <ShimmerSkeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CourseCardSkeleton({ className }: { className?: string }) {
  return (
    <CardSkeleton 
      variant="course" 
      className={cn("glass-card", className)} 
    />
  );
}

export function AnalyticsCardSkeleton({ className }: { className?: string }) {
  return (
    <CardSkeleton 
      variant="analytics" 
      className={cn("bg-card/60 backdrop-blur-sm", className)} 
    />
  );
}

export function AssessmentCardSkeleton({ className }: { className?: string }) {
  return (
    <CardSkeleton 
      variant="assessment" 
      className={cn("glass-card", className)} 
    />
  );
}

// Compact skeleton for mobile
export function CompactDashboardSkeleton() {
  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="relative space-y-6">
        {/* Compact hero */}
        <div className="text-center space-y-3">
          <ShimmerSkeleton className="h-8 w-64 mx-auto" />
          <ShimmerSkeleton className="h-4 w-80 mx-auto" />
          
          {/* Single progress ring */}
          <div className="mt-6">
            <ProgressRingSkeleton size={80} className="mx-auto" />
            <ShimmerSkeleton className="h-3 w-24 mx-auto mt-2" />
          </div>
        </div>
        
        {/* Compact analytics */}
        <div className="bg-card/60 backdrop-blur-sm p-4 rounded-lg">
          <div className="space-y-4">
            <ShimmerSkeleton className="h-6 w-32" />
            <GridSkeleton columns={2} rows={1} variant="analytics" />
          </div>
        </div>
        
        {/* Compact courses */}
        <div className="space-y-4">
          <ShimmerSkeleton className="h-6 w-28" />
          <GridSkeleton columns={1} rows={3} variant="course" />
        </div>
      </div>
    </div>
  );
}

// Loading state with custom message
export function DashboardLoadingSkeleton({ 
  message = "Loading your dashboard...",
  showProgress = true 
}: { 
  message?: string;
  showProgress?: boolean;
}) {
  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="relative">
        {/* Loading message */}
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
          {showProgress && (
            <div className="relative">
              <ProgressRingSkeleton size={120} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          )}
          
          <div className="text-center space-y-2">
            <ShimmerSkeleton className="h-6 w-64 mx-auto" />
            <p className="text-muted-foreground">{message}</p>
          </div>
        </div>
        
        {/* Background skeleton content */}
        <div className="opacity-30">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
}