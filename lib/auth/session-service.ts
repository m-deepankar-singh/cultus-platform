/**
 * Session Service for Auth Preferences
 * 
 * Handles remember me preferences and session configuration.
 * Does NOT store auth tokens - Supabase handles that securely.
 */

export class SessionService {
  private static readonly REMEMBER_ME_KEY = 'auth_remember_me';
  private static readonly USER_TYPE_KEY = 'auth_user_type';

  /**
   * Store remember me preference for the user
   * Only stores preference, not auth tokens
   */
  static setRememberMe(remember: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.REMEMBER_ME_KEY, remember.toString());
    }
  }

  /**
   * Get remember me preference
   */
  static getRememberMe(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    }
    return false;
  }

  /**
   * Clear remember me preference
   */
  static clearRememberMe(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.REMEMBER_ME_KEY);
    }
  }

  /**
   * Store user type preference for proper redirect after session restoration
   */
  static setUserType(userType: 'admin' | 'student'): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_TYPE_KEY, userType);
    }
  }

  /**
   * Get user type preference
   */
  static getUserType(): 'admin' | 'student' | null {
    if (typeof window !== 'undefined') {
      const userType = localStorage.getItem(this.USER_TYPE_KEY);
      return userType as 'admin' | 'student' | null;
    }
    return null;
  }

  /**
   * Clear user type preference
   */
  static clearUserType(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_TYPE_KEY);
    }
  }

  /**
   * Configure session preferences (remember me + user type)
   * Supabase handles actual session persistence automatically
   */
  static configureSession(remember: boolean, userType: 'admin' | 'student'): void {
    this.setRememberMe(remember);
    this.setUserType(userType);
  }

  /**
   * Clear all session preferences
   * Call this on logout
   */
  static clearAllPreferences(): void {
    this.clearRememberMe();
    this.clearUserType();
  }

  /**
   * Check if user should be automatically logged in
   * Based on remember me preference and existing Supabase session
   */
  static shouldRememberSession(): boolean {
    return this.getRememberMe();
  }
} 