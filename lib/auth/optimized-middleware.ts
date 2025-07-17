import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { authCacheManager } from './auth-cache-manager';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';
import { SESSION_TIMEOUT_CONFIG } from './session-timeout-constants';

// Route configuration for optimized pattern matching
const ROUTE_CONFIG = {
  // Admin-only routes
  ADMIN_ONLY: [
    '/users',
    '/admin/users',
    '/modules/create',
    '/modules/.*/edit',
    '/api/admin/modules',
  ],
  
  // Admin and Staff routes
  ADMIN_AND_STAFF: [
    '/dashboard',
    '/clients',
    '/api/admin/clients',
    '/api/staff/clients',
    '/products',
    '/api/admin/products',
    '/learners',
    '/api/admin/learners',
    '/api/staff/learners',
    '/modules',
    '/api/admin/products/*/modules',
  ],
  
  // Public paths
  PUBLIC: [
    '/',
    '/admin/login',
    '/app/login',
    '/login',
    '/auth/forgot-password',
    '/auth/update-password',
    '/api/auth/callback',
    '/api/app/auth/login',
    '/api/admin/auth/login',
  ],
} as const;

export interface OptimizedAuthResult {
  user: any;
  userRole: string;
  clientId: string;
  isAuthenticated: boolean;
  isStudent: boolean;
  cacheHit: boolean;
}

export class OptimizedMiddleware {
  /**
   * Main middleware function with optimized authentication
   */
  async process(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    
    // Create supabase response
    let supabaseResponse = NextResponse.next({ request });
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { pathname } = request.nextUrl;

    // Handle logout
    if (pathname === '/auth/logout') {
      return this.handleLogout(request, supabase, supabaseResponse);
    }

    // IMPORTANT: DO NOT REMOVE auth.getUser() - it refreshes the session
    // Do not run code between createServerClient and supabase.auth.getUser()
    // A simple mistake could make it very hard to debug issues with users being randomly logged out
    const { data: { user } } = await supabase.auth.getUser();
    
    // Handle session timeout
    if (user) {
      const timeoutResponse = await this.checkSessionTimeout(request, user, supabase, supabaseResponse);
      if (timeoutResponse) {
        return timeoutResponse;
      }
    }

    // Fast path for public routes
    if (this.isPublicRoute(pathname)) {
      return supabaseResponse;
    }

    // Route classification
    const routeType = this.classifyRoute(pathname);
    
    // Handle unauthenticated access
    if (!user) {
      return this.handleUnauthenticated(request, pathname, routeType, supabaseResponse);
    }

    // Get cached or fresh auth data using the middleware's supabase instance
    const authData = await this.getAuthData(user.id, supabase);
    if (!authData) {
      return this.handleAuthFailure(request, pathname, routeType, supabaseResponse);
    }

    // Role-based access control
    const accessResult = this.checkAccess(pathname, authData, routeType);
    if (!accessResult.allowed) {
      return this.handleAccessDenied(request, pathname, authData, accessResult.reason || 'Access denied', supabaseResponse);
    }

    // Log performance metrics
    const processingTime = Date.now() - startTime;
    if (processingTime > 100) {
      console.warn(`Slow middleware processing: ${processingTime}ms for ${pathname}`);
    }

    return supabaseResponse;
  }

  /**
   * Handle logout with cache invalidation
   */
  private async handleLogout(
    request: NextRequest,
    supabase: any,
    supabaseResponse: NextResponse
  ): Promise<NextResponse> {
    try {
      // Get user before logout to clear cache
      const { data: { user } } = await supabase.auth.getUser();
      
      // Sign out
      await supabase.auth.signOut();
      
      // Clear user cache
      if (user?.id) {
        await authCacheManager.invalidateUserCache(user.id);
      }
      
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.search = '';
      
      const redirectResponse = NextResponse.redirect(redirectUrl);
      
      // Copy cookies
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      
      return redirectResponse;
    } catch (error) {
      console.error('Logout error:', error);
      return supabaseResponse;
    }
  }

