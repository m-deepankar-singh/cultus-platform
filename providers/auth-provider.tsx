'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthQuery, useAuthCache, authQueryKeys, type AuthData } from '@/hooks/auth/use-auth-query';

// Auth context type
interface AuthContextType extends AuthData {
  signOut: () => Promise<void>;
  refreshAuth: () => void;
  clearCache: () => void;
}

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Global auth provider that manages authentication state across the app
 * Uses TanStack Query for intelligent caching and state management
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const authData = useAuthQuery();
  const { invalidateAuth, clearAuthCache, prefetchAuth } = useAuthCache();

  // Prefetch auth data on mount for better performance
  useEffect(() => {
    prefetchAuth().catch(console.error);
    
    // Prefetch on page visibility change for better UX
    const handleVisibilityChange = () => {
      if (!document.hidden && document.visibilityState === 'visible') {
        prefetchAuth().catch(console.error);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [prefetchAuth]);

  // Sign out function with cache cleanup
  const signOut = async () => {
    try {
      // Clear auth cache before signing out
      clearAuthCache();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Additional cleanup if needed
      queryClient.clear(); // Clear all queries on sign out
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Refresh auth data
  const refreshAuth = () => {
    invalidateAuth();
  };

  // Clear auth cache
  const clearCache = () => {
    clearAuthCache();
  };

  const contextValue: AuthContextType = {
    ...authData,
    signOut,
    refreshAuth,
    clearCache,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 * This is the main hook components should use for auth data
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Higher-order component for protecting routes
 */
export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please sign in to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Component for protecting routes based on user roles
 */
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireActive?: boolean;
  fallback?: React.ReactNode;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  requireActive = true,
  fallback = (
    <div className="text-center p-8">
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-gray-600">You don't have permission to access this content.</p>
    </div>
  )
}: RoleGuardProps) {
  const { profile, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return fallback;
  }

  // Check if user is active
  if (requireActive && !profile.is_active) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold mb-2">Account Inactive</h2>
        <p className="text-gray-600">Your account is currently inactive. Please contact support.</p>
      </div>
    );
  }

  // Check role permissions
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Hook for conditional rendering based on auth state
 */
export function useAuthGuard() {
  const auth = useAuth();

  const can = {
    access: (roles?: string[]) => {
      if (!auth.isAuthenticated || !auth.profile) return false;
      if (!auth.isActive) return false;
      if (roles && !roles.includes(auth.profile.role)) return false;
      return true;
    },
    
    accessAsStudent: () => {
      return auth.isAuthenticated && auth.isStudent && auth.isActive;
    },
    
    accessAsAdmin: () => {
      return auth.isAuthenticated && 
             auth.profile?.role === 'Admin' && 
             auth.isActive;
    },
    
    accessAsStaff: () => {
      return auth.isAuthenticated && 
             ['Admin', 'Staff', 'Client Staff'].includes(auth.profile?.role || '') && 
             auth.isActive;
    },
  };

  return { ...auth, can };
}