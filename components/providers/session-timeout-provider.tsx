'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { SessionTimeoutWarning } from '@/components/ui/session-timeout-warning';

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const pathname = usePathname();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const {
    shouldWarn,
    timeRemaining,
    extendSession,
    forceLogout,
    handleWarningShown,
    formatTimeRemaining
  } = useSessionTimeout();

  // Check if we should show session timeout for this route
  const shouldTrackSession = () => {
    // Don't track session on public routes
    const publicRoutes = [
      '/',
      '/admin/login',
      '/app/login',
      '/login',
      '/auth/forgot-password',
      '/auth/update-password'
    ];
    
    return !publicRoutes.some(route => pathname.startsWith(route));
  };

  // Handle warning display
  useEffect(() => {
    if (shouldWarn && shouldTrackSession() && !isWarningOpen) {
      setIsWarningOpen(true);
      handleWarningShown();
    }
  }, [shouldWarn, shouldTrackSession, isWarningOpen, handleWarningShown]);

  // Handle session extension
  const handleExtendSession = () => {
    extendSession();
    setIsWarningOpen(false);
  };

  // Handle logout
  const handleLogout = () => {
    setIsWarningOpen(false);
    forceLogout('User chose to logout from warning');
  };

  // Only render timeout functionality on protected routes
  if (!shouldTrackSession()) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <SessionTimeoutWarning 
        isOpen={isWarningOpen}
        timeRemaining={timeRemaining}
        onExtendSession={handleExtendSession}
        onLogout={handleLogout}
        formatTimeRemaining={formatTimeRemaining}
      />
    </>
  );
}