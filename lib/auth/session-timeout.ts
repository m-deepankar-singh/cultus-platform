import { createClient } from '@/lib/supabase/client';
import { SESSION_TIMEOUT_CONFIG, SESSION_TIMEOUT_EVENTS } from './session-timeout-constants';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export interface SessionTimeoutCheck {
  isExpired: boolean;
  shouldWarn: boolean;
  timeRemaining: number;
  lastActivity: number;
}

export class SessionTimeout {
  private static instance: SessionTimeout;
  private warningCallbacks: ((timeRemaining: number) => void)[] = [];
  private expirationCallbacks: (() => void)[] = [];

  static getInstance(): SessionTimeout {
    if (!SessionTimeout.instance) {
      SessionTimeout.instance = new SessionTimeout();
    }
    return SessionTimeout.instance;
  }

  /**
   * Updates the last activity timestamp
   */
  updateLastActivity(): void {
    if (typeof window !== 'undefined') {
      const timestamp = Date.now();
      localStorage.setItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY, timestamp.toString());
    }
  }

  /**
   * Gets the last activity timestamp
   */
  getLastActivity(): number {
    if (typeof window === 'undefined') {
      return Date.now(); // Server-side fallback
    }
    
    const stored = localStorage.getItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
    if (!stored) {
      // If no stored activity, treat as current time (new session)
      this.updateLastActivity();
      return Date.now();
    }
    
    return parseInt(stored, 10);
  }

  /**
   * Checks if the session has expired or should show warning
   */
  checkSessionTimeout(): SessionTimeoutCheck {
    const now = Date.now();
    const lastActivity = this.getLastActivity();
    const timeSinceActivity = now - lastActivity;
    const timeRemaining = SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION - timeSinceActivity;
    
    return {
      isExpired: timeSinceActivity > SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION,
      shouldWarn: timeRemaining <= SESSION_TIMEOUT_CONFIG.WARNING_THRESHOLD && timeRemaining > 0,
      timeRemaining: Math.max(0, timeRemaining),
      lastActivity
    };
  }

  /**
   * Forces logout due to session timeout
   */
  async forceLogout(reason: 'expired' | 'warning_ignored' = 'expired'): Promise<void> {
    try {
      const supabase = createClient();
      
      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log the security event
      securityLogger.logEvent({
        eventType: SecurityEventType.SESSION_EXPIRED,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHENTICATION,
        details: {
          reason,
          lastActivity: this.getLastActivity(),
          timeoutDuration: SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION,
          userId: user?.id,
          email: user?.email
        }
      });

      // Clear session data
      this.clearSessionData();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Trigger expiration callbacks
      this.expirationCallbacks.forEach(callback => callback());
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        // Small delay to ensure logout is processed
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 100);
      }
      
    } catch (error) {
      console.error('Error during forced logout:', error);
      
      // Log the error but still proceed with logout
      securityLogger.logEvent({
        eventType: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.CRITICAL,
        category: SecurityCategory.AUTHENTICATION,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'force_logout'
        }
      });
      
      // Force redirect even if there's an error
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    }
  }

  /**
   * Clears session-related data
   */
  private clearSessionData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
      // Clear other session preferences
      localStorage.removeItem('remember_me');
      localStorage.removeItem('user_type');
    }
  }

  /**
   * Extends the session by updating last activity
   */
  extendSession(): void {
    this.updateLastActivity();
    
    securityLogger.logEvent({
      eventType: SecurityEventType.SESSION_REFRESHED,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.AUTHENTICATION,
      details: {
        newActivity: Date.now()
      }
    });
  }

  /**
   * Registers a callback for session warnings
   */
  onSessionWarning(callback: (timeRemaining: number) => void): void {
    this.warningCallbacks.push(callback);
  }

  /**
   * Registers a callback for session expiration
   */
  onSessionExpiration(callback: () => void): void {
    this.expirationCallbacks.push(callback);
  }

  /**
   * Starts monitoring session timeout
   */
  startMonitoring(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, no monitoring needed
    }

    // Check immediately
    this.checkAndHandleTimeout();
    
    // Set up periodic checking (every 5 minutes)
    setInterval(() => {
      this.checkAndHandleTimeout();
    }, 5 * 60 * 1000);
    
    // Update activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, { passive: true });
    });
  }

  /**
   * Internal method to check and handle timeout
   */
  private checkAndHandleTimeout(): void {
    const check = this.checkSessionTimeout();
    
    if (check.isExpired) {
      this.forceLogout('expired');
    } else if (check.shouldWarn) {
      // Trigger warning callbacks
      this.warningCallbacks.forEach(callback => callback(check.timeRemaining));
    }
  }
}

// Export singleton instance
export const sessionTimeout = SessionTimeout.getInstance();