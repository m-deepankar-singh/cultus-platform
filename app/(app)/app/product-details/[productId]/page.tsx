import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link'; // Import Link for module navigation
import { Badge } from '@/components/ui/badge'; // Import Badge for status
import { Button } from '@/components/ui/button'; // Import Button for CTAs
import { Progress } from '@/components/ui/progress'; // Import Progress component
import { Card, CardContent } from '@/components/ui/card'; // Import Card and CardContent
import { BookOpen, Target } from 'lucide-react'; // Import icons

interface ProductDetailsPageProps {
  params: {
    productId: string;
  };
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
    // Assuming assessment takes priority or has a specific entry point
    // Adjust if completed assessments should go to results page
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

// This is a React Server Component (RSC)
export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { productId } = params;
  const supabase = await createClient();

  // 1. Authenticate User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/app/login');
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
    console.error('Error fetching product details:', productError);
    // TODO: Add a proper not found or error page display
    return <div className="container mx-auto py-8">Error loading product details.</div>;
  }
  
  // Check if student has access to this product (via client assignment) - RLS should handle this, but an explicit check is safer
   const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('client_id')
      .eq('id', user.id)
      .single();

  if (studentError || !studentData?.client_id) {
     console.error('Error fetching student client:', studentError);
     return <div className="container mx-auto py-8">Error checking product access.</div>;
  }
  
  const { count: assignmentCount, error: assignmentError } = await supabase
    .from('client_product_assignments')
    .select('*' , { count: 'exact', head: true })
    .eq('client_id', studentData.client_id)
    .eq('product_id', productId);
    
  if (assignmentError || assignmentCount === 0) {
     console.error('Student does not have access to this product:', assignmentError);
     return <div className="container mx-auto py-8">You do not have access to this product.</div>;
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
      // Proceed without progress, but maybe log it
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

  const product: ProductDetail = {
    ...productData,
    modules: modulesWithProgress,
  };

  // 4. Render UI
  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
      {product.description && <p className="text-lg text-muted-foreground mb-8">{product.description}</p>}

      <div className="space-y-4">
        {product.modules.length > 0 ? (
          product.modules.map((module) => (
            <Card key={module.id} className="overflow-hidden">
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                     {/* Added Icon based on type */}
                     {module.type === 'Course' ? <BookOpen className="h-4 w-4 text-blue-500 mr-1" /> : <Target className="h-4 w-4 text-green-500 mr-1" />}
                     <Badge variant={module.type === 'Course' ? 'secondary' : 'outline'}>{module.type}</Badge>
                     <h3 className="text-lg font-semibold ml-1">{module.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6"> {/* Added ml-6 to indent status line under icon/badge/title */}
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
                <Link href={getModuleLink(module)} passHref>
                   {/* Adjusted button variant for consistency */}
                   <Button 
                      variant={module.status === 'Completed' ? 'secondary' : 'default'} 
                      className="w-full md:w-auto mt-2 md:mt-0"
                   >
                     {getModuleCtaText(module)}
                   </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground">This product currently has no modules.</p>
        )}
      </div>
    </div>
  );
} 