import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
// Removed unsafe JWT imports - now using Supabase's built-in validation

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
  // Create supabaseResponse using the correct SSR pattern
  let supabaseResponse = NextResponse.next({
    request,
  });

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

  // --- 1. Handle Logout --- 
  if (pathname === '/auth/logout') {
    await supabase.auth.signOut();
    
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = ''; // Clear any query params
    
    const redirectResponse = NextResponse.redirect(redirectUrl);
    
    // Copy all cookies from supabaseResponse to redirectResponse
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }

  // --- 2. Get User Session (Following SSR Guidelines) ---
  // IMPORTANT: DO NOT REMOVE auth.getUser() - Required for SSR
  const { data: { user } } = await supabase.auth.getUser();

  // --- 3. Define Public and Protected Routes --- 
  const publicPaths = [
    '/', 
    '/admin/login', 
    '/app/login', 
    '/login', 
    '/auth/forgot-password', 
    '/auth/update-password', 
    '/api/auth/callback', 
    '/api/app/auth/login', 
    '/api/admin/auth/login'
  ];
  
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
    const redirectResponse = NextResponse.redirect(redirectUrl);
    
    // Copy all cookies from supabaseResponse to redirectResponse
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }

  // --- 5. Secure Role Authorization (Uses Supabase Validation) ---
  if (user) {
    // Get verified session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Extract user role from verified session metadata or database
      let userRole = session.user.app_metadata?.user_role;
      
      // If role not in metadata, check database
      if (!userRole) {
        // Check if user is a student
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (student) {
          userRole = 'student';
        } else {
          // Check profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          userRole = profile?.role;
        }
      }
      
      // For student app routes, check role validation
      if (isAppRoute || isApiAppRoute) {
        if (userRole !== 'student') {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/admin/login';
          
          const redirectResponse = NextResponse.redirect(redirectUrl);
          
          // Copy all cookies from supabaseResponse to redirectResponse
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
          
          return redirectResponse;
        }
        // Allow access to student routes for student users
        return supabaseResponse;
      }
      
      // Admin-only routes check using verified role
      if (ADMIN_ONLY_ROUTES.some(route => pathMatchesPattern(pathname, route))) {
        if (userRole !== 'Admin') {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/admin/login';
          
          const redirectResponse = NextResponse.redirect(redirectUrl);
          
          // Copy all cookies from supabaseResponse to redirectResponse
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
          
          return redirectResponse;
        }
      }
      
      // Admin and Staff routes check using verified role
      if (ADMIN_AND_STAFF_ROUTES.some(route => pathMatchesPattern(pathname, route))) {
        if (!['Admin', 'Staff'].includes(userRole || '')) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/admin/login';
          
          const redirectResponse = NextResponse.redirect(redirectUrl);
          
          // Copy all cookies from supabaseResponse to redirectResponse
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
          
          return redirectResponse;
        }
      }
      
      // Legacy admin route check using verified role
      if (isAdminRoute && !ADMIN_AND_STAFF_ROUTES.some(route => pathMatchesPattern(pathname, route)) && !ADMIN_ONLY_ROUTES.some(route => pathMatchesPattern(pathname, route))) {
        if (userRole !== 'Admin') {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/admin/login';
          
          const redirectResponse = NextResponse.redirect(redirectUrl);
          
          // Copy all cookies from supabaseResponse to redirectResponse
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
          });
          
          return redirectResponse;
        }
      }
    }
  }

  // --- 6. Return Response (Following SSR Guidelines) ---
  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // This ensures proper session management and cookie synchronization.
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