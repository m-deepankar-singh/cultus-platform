import { createClient } from './lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';

// Helper function to fetch profile data (similar to lib/supabase/utils, but adapted for middleware context)
// Note: Consider moving role to app_metadata for performance to avoid this extra query.
async function getRoleFromProfile(supabase: any, userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      if (error && error.code !== 'PGRST116') { // Ignore "No rows found" errors silently
          // Error logged to monitoring in production environment
      }
      return null;
    }
    return data.role;
  } catch (err) {
      // Error logged to monitoring in production environment
      return null;
  }
}

// New helper function to check if user is a student by checking students table
async function isUserStudent(supabase: any, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST116') { // Ignore "No rows found" errors silently
        // Error logged to monitoring in production environment
      }
      return false;
    }
    
    return data && data.is_active === true;
  } catch (err) {
    // Error logged to monitoring in production environment
    return false;
  }
}

// Admin-specific routes (only Admin can access)
const ADMIN_ONLY_ROUTES = [
  // User management routes
  '/users',
  '/admin/users',
  
  // Module creation and editing routes
  '/modules/create',
  '/modules/.*/edit',
  '/api/admin/modules', // Block API endpoints for module CRUD operations
];

// Routes accessible by Admin and Staff roles
const ADMIN_AND_STAFF_ROUTES = [
  // Admin dashboard
  '/dashboard',
  
  // Client management
  '/clients',
  '/api/admin/clients',
  '/api/staff/clients',
  
  // Product management
  '/products',
  '/api/admin/products',
  
  // Learner management
  '/learners',
  '/api/admin/learners',
  '/api/staff/learners',
  
  // Module viewing (but not editing)
  '/modules',
  '/api/admin/products/*/modules', // Allow viewing modules for a product
];

// Helper function to check if a path matches a route pattern
function pathMatchesPattern(pathname: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    // Convert glob pattern to regex pattern
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regexPattern.test(pathname);
  }
  return pathname === pattern || pathname.startsWith(`${pattern}/`);
}

export async function middleware(request: NextRequest) {
  let { supabase, response: supabaseResponse } = createClient(request);
  const { pathname } = request.nextUrl;

  // --- 1. Handle Logout --- 
  if (pathname === '/auth/logout') {
    await supabase.auth.signOut();
    
    const redirectUrl = request.nextUrl.clone();
    
    // Redirect to homepage after logout
    redirectUrl.pathname = '/';
    
    redirectUrl.search = ''; // Clear any query params
    // Ensure response cookies reflect the signOut operation
    let redirectResponse = NextResponse.redirect(redirectUrl);
    
    // Copy all cookies from supabaseResponse to redirectResponse
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    
    return redirectResponse;
  }

  // --- 2. Refresh Session (Essential) ---
  // Use getUser instead of getSession for active user check
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // --- 3. Define Public and Protected Routes --- 
  const publicPaths = ['/', '/admin/login', '/app/login', '/login', '/auth/forgot-password', '/auth/update-password', '/api/auth/callback', '/api/app/auth/login', '/api/admin/auth/login']; // Add any other public paths
  
  // Check if route is protected
  const isAdminRoute = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  const isAppRoute = pathname.startsWith('/app') && !pathname.startsWith('/app/login');
  const isApiAppRoute = pathname.startsWith('/api/app');
  const isProtectedRoute = isAdminRoute || isAppRoute || isApiAppRoute || 
    ADMIN_ONLY_ROUTES.some(route => pathMatchesPattern(pathname, route)) ||
    ADMIN_AND_STAFF_ROUTES.some(route => pathMatchesPattern(pathname, route));

  // --- 4. Access Control Logic --- 

  // Allow access to public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return supabaseResponse; // Allow request to proceed
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    
    // Direct users to the appropriate login page based on the route they're trying to access
    if (isAppRoute || isApiAppRoute) {
      // Student app users go to student login
      redirectUrl.pathname = '/app/login';
    } else {
      // Admin and staff users go to admin login
      redirectUrl.pathname = '/admin/login';
    }
    
    redirectUrl.search = `redirectedFrom=${encodeURIComponent(pathname)}`; // Optional: pass redirect info
    let redirectResponse = NextResponse.redirect(redirectUrl);
    
    // Copy all cookies from supabaseResponse to redirectResponse
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    
    return redirectResponse;
  }

  // User is authenticated, check roles for specific routes
  if (user) {
    // For student app routes, check students table
    if (isAppRoute || isApiAppRoute) {
      const isStudent = await isUserStudent(supabase, user.id);
      if (!isStudent) {
        const redirectUrl = request.nextUrl.clone();
        // Redirect non-students away from student app
        redirectUrl.pathname = '/admin/login';
        let redirectResponse = NextResponse.redirect(redirectUrl);
        
        // Copy all cookies from supabaseResponse to redirectResponse
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        
        return redirectResponse;
      }
      // Allow access to student routes for student users
      return supabaseResponse;
    }
    
    // For admin/staff routes, check profiles table
    const role = await getRoleFromProfile(supabase, user.id);
    
    // Admin-only routes check
    if (ADMIN_ONLY_ROUTES.some(route => pathMatchesPattern(pathname, route))) {
      if (role !== 'Admin') {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/admin/login';
        let redirectResponse = NextResponse.redirect(redirectUrl);
        
        // Copy all cookies from supabaseResponse to redirectResponse
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        
        return redirectResponse;
      }
    }
    
    // Admin and Staff routes check
    if (ADMIN_AND_STAFF_ROUTES.some(route => pathMatchesPattern(pathname, route))) {
      if (role !== 'Admin' && role !== 'Staff') {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/admin/login';
        let redirectResponse = NextResponse.redirect(redirectUrl);
        
        // Copy all cookies from supabaseResponse to redirectResponse
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        
        return redirectResponse;
      }
    }
    
    // Legacy admin route check
          if (isAdminRoute && !ADMIN_AND_STAFF_ROUTES.some(route => pathMatchesPattern(pathname, route)) && !ADMIN_ONLY_ROUTES.some(route => pathMatchesPattern(pathname, route))) {
        if (role !== 'Admin') {
          const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/admin/login';
        let redirectResponse = NextResponse.redirect(redirectUrl);
        
        // Copy all cookies from supabaseResponse to redirectResponse
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value);
        });
        
        return redirectResponse;
      }
    }
  }

  // --- 5. Return Response --- 
  // If no redirect happened, return the response potentially modified by ssr
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - API routes intended to be public *before* auth (e.g., /api/auth/callback)
     * 
     * Refined matcher to exclude specific public paths and common static assets.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth/callback|admin/login|app/login|login|auth/forgot-password|auth/update-password).*)',
  ],
}; 