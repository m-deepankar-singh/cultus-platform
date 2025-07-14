"use client";

import React, { useState, use, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Target, 
  ChevronRight, 
  Image as ImageIcon, 
  CheckCircle2, 
  Clock, 
  PlayCircle,
  GraduationCap,
  Award,
  AlertCircle
} from 'lucide-react';
import { AssessmentResultModal } from '@/components/assessment/assessment-result-modal';
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card';
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AdaptiveParticles } from '@/components/ui/floating-particles';
import { cn } from '@/lib/utils';
import gsap from 'gsap';

interface ProductDetailsPageProps {
  params: Promise<{
    productId: string;
  }>;
}

// Interfaces for fetched data
interface ModuleDetail {
  id: string;
  name: string;
  type: 'Course' | 'Assessment';
  sequence: number;
  // Progress fields will be added
  status: 'NotStarted' | 'InProgress' | 'Completed';
  progress_percentage: number;
  completed_at: string | null;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  modules: ModuleDetail[];
}

interface ModuleProgressDetail {
  module_id: string;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  progress_percentage: number | null;
  completed_at: string | null;
}

// Helper function to get the correct navigation link for a module
const getModuleLink = (module: ModuleDetail): string => {
  if (module.type === 'Assessment') {
    // For completed assessments, we'll use the modal instead
    if (module.status === 'Completed') {
      return '#'; // Placeholder, we'll handle this with the modal
    }
    return `/app/assessment/${module.id}/take`; 
  } else {
    return `/app/course/${module.id}`;
  }
};

// Helper function to get the CTA text
const getModuleCtaText = (module: ModuleDetail): string => {
  switch (module.status) {
    case 'Completed':
      return module.type === 'Assessment' ? 'View Results' : 'Review Course';
    case 'InProgress':
      return module.type === 'Assessment' ? 'Continue Assessment' : 'Continue Course';
    case 'NotStarted':
    default:
      return module.type === 'Assessment' ? 'Start Assessment' : 'Start Course';
  }
};

// Status color helper
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

// Progress color helper for OptimizedProgressRing
const getProgressColor = (progress: number): 'primary' | 'success' | 'warning' | 'danger' => {
  if (progress >= 100) return 'success';
  if (progress >= 50) return 'warning';
  if (progress > 0) return 'primary';
  return 'primary';
};

// Type color helper
const getTypeColor = (type: string): string => {
  return type === 'Course' 
    ? 'bg-sky-500/20 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' 
    : 'bg-violet-500/20 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400';
};

// Status icon helper
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'InProgress':
      return <Clock className="h-4 w-4" />;
    default:
      return <PlayCircle className="h-4 w-4" />;
  }
};

