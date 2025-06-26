"use client";  // Change to client component

import React, { useState, use } from 'react';
import { createClient } from '@/lib/supabase/client'; // Changed to client
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Target, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { AssessmentResultModal } from '@/components/assessment/assessment-result-modal';
import { AnimatedCard } from '@/components/ui/animated-card';
import { cn } from '@/lib/utils';

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
    default:
      return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
  }
};

// Type color helper
const getTypeColor = (type: string): string => {
  return type === 'Course' 
    ? 'bg-sky-500/20 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' 
    : 'bg-violet-500/20 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400';
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

  React.useEffect(() => {
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

  // Handle assessment result view
  const handleViewResult = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-400 dark:border-neutral-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0">
        <AnimatedCard className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300">
          <div className="p-4">{error}</div>
        </AnimatedCard>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0">
        <AnimatedCard className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 backdrop-blur-sm text-amber-700 dark:text-amber-300">
          <div className="p-4">Product not found</div>
        </AnimatedCard>
      </div>
    );
  }

  // 4. Render UI
  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-400">
          {productData.name}
        </h1>
        {productData.description && 
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            {productData.description}
          </p>
        }
      </div>

      {/* Product Image */}
      {productData.image_url && (
        <div className="mb-8">
          <AnimatedCard className="overflow-hidden">
            <div className="relative w-full aspect-video">
              <Image
                src={productData.image_url}
                alt={productData.name || "Product image"}
                fill
                className="object-cover"
              />
            </div>
          </AnimatedCard>
        </div>
      )}

      <div className="space-y-4">
        {productData.modules.length > 0 ? (
          productData.modules.map((module) => (
            <AnimatedCard 
              key={module.id} 
              className="overflow-hidden border border-white/20 dark:border-neutral-800/30"
            >
              <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                     {/* Module type badge */}
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
                     <h3 className="text-lg font-semibold text-neutral-800 dark:text-white ml-1">
                       {module.name}
                     </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm ml-0 md:ml-6">
                    <span className="text-neutral-500 dark:text-neutral-400">Status:</span>
                     <span className={cn(
                       "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                       getStatusColor(module.status)
                     )}>
                       {module.status.replace(/([A-Z])/g, ' $1').trim()}
                     </span>
                     {/* Show progress bar and percentage only when In Progress */}
                     {module.status === 'InProgress' && (
                       <div className="flex items-center gap-2 ml-1">
                         <Progress value={module.progress_percentage} className="w-24 h-2" />
                         <span className="text-neutral-500 dark:text-neutral-400">({module.progress_percentage}%)</span>
                       </div>
                     )}
                  </div>
                </div>
                {/* Action buttons with consistent styling */}
                {module.type === 'Assessment' && module.status === 'Completed' ? (
                  <Button 
                    className="w-full md:w-auto mt-2 md:mt-0 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
                    onClick={() => handleViewResult(module.id)}
                  >
                    View Results <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Link href={getModuleLink(module)} passHref>
                    <Button 
                      className={cn(
                        "w-full md:w-auto mt-2 md:mt-0",
                        module.status === 'Completed' 
                          ? "bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 dark:from-emerald-500 dark:to-emerald-600 dark:hover:from-emerald-400 dark:hover:to-emerald-500 text-white"
                          : "bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
                      )}
                    >
                      {getModuleCtaText(module)} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </AnimatedCard>
          ))
        ) : (
          <AnimatedCard>
            <div className="p-6 text-center">
              <p className="text-neutral-500 dark:text-neutral-400">This product currently has no modules.</p>
            </div>
          </AnimatedCard>
        )}
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