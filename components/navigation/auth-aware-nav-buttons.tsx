"use client"

import Link from 'next/link';
import { useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useLogout } from '@/hooks/use-logout';
import { Button } from '@/components/ui/button';

export function AuthAwareNavButtons() {
  const { user, role, isLoading } = useCurrentUser();
  const { logout } = useLogout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Show loading state during authentication check or logout
  if (isLoading || isLoggingOut) {
    return (
      <div className="flex gap-2 sm:gap-3 md:gap-4 items-center">
        <div className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 bg-white/20 backdrop-blur-md rounded-md animate-pulse border border-black/10 dark:border-white/10 w-12 sm:w-14 md:w-16 h-7 sm:h-8 md:h-9" />
        <div className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 bg-white/20 backdrop-blur-md rounded-md animate-pulse border border-black/10 dark:border-white/10 w-12 sm:w-14 md:w-16 h-7 sm:h-8 md:h-9" />
      </div>
    );
  }

  // Common button styling - responsive padding and text size
  const buttonClass = "px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md rounded-md text-black dark:text-white hover:text-black dark:hover:text-white font-medium transition-all duration-200 border border-black/10 dark:border-white/10 text-xs sm:text-sm md:text-base";

  // Unauthenticated state - show original login buttons
  if (!user) {
    return (
      <div className="flex gap-2 sm:gap-3 md:gap-4 items-center">
        <Link href="/admin/login">
          <span className={buttonClass}>
            Admin
          </span>
        </Link>
        <Link href="/app/login">
          <span className={buttonClass}>
            Login
          </span>
        </Link>
      </div>
    );
  }

  // Enhanced logout handler with loading state
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Determine user type for proper redirect
      const userType = ['Admin', 'Staff', 'Viewer', 'Client Staff'].includes(role || '') ? 'admin' : 'student';
      await logout(userType);
    } catch (error) {
      console.error('Logout error:', error);
      // Error handling is already done in useLogout hook
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Determine dashboard URL based on role
  const getDashboardUrl = () => {
    if (['Admin', 'Staff', 'Viewer', 'Client Staff'].includes(role || '')) {
      return '/dashboard';
    }
    return '/app/dashboard';
  };

  return (
    <div className="flex gap-2 sm:gap-3 md:gap-4 items-center">
      <Link href={getDashboardUrl()}>
        <span className={buttonClass}>
          <span className="hidden sm:inline">Dashboard</span>
          <span className="sm:hidden">Dash</span>
        </span>
      </Link>
      <button 
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`${buttonClass} ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isLoggingOut ? (
          <>
            <span className="hidden sm:inline animate-pulse">Logging out...</span>
            <span className="sm:hidden animate-pulse">...</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Exit</span>
          </>
        )}
      </button>
    </div>
  );
}