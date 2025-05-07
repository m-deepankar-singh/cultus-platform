import React from 'react';
import { CoursesDashboard } from "@/components/courses-dashboard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';

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

interface ProductAssignment {
  product_id: string;
  products: {
    id: string;
    name: string;
    description: string | null;
    modules: {
      id: string;
      name: string;
      type: 'Course' | 'Assessment';
      sequence: number;
    }[];
  };
}

interface ModuleProgress {
  module_id: string;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  progress_percentage: number | null;
  completed_at: string | null;
}

// This is a React Server Component (RSC)
// It fetches data and passes it to the CoursesDashboard client component.

export default async function DashboardPage() {
  // First, ensure the user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // If not authenticated, redirect to login
    redirect('/app/login');
  }
  
  // Initialize empty products array
  let products: Product[] = [];
  let errorOccurred = false;
  let errorMessage = '';

  try {
    // First, get the student record to ensure we have the correct client_id
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('client_id')
      .eq('id', user.id)
      .single();
    
    if (studentError) {
      console.error('Error fetching student data:', studentError);
      errorOccurred = true;
      errorMessage = 'Unable to fetch your student profile';
      return <CoursesDashboard products={[]} error={errorMessage} />;
    }

    if (!studentData || !studentData.client_id) {
      console.error('No client_id found for student');
      errorOccurred = true;
      errorMessage = 'Your account is not properly set up with a school or organization';
      return <CoursesDashboard products={[]} error={errorMessage} />;
    }

    // Now fetch product assignments using the client_id from the student record
    const { data, error } = await supabase
      .from('client_product_assignments')
      .select(`
        product_id,
        products:product_id (
          id,
          name,
          description,
          modules (
            id,
            name,
            type,
            sequence
          )
        )
      `)
      .eq('client_id', studentData.client_id);

    if (error) {
      console.error('Error fetching products:', error);
      errorOccurred = true;
      errorMessage = error.message;
    } else if (data && data.length > 0) {
      // Get progress data for each module first
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
        progressData.forEach((progress: ModuleProgress) => {
          progressMap.set(progress.module_id, progress);
        });
      }
      
      // Transform data to the expected format with product status and progress calculation
      products = data.map((item: any) => {
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
          modules,
          product_progress_percentage: productProgressPercentage,
          product_status: productStatus
        };
      });
    } else {
      // No products found - this is not an error, just empty state
      console.log('No products assigned to this student');
    }
  } catch (error: any) {
    console.error('Error in dashboard page data fetching:', error);
    errorOccurred = true;
    errorMessage = error.message || 'An unknown error occurred';
  }

  // Return the CoursesDashboard with either the products data or error message
  return <CoursesDashboard products={products} error={errorOccurred ? errorMessage : undefined} />;
}
