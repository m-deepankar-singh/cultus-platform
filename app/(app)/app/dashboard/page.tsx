"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatedCard } from "@/components/ui/animated-card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Gauge } from "@/components/ui/gauge";
import { GaugeProgress } from "@/components/analytics/gauge-progress-display";
import gsap from "gsap";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// TypeScript interfaces for the data structure
interface Module {
  id: string;
  name: string;
  type: 'Course' | 'Assessment';
  sequence: number;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  progress_percentage: number;
  completed_at: string | null;
  assessment_score?: number | null;
  assessment_submitted_at?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  product_progress_percentage: number;
  product_status: 'NotStarted' | 'InProgress' | 'Completed' | 'Mixed';
  image_url?: string | null;
  modules: Module[];
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        
        // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
          window.location.href = '/app/login';
          return;
        }
        
        // Get the student record to ensure we have the correct client_id
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('client_id')
      .eq('id', user.id)
      .single();
    
    if (studentError) {
      console.error('Error fetching student data:', studentError);
          setError('Unable to fetch your student profile');
          setLoading(false);
          return;
    }

    if (!studentData || !studentData.client_id) {
      console.error('No client_id found for student');
          setError('Your account is not properly set up with a school or organization');
          setLoading(false);
          return;
        }

        // Fetch product assignments using the client_id from the student record
        const { data, error: productsError } = await supabase
      .from('client_product_assignments')
      .select(`
        product_id,
        products:product_id (
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
        )
      `)
      .eq('client_id', studentData.client_id);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          setError(productsError.message);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          // Get progress data for each module
      const { data: progressData, error: progressError } = await supabase
        .from('student_module_progress')
        .select('module_id, status, progress_percentage, completed_at')
        .eq('student_id', user.id);
      
      if (progressError) {
        console.error('Error fetching module progress:', progressError);
      }
      
      // Map progress data to a lookup object for easier access
      const progressMap = new Map();
      if (progressData) {
            progressData.forEach((progress: any) => {
          progressMap.set(progress.module_id, progress);
        });
      }
      
      // Transform data to the expected format with product status and progress calculation
          const formattedProducts = data.map((item: any) => {
        const modules = item.products.modules.map((module: any) => {
          const progress = progressMap.get(module.id);
          return {
            id: module.id,
            name: module.name,
            type: module.type as 'Course' | 'Assessment',
            sequence: module.sequence,
            status: progress ? progress.status : 'NotStarted',
            progress_percentage: progress ? (progress.progress_percentage || 0) : 0,
            completed_at: progress ? progress.completed_at : null
          };
        });
        
        // Calculate product progress percentage
        let totalProgress = 0;
        modules.forEach((m: Module) => {
          totalProgress += m.progress_percentage;
        });
        const productProgressPercentage = modules.length > 0 ? Math.round(totalProgress / modules.length) : 0;
        
        // Determine product status
        let productStatus: 'NotStarted' | 'InProgress' | 'Completed' | 'Mixed' = 'NotStarted';
        if (modules.length > 0) {
          const allNotStarted = modules.every((m: Module) => m.status === 'NotStarted');
          const allCompleted = modules.every((m: Module) => m.status === 'Completed');
          
          if (allNotStarted) {
            productStatus = 'NotStarted';
          } else if (allCompleted) {
            productStatus = 'Completed';
          } else {
            productStatus = 'InProgress';
          }
        }
        
        return {
          id: item.products.id,
          name: item.products.name,
          description: item.products.description,
          image_url: item.products.image_url,
          modules,
          product_progress_percentage: productProgressPercentage,
          product_status: productStatus
        };
      });
      
          setProducts(formattedProducts);
        }
        
        setLoading(false);
  } catch (error: any) {
    console.error('Error in dashboard page data fetching:', error);
        setError(error.message || 'An unknown error occurred');
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // GSAP animations
  useEffect(() => {
    setMounted(true);
    
    if (!loading) {
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
  }, [loading]);
  
  // Derived statistics
  const coursesInProgress = products.filter(p => p.product_status === 'InProgress').length;
  const completedProducts = products.filter(p => p.product_status === 'Completed').length;
  
  // Get mock upcoming assessments
  const upcomingAssessments = products
    .flatMap(p => p.modules.filter(m => m.type === 'Assessment' && m.status !== 'Completed'))
    .map(assessment => ({
      id: assessment.id,
      title: assessment.name,
      status: assessment.progress_percentage >= 100 ? 'Completed' : assessment.status,
      progress: assessment.progress_percentage
      }))
    .slice(0, 4); // Limit to 4 items
  
  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h2 className="text-xl font-semibold text-destructive">Error</h2>
        <p>{error}</p>
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
                      <span>{product.modules.filter(m => m.status === 'Completed').length}/{product.modules.length} modules</span>
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
