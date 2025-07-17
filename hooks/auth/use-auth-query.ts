'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';

// Auth query keys for cache management
export const authQueryKeys = {
  session: () => ['auth', 'session'] as const,
  user: () => ['auth', 'user'] as const,
  profile: (userId: string) => ['auth', 'profile', userId] as const,
} as const;

// Types for auth data
export interface AuthSession {
  user: User | null;
  session: any;
}

export interface UserProfile {
  id: string;
  role: string;
  client_id: string;
  is_active: boolean;
  is_student: boolean;
  job_readiness_star_level?: number;
  job_readiness_tier?: string;
}

export interface AuthData {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStudent: boolean;
  isActive: boolean;
}

/**
 * Core auth query hook using TanStack Query for intelligent caching
 * Replaces multiple direct supabase.auth.getUser() calls with cached data
 */
export function useAuthQuery(): AuthData {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const subscriptionRef = useRef<any>(null);

  // Query for session data using getSession() (cached by Supabase client)
  const {
    data: sessionData,
    isLoading: sessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: authQueryKeys.session(),
    queryFn: async (): Promise<AuthSession> => {
      // Use getSession() instead of getUser() for client-side caching
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return {
        user: session?.user || null,
        session,
      };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - auth data is relatively stable
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
    retry: 1,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: false, // Use cached data when available
    // Enable persistence to reduce auth/v1/user API calls across browser sessions
    meta: {
      persist: true,
    },
  });

  // Query for user profile data when user exists
  const {
    data: profileData,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: authQueryKeys.profile(sessionData?.user?.id || ''),
    queryFn: async (): Promise<UserProfile | null> => {
      if (!sessionData?.user?.id) return null;

      const userId = sessionData.user.id;

      // Try students table first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, client_id, is_active, job_readiness_star_level, job_readiness_tier')
        .eq('id', userId)
        .maybeSingle();

      if (student && !studentError) {
        return {
          id: student.id,
          role: 'student',
          client_id: student.client_id,
          is_active: student.is_active,
          is_student: true,
          job_readiness_star_level: student.job_readiness_star_level,
          job_readiness_tier: student.job_readiness_tier,
        };
      }

      // Try profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, client_id, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (profile && !profileError) {
        return {
          id: profile.id,
          role: profile.role,
          client_id: profile.client_id,
          is_active: profile.is_active,
          is_student: false,
        };
      }

      return null;
    },
    enabled: !!sessionData?.user?.id, // Only fetch when user exists
    staleTime: 30 * 60 * 1000, // 30 minutes - profile data changes less frequently
    gcTime: 60 * 60 * 1000, // 60 minutes in cache
    retry: 2,
  });

  // Set up auth state change listener for cache invalidation
  useEffect(() => {
    if (subscriptionRef.current) return; // Prevent duplicate subscriptions

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Invalidate auth queries on auth state changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: authQueryKeys.session() });
        
        if (session?.user?.id) {
          queryClient.invalidateQueries({ 
            queryKey: authQueryKeys.profile(session.user.id) 
          });
        } else {
          // Clear all profile queries on sign out
          queryClient.removeQueries({ 
            queryKey: ['auth', 'profile'],
            exact: false 
          });
        }
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [queryClient, supabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const user = sessionData?.user || null;
  const profile = profileData || null;
  const isLoading = sessionLoading || (user && profileLoading) || false;
  const isAuthenticated = !!user;
  const isStudent = profile?.is_student || false;
  const isActive = profile?.is_active || false;

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    isStudent,
    isActive,
  };
}

/**
 * Hook for auth cache management
 */
export function useAuthCache() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const invalidateAuth = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['auth'] });
  }, [queryClient]);

  const prefetchAuth = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: authQueryKeys.session(),
      queryFn: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return { user: session?.user || null, session };
      },
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient, supabase]);

  const clearAuthCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['auth'] });
  }, [queryClient]);

  const updateProfile = useCallback((userId: string, profileUpdate: Partial<UserProfile>) => {
    queryClient.setQueryData(authQueryKeys.profile(userId), (old: UserProfile | null) => {
      if (!old) return null;
      return { ...old, ...profileUpdate };
    });
  }, [queryClient]);

  return {
    invalidateAuth,
    prefetchAuth,
    clearAuthCache,
    updateProfile,
  };
}

/**
 * Simple hook for components that only need authentication status
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user } = useAuthQuery();
  return { isAuthenticated, isLoading, user };
}

/**
 * Hook for components that need role-based access control
 */
export function useAuthRole() {
  const { profile, isLoading, isAuthenticated } = useAuthQuery();
  
  return {
    role: profile?.role,
    isStudent: profile?.is_student || false,
    isActive: profile?.is_active || false,
    clientId: profile?.client_id,
    isLoading,
    isAuthenticated,
  };
}