  /**
   * Check session timeout with optimized logging
   */
  private async checkSessionTimeout(
    request: NextRequest,
    user: any,
    supabase: any,
    supabaseResponse: NextResponse
  ): Promise<NextResponse | null> {
    const lastActivityHeader = request.headers.get('x-last-activity');
    const lastActivity = lastActivityHeader ? parseInt(lastActivityHeader, 10) : null;
    
    if (lastActivity) {
      const timeSinceActivity = Date.now() - lastActivity;
      
      if (timeSinceActivity > SESSION_TIMEOUT_CONFIG.TIMEOUT_DURATION) {
        const { pathname } = request.nextUrl;
        const isAppRoute = pathname.startsWith('/app') && !pathname.startsWith('/app/login');
        const isApiAppRoute = pathname.startsWith('/api/app');
        
        // Log timeout event
        securityLogger.logEvent({
          eventType: SecurityEventType.SESSION_EXPIRED,
          severity: SecuritySeverity.WARNING,
          category: SecurityCategory.AUTHENTICATION,
          userId: user.id,
          endpoint: pathname,
          method: request.method,
          details: {
            reason: 'Session timeout - 48 hours inactivity',
            lastActivity: new Date(lastActivity).toISOString(),
            timeSinceActivity: Math.round(timeSinceActivity / (1000 * 60 * 60 * 24 * 100)) / 100 + ' days',
          }
        }, request);

        // Sign out and clear cache
        await supabase.auth.signOut();
        if (user?.id) {
          await authCacheManager.invalidateUserCache(user.id);
        }
        
        // Redirect to appropriate login
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = (isAppRoute || isApiAppRoute) ? '/app/login' : '/admin/login';
        redirectUrl.search = 'sessionExpired=true';
        
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        
        return redirectResponse;
      }
    }
    
    return null;
  }

  /**
   * Check if route is public (optimized with caching)
   */
  private isPublicRoute(pathname: string): boolean {
    return ROUTE_CONFIG.PUBLIC.some(path => pathname.startsWith(path));
  }

