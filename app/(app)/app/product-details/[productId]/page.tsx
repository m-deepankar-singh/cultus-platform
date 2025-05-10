"use client";  // Change to client component

import React, { useState, use } from 'react';
import { createClient } from '@/lib/supabase/client'; // Changed to client
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Target } from 'lucide-react';
import { AssessmentResultModal } from '@/components/assessment/assessment-result-modal';

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

        // 3. Fetch Module Progress
        const moduleIds = productData.modules.map(m => m.id);
        let modulesWithProgress: ModuleDetail[] = [];

        if (moduleIds.length > 0) {
          const { data: progressData, error: progressError } = await supabase
            .from('student_module_progress')
            .select('module_id, status, progress_percentage, completed_at')
            .eq('student_id', user.id)
            .in('module_id', moduleIds);

          if (progressError) {
            console.error('Error fetching module progress:', progressError);
          }

          const progressMap = new Map<string, ModuleProgressDetail>();
          if (progressData) {
            progressData.forEach((p: any) => progressMap.set(p.module_id, p));
          }

          // Combine module data with progress data
          modulesWithProgress = productData.modules.map((module: any) => {
            const progress = progressMap.get(module.id);
            return {
              ...module,
              type: module.type as 'Course' | 'Assessment', // Type assertion
              status: progress ? progress.status : 'NotStarted',
              progress_percentage: progress ? (progress.progress_percentage ?? 0) : 0,
              completed_at: progress ? progress.completed_at : null,
            };
          }).sort((a, b) => a.sequence - b.sequence); // Ensure sorted by sequence
          
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0">
        <div className="p-4 bg-destructive/10 rounded-md text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0">
        <div className="p-4 bg-destructive/10 rounded-md text-destructive">
          Product not found
        </div>
      </div>
    );
  }

  // 4. Render UI
  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <h1 className="text-3xl font-bold mb-2">{productData.name}</h1>
      {productData.description && <p className="text-lg text-muted-foreground mb-8">{productData.description}</p>}

      <div className="space-y-4">
        {productData.modules.length > 0 ? (
          productData.modules.map((module) => (
            <Card key={module.id} className="overflow-hidden">
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                     {/* Added Icon based on type */}
                     {module.type === 'Course' ? <BookOpen className="h-4 w-4 text-blue-500 mr-1" /> : <Target className="h-4 w-4 text-green-500 mr-1" />}
                     <Badge variant={module.type === 'Course' ? 'secondary' : 'outline'}>{module.type}</Badge>
                     <h3 className="text-lg font-semibold ml-1">{module.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                    <span>Status:</span>
                     <Badge variant={
                         module.status === 'Completed' ? 'success' :
                         module.status === 'InProgress' ? 'default' : 'outline'
                      }>{module.status.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                     {/* Show progress bar and percentage only when In Progress */}
                     {module.status === 'InProgress' && (
                       <>
                         <Progress value={module.progress_percentage} className="w-24 h-2" />
                         <span>({module.progress_percentage}%)</span>
                       </>
                     )}
                  </div>
                </div>
                {/* Modified to use the modal for completed assessments */}
                {module.type === 'Assessment' && module.status === 'Completed' ? (
                  <Button 
                    variant="secondary" 
                    className="w-full md:w-auto mt-2 md:mt-0"
                    onClick={() => handleViewResult(module.id)}
                  >
                    View Results
                  </Button>
                ) : (
                  <Link href={getModuleLink(module)} passHref>
                    <Button 
                      variant={module.status === 'Completed' ? 'secondary' : 'default'} 
                      className="w-full md:w-auto mt-2 md:mt-0"
                    >
                      {getModuleCtaText(module)}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground">This product currently has no modules.</p>
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