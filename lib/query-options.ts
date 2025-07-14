import { queryOptions } from '@tanstack/react-query';
import { apiClient, buildQueryParams } from './api-client';
import { queryKeys } from './query-keys';

// Base types for common data structures
export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  };
}

// Dashboard specific types (matching current implementation)
export interface Module {
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

export interface Product {
  id: string;
  name: string;
  description: string | null;
  product_progress_percentage: number;
  product_status: 'NotStarted' | 'InProgress' | 'Completed' | 'Mixed';
  image_url?: string | null;
  type?: string;
  modules: Module[];
}

export interface Learner {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  is_active: boolean;
  star_rating?: number;
  client?: {
    id: string;
    name: string;
  };
}

export interface LearnersFilters {
  search?: string;
  clientId?: string;
  isActive?: boolean;
  pageSize?: number;
  page?: number;
}

export interface UsersFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  pageSize?: number;
  page?: number;
}

export interface ClientsFilters {
  search?: string;
  isActive?: boolean;
  pageSize?: number;
  page?: number;
}

// Student dashboard options - updated with proper typing
export function studentDashboardOptions() {
  return queryOptions({
    queryKey: queryKeys.studentDashboard,
    queryFn: async () => {
      const data = await apiClient<Product[]>('/api/app/progress');
      
      // Transform data to include calculated fields (matching current logic)
      return data.map((product: any) => {
        const modules = product.modules.map((module: any) => ({
          id: module.id,
          name: module.name,
          type: module.type as 'Course' | 'Assessment',
          sequence: module.sequence,
          status: module.status || 'NotStarted',
          progress_percentage: module.progress_percentage || 0,
          completed_at: module.completed_at || null,
          assessment_score: module.assessment_score,
          assessment_submitted_at: module.assessment_submitted_at,
        }));
        
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
          id: product.id,
          name: product.name,
          description: product.description,
          image_url: product.image_url || null,
          type: product.type,
          modules,
          product_progress_percentage: productProgressPercentage,
          product_status: productStatus
        };
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (renamed from cacheTime in v5)
  });
}

// Job readiness products options
export function jobReadinessProductsOptions(productId?: string) {
  return queryOptions({
    queryKey: queryKeys.jobReadinessProducts(productId),
    queryFn: ({ queryKey }) => {
      const [, , id] = queryKey;
      const endpoint = id 
        ? `/api/app/job-readiness/products/${id}`
        : '/api/app/job-readiness/products';
      return apiClient(endpoint);
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

// Job readiness progress options
export function jobReadinessProgressOptions() {
  return queryOptions({
    queryKey: queryKeys.jobReadinessProgress,
    queryFn: () => apiClient('/api/app/job-readiness/progress'),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Assessment details options
export function assessmentDetailsOptions(moduleId: string) {
  return queryOptions({
    queryKey: queryKeys.assessmentDetails(moduleId),
    queryFn: () => apiClient(`/api/app/assessments/${moduleId}`),
    staleTime: 1000 * 60 * 10, // 10 minutes (assessments change less frequently)
    enabled: !!moduleId,
  });
}

// Course content options (unified for both regular and enhanced course content)
export function courseContentOptions(courseId: string) {
  return queryOptions({
    queryKey: queryKeys.courseContent(courseId),
    queryFn: () => apiClient(`/api/app/courses/${courseId}/content`),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!courseId,
  });
}

// Enhanced course content options (alias for backward compatibility)
export function enhancedCourseContentOptions(moduleId: string) {
  return courseContentOptions(moduleId);
}

// Admin learners options with proper filtering
export function adminLearnersOptions(filters: LearnersFilters) {
  return queryOptions({
    queryKey: queryKeys.adminLearners(filters),
    queryFn: ({ queryKey }) => {
      const [, , filterParams] = queryKey;
      const params = buildQueryParams(filterParams);
      return apiClient<PaginatedResponse<Learner>>(`/api/admin/learners?${params}`);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for admin data
  });
}

// Admin users options
export function adminUsersOptions(filters: UsersFilters) {
  return queryOptions({
    queryKey: queryKeys.adminUsers(filters),
    queryFn: ({ queryKey }) => {
      const [, , filterParams] = queryKey;
      const params = buildQueryParams(filterParams);
      return apiClient<PaginatedResponse<any>>(`/api/admin/users?${params}`);
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Admin clients options
export function adminClientsOptions(filters: ClientsFilters) {
  return queryOptions({
    queryKey: queryKeys.adminClients(filters),
    queryFn: ({ queryKey }) => {
      const [, , filterParams] = queryKey;
      const params = buildQueryParams(filterParams);
      return apiClient<PaginatedResponse<any>>(`/api/admin/clients?${params}`);
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Current user options
export function currentUserOptions() {
  return queryOptions({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiClient('/api/auth/me'),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

// Expert session options
export function expertSessionsOptions(productId?: string) {
  return queryOptions({
    queryKey: queryKeys.expertSessions(productId),
    queryFn: ({ queryKey }) => {
      const [, id] = queryKey;
      const endpoint = id 
        ? `/api/app/job-readiness/expert-sessions/${id}`
        : '/api/app/job-readiness/expert-sessions';
      return apiClient(endpoint);
    },
    staleTime: 1000 * 60 * 5,
  });
} 