// This is now a Client Component
export default function ProductDetailsPage({ params: paramsProp }: ProductDetailsPageProps) {
  const params = use(paramsProp); // Unwrap params with use()
  const { productId } = params;
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productData, setProductData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const supabase = createClient();
        
        // 1. Authenticate User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/app/login';
          return;
        }

        // 2. Fetch Product Details and Modules
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            image_url,
            modules (
              id,
              name,
              type,
              sequence
            )
          `)
          .eq('id', productId)
          .single();

        if (productError || !productData) {
          throw new Error(productError?.message || 'Error fetching product details');
        }
        
        // Check if student has access to this product
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('client_id')
          .eq('id', user.id)
          .single();

        if (studentError || !studentData?.client_id) {
          throw new Error(studentError?.message || 'Error checking student client');
        }
        
        const { count: assignmentCount, error: assignmentError } = await supabase
          .from('client_product_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', studentData.client_id)
          .eq('product_id', productId);
          
        if (assignmentError || assignmentCount === 0) {
          throw new Error('You do not have access to this product');
        }

        // 3. 🚀 ENHANCED: Fetch Module Progress with proper completion calculation
        const moduleIds = productData.modules.map(m => m.id);
        let modulesWithProgress: ModuleDetail[] = [];

        if (moduleIds.length > 0) {
          // Fetch progress with detailed progress_details for proper completion calculation
          const { data: progressData, error: progressError } = await supabase
            .from('student_module_progress')
            .select('module_id, status, progress_percentage, completed_at, progress_details, completed_videos, video_completion_count')
            .eq('student_id', user.id)
            .in('module_id', moduleIds);

          if (progressError) {
            console.error('Error fetching module progress:', progressError);
          }

          const progressMap = new Map<string, any>();
          if (progressData) {
            progressData.forEach((p: any) => progressMap.set(p.module_id, p));
          }

          // 🚀 ENHANCED: Calculate proper completion status for each module
          const modulesWithCorrectStatus = await Promise.all(
            productData.modules.map(async (module: any) => {
              const progress = progressMap.get(module.id);
              let correctStatus = progress ? progress.status : 'NotStarted';
              let correctPercentage = progress ? (progress.progress_percentage ?? 0) : 0;

              // For courses, recalculate status based on lesson completion + quiz completion
              if (module.type === 'Course') {
                const { data: allLessons, error: lessonsError } = await supabase
                  .from('lessons')
                  .select('id, has_quiz')
                  .eq('module_id', module.id);

                if (!lessonsError && allLessons && allLessons.length > 0) {
                  let completedLessonsCount = 0;
                  const progressDetails = progress?.progress_details || {};

                                     for (const lesson of allLessons) {
                    // Check video completion in both possible locations for maximum compatibility
                    const isVideoWatchedInArray = progress?.completed_videos?.includes(lesson.id) || false;
                    const isVideoWatchedInDetails = progressDetails.fully_watched_video_ids?.includes(lesson.id) || false;
                    const isVideoWatched = isVideoWatchedInArray || isVideoWatchedInDetails;
                    let isQuizPassedOrNotRequired = true;



                    // If lesson has a quiz, check if it's been passed
                    if (lesson.has_quiz) {
                      // Check both possible quiz result formats for maximum compatibility
                      const quizResult = progressDetails.lesson_quiz_results?.[lesson.id];
                      const quizAttempts = progressDetails.lesson_quiz_attempts?.[lesson.id];
                      
                      const passedInQuizResults = quizResult?.passed === true;
                      const passedInQuizAttempts = Array.isArray(quizAttempts) && 
                        quizAttempts.some((att: any) => att.pass_fail_status === 'passed');
                      
                      isQuizPassedOrNotRequired = passedInQuizResults || passedInQuizAttempts;
                    }

                    // Lesson is complete if video watched AND (no quiz OR quiz passed)
                    if (isVideoWatched && isQuizPassedOrNotRequired) {
                      completedLessonsCount += 1;
                    }
                  }

                                     // Recalculate status and percentage based on actual completion
                   const allLessonsCompleted = completedLessonsCount >= allLessons.length;
                   correctPercentage = allLessons.length > 0 
                     ? Math.round((completedLessonsCount / allLessons.length) * 100) 
                     : 0;


                   
                   if (allLessonsCompleted) {
                     correctStatus = 'Completed';
                     correctPercentage = 100;
                     
                     // 🚀 ENHANCEMENT: Update database if status is not already 'Completed'
                     if (progress.status !== 'Completed') {
                       // Trigger a silent update to fix the database status
                       supabase
                         .from('student_module_progress')
                         .update({ 
                           status: 'Completed', 
                           progress_percentage: 100,
                           completed_at: new Date().toISOString()
                         })
                         .eq('student_id', user.id)
                         .eq('module_id', module.id)
                         .then(({ error }) => {
                           if (error) {
                             console.error('Failed to update course completion status:', error);
                           }
                         });
                     }
                   } else if (completedLessonsCount > 0) {
                     correctStatus = 'InProgress';
                   } else {
                     correctStatus = 'NotStarted';
                   }
                }
              }

              return {
                ...module,
                type: module.type as 'Course' | 'Assessment',
                status: correctStatus,
                progress_percentage: correctPercentage,
                completed_at: progress ? progress.completed_at : null,
              };
            })
          );

          modulesWithProgress = modulesWithCorrectStatus.sort((a, b) => a.sequence - b.sequence);
          
        } else {
          modulesWithProgress = []; // No modules in the product
        }

        setProductData({
          ...productData,
          modules: modulesWithProgress,
        });
      } catch (err: any) {
        console.error('Error loading product details:', err);
        setError(err.message || 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [productId]);

  // GSAP animations for entry
  useEffect(() => {
    if (!loading && productData && mounted) {
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
  }, [loading, productData, mounted]);

  // Handle assessment result view
  const handleViewResult = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="container mx-auto py-12 px-4 md:px-0">
          <div className="space-y-8 animate-pulse">
            {/* Header skeleton */}
            <div className="space-y-3">
              <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-3/4"></div>
              <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-1/2"></div>
            </div>
            {/* Image skeleton */}
            <div className="aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
            {/* Module skeletons */}
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="flex flex-col items-center justify-center h-full space-y-4 container mx-auto py-24">
          <PerformantAnimatedCard variant="glass" hoverEffect="none" className="max-w-md w-full">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-destructive">Error</h2>
              <p className="text-center max-w-md text-muted-foreground">
                {error || 'Something went wrong. Please try again.'}
              </p>
              <AnimatedButton onClick={() => window.location.reload()} className="bg-gradient-to-r from-primary to-accent">
                Try Again
              </AnimatedButton>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="relative min-h-screen">
        <AdaptiveParticles />
        <div className="flex flex-col items-center justify-center h-full space-y-4 container mx-auto py-24">
          <PerformantAnimatedCard variant="glass" hoverEffect="none" className="max-w-md w-full">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold">Product Not Found</h2>
              <p className="text-center max-w-md text-muted-foreground">
                The product you're looking for doesn't exist or you don't have access to it.
              </p>
              <Link href="/app/dashboard">
                <AnimatedButton className="bg-gradient-to-r from-primary to-accent">
                  Back to Dashboard
                </AnimatedButton>
              </Link>
            </div>
          </PerformantAnimatedCard>
        </div>
      </div>
    );
  }

  // 4. Render UI
  return (
    <div className="relative min-h-screen">
      {/* Background particles */}
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        {/* Hero Section */}
        <div className="container mx-auto pt-8 px-4 md:px-0">
          <div className="flex flex-col space-y-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
              {productData.name}
            </h1>
            {productData.description && 
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {productData.description}
              </p>
            }
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {productData.modules.filter(m => m.type === 'Course').length} Courses
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {productData.modules.filter(m => m.type === 'Assessment').length} Assessments
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-0">
          {/* Modules Section */}
          <div className="space-y-6 pb-12">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">
                Learning Modules
              </h2>
            </div>
            
            {productData.modules.length > 0 ? (
              <div className="space-y-4">
                {productData.modules.map((module, index) => (
                  <PerformantAnimatedCard 
                    key={module.id}
                    variant="glass"
                    hoverEffect="lift"
                    staggerIndex={index}
                    className="dashboard-card group h-full"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="flex-grow space-y-4">
                          {/* Module Header with Progress Ring */}
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <OptimizedProgressRing
                                value={module.progress_percentage || 0}
                                size={60}
                                color={getProgressColor(module.progress_percentage)}
                                delay={300 + index * 100}
                                showValue={false}
                              />
                            </div>
                            <div className="flex-grow space-y-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className={cn(
                                  "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
                                  getTypeColor(module.type)
                                )}>
                                  {module.type === 'Course' ? 
                                    <BookOpen className="h-3 w-3 mr-1" /> : 
                                    <Target className="h-3 w-3 mr-1" />
                                  }
                                  {module.type}
                                </span>
                                <h3 className="font-semibold text-lg">
                                  {module.name}
                                </h3>
                              </div>
                      
                              {/* Status Section */}
                              <div className="flex flex-wrap items-center gap-4">
                                <span className={cn(
                                  "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
                                  getStatusColor(module.status)
                                )}>
                                  {getStatusIcon(module.status)}
                                  {module.status.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                
                                {/* Progress text */}
                                <span className="text-sm text-muted-foreground">
                                  {module.progress_percentage}% Complete
                                </span>
                                
                                {/* Completion date for completed modules */}
                                {module.status === 'Completed' && module.completed_at && (
                                  <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>{new Date(module.completed_at).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex-shrink-0">
                          {module.type === 'Assessment' && module.status === 'Completed' ? (
                            <AnimatedButton 
                              className="bg-gradient-to-r from-primary to-accent"
                              onClick={() => handleViewResult(module.id)}
                            >
                              View Results
                            </AnimatedButton>
                          ) : (
                            <Link href={getModuleLink(module)} passHref>
                              <AnimatedButton className="bg-gradient-to-r from-primary to-accent">
                                {getModuleCtaText(module)}
                              </AnimatedButton>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </PerformantAnimatedCard>
                ))}
              </div>
            ) : (
              <PerformantAnimatedCard variant="glass" className="dashboard-card py-16">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-neutral-400 dark:text-neutral-600" />
                  </div>
                  <h3 className="text-lg font-medium">
                    No Modules Available
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    This product currently has no modules. Please check back later or contact your administrator.
                  </p>
                  <Link href="/app/dashboard">
                    <AnimatedButton className="bg-gradient-to-r from-primary to-accent">
                      Back to Dashboard
                    </AnimatedButton>
                  </Link>
                </div>
              </PerformantAnimatedCard>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Result Modal */}
      {selectedAssessmentId && (
        <AssessmentResultModal
          assessmentId={selectedAssessmentId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}