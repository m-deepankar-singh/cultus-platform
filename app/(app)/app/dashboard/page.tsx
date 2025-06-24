"use client";

import { useEffect, useState } from "react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Gauge } from "@/components/ui/gauge";
import { GaugeProgress } from "@/components/analytics/gauge-progress-display";
import gsap from "gsap";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useStudentDashboard } from "@/hooks/queries/student/useDashboard";
import type { Product, Module } from "@/lib/query-options";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  
  // Replace manual data fetching with TanStack Query
  const { data: products = [], isPending, isError, error } = useStudentDashboard();
  
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
  const coursesInProgress = products.filter((p: Product) => p.product_status === 'InProgress').length;
  const completedProducts = products.filter((p: Product) => p.product_status === 'Completed').length;
  
  // Get upcoming assessments (unchanged logic)
  const upcomingAssessments = products
    .flatMap((p: Product) => p.modules.filter((m: Module) => m.type === 'Assessment' && m.status !== 'Completed'))
    .map((assessment: Module) => ({
      id: assessment.id,
      title: assessment.name,
      status: assessment.progress_percentage >= 100 ? 'Completed' : assessment.status,
      progress: assessment.progress_percentage
      }))
    .slice(0, 4); // Limit to 4 items
  
  // Loading state (improved UX)
  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-600"></div>
        <span className="ml-2">Loading your dashboard...</span>
      </div>
    );
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
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-400">
          Welcome back!
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Continue your learning journey and track your progress.
        </p>
      </div>
      
      {/* Progress Overview */}
      <AnimatedCard className="dashboard-card">
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-white">Your Learning Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2 bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-800/30">
              <div className="mb-2">
                <GaugeProgress
                  percentComplete={Math.round(products.reduce((acc, p) => 
                    acc + (p.product_status === 'InProgress' ? 1 : 0), 0) / (products.length || 1) * 100)}
                  size={80}
                  variant="info"
                  showLabel={false}
                />
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Products In Progress</span>
              <span className="text-2xl font-bold text-neutral-800 dark:text-white">{coursesInProgress}</span>
            </div>
            <div className="p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2 bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-800/30">
              <div className="mb-2">
                <GaugeProgress
                  percentComplete={Math.round((completedProducts / (products.length || 1)) * 100)}
                  size={80}
                  variant="success"
                  showLabel={false}
                />
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Completed Products</span>
              <span className="text-2xl font-bold text-neutral-800 dark:text-white">{completedProducts}</span>
            </div>
            <div className="p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2 bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-800/30">
              <div className="mb-2">
                <Gauge
                  value={Math.round(products.reduce((acc, p) => acc + p.product_progress_percentage, 0) / (products.length || 1))}
                  size={80}
                  primary={{
                    0: "danger",
                    30: "warning",
                    60: "info",
                    85: "success"
                  }}
                  strokeWidth={8}
                />
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Average Progress</span>
              <span className="text-2xl font-bold text-neutral-800 dark:text-white">
                {Math.round(products.reduce((acc, p) => acc + p.product_progress_percentage, 0) / (products.length || 1))}%
              </span>
            </div>
          </div>
        </div>
      </AnimatedCard>
      
      {/* Products */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-white">Your Products</h2>
        </div>
        {products.length === 0 ? (
          <AnimatedCard className="dashboard-card">
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-400">No products assigned yet.</p>
            </div>
          </AnimatedCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <AnimatedCard key={product.id} className="dashboard-card">
                <div className="relative h-32 w-full mb-4 rounded-md overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={{ backgroundImage: product.image_url ? `url(${product.image_url})` : 'linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.4))' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex justify-between items-center text-sm text-white">
                      <span>{product.modules.filter((m: Module) => m.status === 'Completed').length}/{product.modules.length} modules</span>
                    </div>
                    <div className="h-1 bg-white/30 rounded-full mt-1">
                      <div 
                        className="h-full bg-neutral-300 dark:bg-white rounded-full progress-bar" 
                        data-progress={product.product_progress_percentage}
                        style={{ width: `${mounted ? product.product_progress_percentage : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-neutral-800 dark:text-white">{product.name}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1 mb-4">{product.description || "No description available"}</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <Link href={`/app/product-details/${product.id}`} passHref>
                      <AnimatedButton className="w-full bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900">
                        {product.product_status === 'NotStarted' ? 'Start Learning' : 
                         product.product_status === 'Completed' ? 'View Details' : 'Continue Learning'}
                      </AnimatedButton>
                    </Link>
                  </div>
                  <div className="flex-shrink-0">
                    <Gauge 
                      value={product.product_progress_percentage}
                      size={50}
                      strokeWidth={5}
                      primary={
                        product.product_progress_percentage < 30 ? "danger" : 
                        product.product_progress_percentage < 60 ? "warning" : 
                        product.product_progress_percentage < 85 ? "info" : 
                        "success"
                      }
                      showValue={false}
                    />
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
      </div>
      
      {/* Upcoming Assessments */}
      {upcomingAssessments.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-white">Upcoming Assessments</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingAssessments.map((assessment) => (
              <AnimatedCard key={assessment.id} className="dashboard-card">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-800 dark:text-white">{assessment.title}</h3>
                    <div className="flex items-center mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Status: {assessment.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Gauge 
                      value={assessment.progress} 
                      size={60}
                      primary={assessment.progress < 30 ? "danger" : assessment.progress < 70 ? "warning" : "info"}
                      strokeWidth={6}
                    />
                  </div>
                </div>
                <Link href={`/app/assessment/${assessment.id}/take`} passHref>
                  <AnimatedButton className="w-full mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900">
                    {assessment.status === 'Completed' ? 'View Results' : assessment.status === 'NotStarted' ? 'Start Assessment' : 'Continue Assessment'}
                  </AnimatedButton>
                </Link>
              </AnimatedCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