  /**
   * Classify route type for optimized processing
   */
  private classifyRoute(pathname: string): 'admin' | 'app' | 'api-app' | 'protected' | 'public' {
    if (pathname.startsWith('/app') && !pathname.startsWith('/app/login')) {
      return 'app';
    }
    if (pathname.startsWith('/api/app')) {
      return 'api-app';
    }
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      return 'admin';
    }
    if (this.isProtectedRoute(pathname)) {
      return 'protected';
    }
    return 'public';
  }

  /**
   * Check if route is protected
   */
  private isProtectedRoute(pathname: string): boolean {
    return ROUTE_CONFIG.ADMIN_ONLY.some(route => 
      authCacheManager.pathMatchesPattern(pathname, route)
    ) || ROUTE_CONFIG.ADMIN_AND_STAFF.some(route => 
      authCacheManager.pathMatchesPattern(pathname, route)
    );
  }

  /**
   * Get auth data with caching (Phase 2 optimized with security fixes)
   */
  private async getAuthData(userId: string, supabase: any): Promise<OptimizedAuthResult | null> {
    // Check if Phase 2 RPC optimization is enabled
    const useRPCOptimization = process.env.ENABLE_PHASE2_RPC === 'true';
    
    if (useRPCOptimization) {
      // Use RPC optimization but with middleware's supabase instance (security fix)
      return this.getAuthDataRPC(userId, supabase);
    }
    
    // Default to Redis-first approach with middleware's supabase instance
    return this.getAuthDataCached(userId, supabase);
  }

  /**
   * Get auth data with Redis caching - using middleware's supabase instance
   */
  private async getAuthDataCached(userId: string, supabase: any): Promise<OptimizedAuthResult | null> {
    const cachedData = await authCacheManager.getUserAuthData(userId);
    
    if (!cachedData) {
      return null;
    }

    return {
      user: cachedData.user,
      userRole: cachedData.claims.user_role || 'unknown',
      clientId: cachedData.claims.client_id || '',
      isAuthenticated: true,
      isStudent: cachedData.claims.is_student || false,
      cacheHit: true,
    };
  }

  /**
   * Get auth data with RPC functions (Phase 2 approach with security fix)
   */
  private async getAuthDataRPC(userId: string, supabase: any): Promise<OptimizedAuthResult | null> {
    try {
      // Try Redis cache first
      const cachedData = await authCacheManager.getCachedUserAuth(userId);
      
      if (cachedData) {
        return {
          user: cachedData.user,
          userRole: cachedData.claims.user_role || 'unknown',
          clientId: cachedData.claims.client_id || '',
          isAuthenticated: true,
          isStudent: cachedData.claims.is_student || false,
          cacheHit: true,
        };
      }

      // Cache miss - use RPC function with middleware's supabase instance (SECURITY FIX)
      // This ensures session refresh is preserved and cookies are properly handled
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_user_auth_profile_cached',
        { user_id: userId }
      );

      if (rpcError || !rpcData || rpcData.length === 0) {
        console.error('RPC auth data fetch error:', rpcError);
        return null;
      }

      const profileData = rpcData[0];

      // Build claims from RPC data
      const claims = {
        user_role: profileData.user_role as 'Admin' | 'Staff' | 'Client Staff' | 'student',
        client_id: profileData.client_id,
        profile_is_active: profileData.profile_is_active,
        is_student: profileData.is_student,
        student_is_active: profileData.student_is_active,
        job_readiness_star_level: profileData.job_readiness_star_level ? 
          (['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const)[profileData.job_readiness_star_level - 1] : 
          undefined,
        job_readiness_tier: profileData.job_readiness_tier as 'BRONZE' | 'SILVER' | 'GOLD' | undefined,
      };

      // Get user from middleware's supabase instance (already contains refreshed session)
      const { data: { user } } = await supabase.auth.getUser();
      
      // Cache the result for future use
      if (user) {
        authCacheManager.setCachedUserAuth(userId, user, claims).catch(console.error);
      }

      return {
        user: user || { id: userId } as any,
        userRole: claims.user_role || 'unknown',
        clientId: claims.client_id || '',
        isAuthenticated: true,
        isStudent: claims.is_student || false,
        cacheHit: false,
      };
    } catch (error) {
      console.error('RPC auth data error:', error);
      return null;
    }
  }

  /**
   * Check access permissions
   */
  private checkAccess(
    pathname: string,
    authData: OptimizedAuthResult,
    routeType: string
  ): { allowed: boolean; reason?: string } {
    const { userRole, isStudent } = authData;

    // Student app routes
    if (routeType === 'app' || routeType === 'api-app') {
      if (userRole !== 'student') {
        return { allowed: false, reason: 'Non-student trying to access student routes' };
      }
      return { allowed: true };
    }

    // Admin-only routes
    if (ROUTE_CONFIG.ADMIN_ONLY.some(route => 
      authCacheManager.pathMatchesPattern(pathname, route)
    )) {
      if (userRole !== 'Admin') {
        return { allowed: false, reason: 'Non-admin trying to access admin-only routes' };
      }
      return { allowed: true };
    }

    // Admin and Staff routes
    if (ROUTE_CONFIG.ADMIN_AND_STAFF.some(route => 
      authCacheManager.pathMatchesPattern(pathname, route)
    )) {
      if (!['Admin', 'Staff'].includes(userRole)) {
        return { allowed: false, reason: 'Insufficient privileges for admin/staff routes' };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Handle unauthenticated access
   */
  private handleUnauthenticated(
    request: NextRequest,
    pathname: string,
    routeType: string,
    supabaseResponse: NextResponse
  ): NextResponse {
    securityLogger.logEvent({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: SecuritySeverity.WARNING,
      category: SecurityCategory.AUTHORIZATION,
      endpoint: pathname,
      method: request.method,
      details: {
        attemptedRoute: pathname,
        routeType,
        reason: 'No authenticated user'
      }
    }, request);

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = (routeType === 'app' || routeType === 'api-app') ? '/app/login' : '/admin/login';
    redirectUrl.search = `redirectedFrom=${encodeURIComponent(pathname)}`;
    
    const redirectResponse = NextResponse.redirect(redirectUrl);
    
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }

  /**
   * Handle authentication failure
   */
  private handleAuthFailure(
    request: NextRequest,
    pathname: string,
    routeType: string,
    supabaseResponse: NextResponse
  ): NextResponse {
    securityLogger.logEvent({
      eventType: SecurityEventType.AUTH_FAILURE,
      severity: SecuritySeverity.WARNING,
      category: SecurityCategory.AUTHENTICATION,
      endpoint: pathname,
      method: request.method,
      details: {
        reason: 'Failed to get auth data',
        routeType
      }
    }, request);

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = (routeType === 'app' || routeType === 'api-app') ? '/app/login' : '/admin/login';
    
    const redirectResponse = NextResponse.redirect(redirectUrl);
    
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }

  /**
   * Handle access denied
   */
  private handleAccessDenied(
    request: NextRequest,
    pathname: string,
    authData: OptimizedAuthResult,
    reason: string,
    supabaseResponse: NextResponse
  ): NextResponse {
    const severity = reason.includes('admin-only') ? SecuritySeverity.CRITICAL : SecuritySeverity.WARNING;
    
    securityLogger.logEvent({
      eventType: SecurityEventType.ROLE_VALIDATION_FAILED,
      severity,
      category: SecurityCategory.AUTHORIZATION,
      userId: authData.user.id,
      userRole: authData.userRole,
      endpoint: pathname,
      method: request.method,
      details: {
        attemptedRoute: pathname,
        actualRole: authData.userRole,
        reason
      }
    }, request);

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/admin/login';
    
    const redirectResponse = NextResponse.redirect(redirectUrl);
    
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }
}

// Singleton instance
export const optimizedMiddleware = new OptimizedMiddleware();