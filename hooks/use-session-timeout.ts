'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLogout } from '@/hooks/use-logout';
import { useToast } from '@/hooks/use-toast';
import { SESSION_TIMEOUT_CONFIG } from '@/lib/auth/session-timeout-constants';

export interface SessionTimeoutState {
  isExpired: boolean;
  shouldWarn: boolean;
  timeRemaining: number;
  lastActivity: number;
  isWarningShown: boolean;
}

export function useSessionTimeout() {
  const { logout } = useLogout();
  const { toast } = useToast();
  
  const [state, setState] = useState<SessionTimeoutState>({
    isExpired: false,
    shouldWarn: false,
    timeRemaining: SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION,
    lastActivity: Date.now(),
    isWarningShown: false,
  });

  // Get last activity from localStorage
  const getLastActivity = useCallback((): number => {
    if (typeof window === 'undefined') return Date.now();
    
    const stored = localStorage.getItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
    if (!stored) {
      // If no stored activity, set current time as last activity
      const now = Date.now();
      localStorage.setItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY, now.toString());
      return now;
    }
    
    return parseInt(stored, 10);
  }, []);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    localStorage.setItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY, now.toString());
    
    // Reset warning state if user is active
    setState(prev => ({
      ...prev,
      lastActivity: now,
      isWarningShown: false
    }));
  }, []);

  // Check session timeout status
  const checkSessionTimeout = useCallback((): SessionTimeoutState => {
    const now = Date.now();
    const lastActivity = getLastActivity();
    const timeSinceActivity = now - lastActivity;
    const timeRemaining = Math.max(0, SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION - timeSinceActivity);
    
    const isExpired = timeSinceActivity > SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION;
    const shouldWarn = timeRemaining <= SESSION_TIMEOUT_CONFIG.WARNING_THRESHOLD && timeRemaining > 0;
    
    return {
      isExpired,
      shouldWarn,
      timeRemaining,
      lastActivity,
      isWarningShown: state.isWarningShown
    };
  }, [getLastActivity, state.isWarningShown]);

  // Extend session (reset activity)
  const extendSession = useCallback(() => {
    updateLastActivity();
    setState(prev => ({
      ...prev,
      isWarningShown: false
    }));
    
    toast({
      title: "Session Extended",
      description: "Your session has been extended. You can continue working.",
      variant: "default",
    });
  }, [updateLastActivity, toast]);

  // Force logout
  const forceLogout = useCallback(async (reason: string = 'Session expired') => {
    if (typeof window === 'undefined') return;
    
    // Use existing logout hook with session timeout reason
    await logout(undefined, reason);
  }, [logout]);

  // Handle session expiration
  const handleSessionExpired = useCallback(async () => {
    await forceLogout('Session expired due to 48 hours of inactivity');
  }, [forceLogout]);

  // Handle warning acknowledgment
  const handleWarningShown = useCallback(() => {
    setState(prev => ({
      ...prev,
      isWarningShown: true
    }));
  }, []);

  // Set up activity tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize last activity
    updateLastActivity();

    // Activity event listeners
    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus',
      'blur'
    ];

    const handleActivity = () => {
      updateLastActivity();
    };

    // Add event listeners with passive option for performance
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateLastActivity]);

  // Set up periodic timeout checking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTimeout = () => {
      const now = Date.now();
      const lastActivity = getLastActivity();
      const timeSinceActivity = now - lastActivity;
      const timeRemaining = Math.max(0, SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION - timeSinceActivity);
      
      const isExpired = timeSinceActivity > SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION;
      const shouldWarn = timeRemaining <= SESSION_TIMEOUT_CONFIG.WARNING_THRESHOLD && timeRemaining > 0;
      
      setState(prevState => {
        // Only update if values actually changed
        if (prevState.isExpired !== isExpired || 
            prevState.shouldWarn !== shouldWarn || 
            Math.abs(prevState.timeRemaining - timeRemaining) > 1000) {
          return {
            ...prevState,
            isExpired,
            shouldWarn,
            timeRemaining,
            lastActivity
          };
        }
        return prevState;
      });
      
      // Auto-logout if expired
      if (isExpired) {
        handleSessionExpired();
      }
    };

    const checkInterval = setInterval(checkTimeout, 60 * 1000); // Check every minute

    // Initial check
    checkTimeout();

    return () => clearInterval(checkInterval);
  }, [getLastActivity, handleSessionExpired]);

  return {
    ...state,
    extendSession,
    forceLogout,
    handleWarningShown,
    updateLastActivity,
    formatTimeRemaining: (milliseconds: number): string => {
      const totalMinutes = Math.floor(milliseconds / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
  };
}