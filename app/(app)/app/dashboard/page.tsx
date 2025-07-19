"use client";

import { useEffect, useState } from "react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Gauge } from "@/components/ui/gauge";
import { GaugeProgress } from "@/components/analytics/gauge-progress-display";
import { PerformantAnimatedCard, CardGrid } from "@/components/ui/performant-animated-card";
import { OptimizedProgressRing, ProgressRingGroup } from "@/components/ui/optimized-progress-ring";
import { AdaptiveParticles } from "@/components/ui/floating-particles";
import { DashboardSkeleton, DashboardLoadingSkeleton } from "@/components/ui/dashboard-skeleton";
import gsap from "gsap";
import { Clock, TrendingUp, Target, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useStudentDashboard } from "@/hooks/queries/student/useDashboard";
import type { Product, Module } from "@/lib/query-options";
import { getNonJobReadinessProducts } from "@/lib/utils/product-utils";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  
  // Replace manual data fetching with TanStack Query
  const { data: allProducts = [], isPending, isError, error } = useStudentDashboard();
  
  // Filter out job readiness products from dashboard display
  const products = getNonJobReadinessProducts(allProducts);
  
  // GSAP animations (unchanged)
  useEffect(() => {
    setMounted(true);
    
    if (!isPending) {
      // Animate cards on mount
      gsap.fromTo(
        ".dashboard-card",
        { 
          y: 30, 
          opacity: 0 
        },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.1, 
          duration: 0.6, 
          ease: "power2.out"
        }
      );
      
      // Animate progress bars
      gsap.fromTo(
        ".progress-bar",
        { width: "0%" },
        { 
          width: (index, target) => {
            return target.getAttribute("data-progress") + "%"
          }, 
          duration: 1, 
          ease: "power2.out",
          delay: 0.5
        }
      );
    }
  }, [isPending]);
  
  // Derived statistics (unchanged logic)
  const coursesInProgress = products.filter((p: Product) => (p.product_status || 'NotStarted') === 'InProgress').length;
  const completedProducts = products.filter((p: Product) => (p.product_status || 'NotStarted') === 'Completed').length;
  
  // Get upcoming assessments (unchanged logic)
  const upcomingAssessments = products
    .flatMap((p: Product) => (p.modules || []).filter((m: Module) => m.type === 'Assessment' && m.status !== 'Completed'))
    .map((assessment: Module) => ({
      id: assessment.id,
      title: assessment.name,
      status: assessment.progress_percentage >= 100 ? 'Completed' : assessment.status,
      progress: assessment.progress_percentage
      }))
    .slice(0, 4); // Limit to 4 items
  
  // Loading state with beautiful skeleton
  if (isPending) {
    return <DashboardLoadingSkeleton message="Loading your personalized dashboard..." />;
  }
  
  // Error state (improved error handling)
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p className="text-center max-w-md">
          {error?.message || 'Failed to load your dashboard. Please try again.'}
        </p>
        <AnimatedButton onClick={() => window.location.reload()}>
          Try Again
        </AnimatedButton>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-screen">
      {/* Ambient background particles */}
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        {/* Enhanced Hero Section */}
        <div className="flex flex-col space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
            Welcome back!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Continue your learning journey and track your progress with your personalized dashboard.
          </p>
          
        </div>
      
      {/* Detailed Progress Overview */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="glow"
        staggerIndex={1}
        className="dashboard-card"
      >
        <div className="flex flex-col space-y-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Learning Analytics</h2>
          </div>
          
          <CardGrid columns={4} gap="md">
            <PerformantAnimatedCard 
              variant="subtle" 
              hoverEffect="scale"
              className="text-center space-y-3"
              staggerIndex={2}
            >
              <div className="flex justify-center">
                <OptimizedProgressRing
                  value={Math.round(products.reduce((acc, p) => 
                    acc + ((p.product_status || 'NotStarted') === 'InProgress' ? 1 : 0), 0) / (products.length || 1) * 100)}
                  size={70}
                  color="warning"
                  delay={300}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Courses</p>
                <p className="text-2xl font-bold text-foreground">{coursesInProgress}</p>
              </div>
            </PerformantAnimatedCard>

            <PerformantAnimatedCard 
              variant="subtle" 
              hoverEffect="scale"
              className="text-center space-y-3"
              staggerIndex={3}
            >
              <div className="flex justify-center">
                <OptimizedProgressRing
                  value={Math.round((completedProducts / (products.length || 1)) * 100)}
                  size={70}
                  color="success"
                  delay={400}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedProducts}</p>
              </div>
            </PerformantAnimatedCard>

            <PerformantAnimatedCard 
              variant="subtle" 
              hoverEffect="scale"
              className="text-center space-y-3"
              staggerIndex={4}
            >
              <div className="flex justify-center">
                <OptimizedProgressRing
                  value={Math.round(products.reduce((acc, p) => acc + (p.product_progress_percentage || 0), 0) / (products.length || 1))}
                  size={70}
                  color="primary"
                  delay={500}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(products.reduce((acc, p) => acc + (p.product_progress_percentage || 0), 0) / (products.length || 1))}%
                </p>
              </div>
            </PerformantAnimatedCard>

            <PerformantAnimatedCard 
              variant="subtle" 
              hoverEffect="scale"
              className="text-center space-y-3"
              staggerIndex={5}
            >
              <div className="flex justify-center">
                <OptimizedProgressRing
                  value={products.length > 0 ? 100 : 0}
                  size={70}
                  color="primary"
                  delay={600}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold text-foreground">{products.length}</p>
              </div>
            </PerformantAnimatedCard>
          </CardGrid>
        </div>
      </PerformantAnimatedCard>
      
      {/* Your Courses */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Your Courses</h2>
        </div>
        
        {products.length === 0 ? (
          <PerformantAnimatedCard 
            variant="glass" 
            className="dashboard-card text-center py-12"
            staggerIndex={6}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No courses assigned yet</h3>
                <p className="text-muted-foreground">
                  Your learning journey will begin here once courses are assigned to you.
                </p>
              </div>
            </div>
          </PerformantAnimatedCard>
        ) : (
          <CardGrid columns={4} gap="lg">
            {products.map((product, index) => (
              <PerformantAnimatedCard 
                key={product.id} 
                variant="glass"
                hoverEffect="lift"
                staggerIndex={6 + index}
                className="dashboard-card group h-full flex flex-col"
              >
                {/* Course Header Image */}
                <div className="relative h-40 w-full mb-4 rounded-lg overflow-hidden">
                  {product.image_url ? (
                    <>
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Hide broken image and show fallback
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling?.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        onLoad={(e) => {
                          // Ensure gradient overlay is visible once image loads
                          const overlay = e.currentTarget.nextElementSibling as HTMLElement;
                          if (overlay) overlay.style.display = 'block';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                      {/* Fallback for failed image loads */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/40 items-center justify-center hidden">
                        <BookOpen className="w-16 h-16 text-white/80" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/40 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/80" />
                    </div>
                  )}
                  
                  {/* Progress Overlay */}
                  <div className="absolute top-2 right-2">
                    <OptimizedProgressRing
                      value={product.product_progress_percentage || 0}
                      size={36}
                      strokeWidth={3}
                      showValue={false}
                      color={
                        product.product_progress_percentage || 0 < 30 ? "danger" : 
                        product.product_progress_percentage || 0 < 60 ? "warning" : 
                        product.product_progress_percentage || 0 < 85 ? "warning" : 
                        "success"
                      }
                      delay={800 + index * 100}
                    />
                  </div>
                  
                  {/* Module Count */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex justify-between items-center text-sm text-white">
                      <span className="bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                        {(product.modules || []).filter((m: Module) => m.status === 'Completed').length}/{(product.modules || []).length} modules
                      </span>
                      <span className="bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                        {product.product_progress_percentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Course Content */}
                <div className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || "Enhance your skills with this comprehensive course."}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{product.product_progress_percentage || 0}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${mounted ? product.product_progress_percentage || 0 : 0}%`,
                          transitionDelay: `${1000 + index * 100}ms`
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto">
                    <Link href={`/app/product-details/${product.id}`} className="block">
                      <AnimatedButton className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground">
                        {(product.product_status || 'NotStarted') === 'NotStarted' ? 'Start Learning' : 
                         (product.product_status || 'NotStarted') === 'Completed' ? 'View Certificate' : 'Continue Learning'}
                      </AnimatedButton>
                    </Link>
                  </div>
                </div>
              </PerformantAnimatedCard>
            ))}
          </CardGrid>
        )}
      </div>
      
      {/* Upcoming Assessments */}
      {upcomingAssessments.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Upcoming Assessments</h2>
          </div>
          
          <CardGrid columns={2} gap="lg">
            {upcomingAssessments.map((assessment, index) => (
              <PerformantAnimatedCard 
                key={assessment.id} 
                variant="glass"
                hoverEffect="glow"
                staggerIndex={10 + index}
                className="dashboard-card"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg">{assessment.title}</h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Status: {assessment.status}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <OptimizedProgressRing
                        value={assessment.progress}
                        size={60}
                        color={
                          assessment.progress < 30 ? "danger" : 
                          assessment.progress < 70 ? "warning" : 
                          "success"
                        }
                        delay={1200 + index * 150}
                      />
                    </div>
                  </div>
                  
                  <Link href={`/app/assessment/${assessment.id}/take`} className="block">
                    <AnimatedButton className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground">
                      {assessment.status === 'Completed' ? 'View Results' : 
                       assessment.status === 'NotStarted' ? 'Start Assessment' : 
                       'Continue Assessment'}
                    </AnimatedButton>
                  </Link>
                </div>
              </PerformantAnimatedCard>
            ))}
          </CardGrid>
        </div>
      )}
      </div>
    </div>
  );
}
