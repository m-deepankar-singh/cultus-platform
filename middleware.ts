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
          console.error(`Middleware: Error fetching profile role for user ${userId}:`, error.message);
      }
      return null;
    }
    return data.role;
  } catch (err) {
      console.error(`Middleware: Unexpected error fetching profile role for user ${userId}:`, err);
      return null;
  }
}

export async function middleware(request: NextRequest) {
  let { supabase, response } = createClient(request);
  const { pathname } = request.nextUrl;

  // --- 1. Handle Logout --- 
  if (pathname === '/auth/logout') {
    console.log('Middleware: Handling /auth/logout');
    await supabase.auth.signOut();
    // Redirect to a public page after logout, e.g., admin login
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/admin/login'; 
    redirectUrl.search = ''; // Clear any query params
    // Ensure response cookies reflect the signOut operation
    response = NextResponse.redirect(redirectUrl, { headers: response.headers });
    // Apply potential cookie changes from signOut to the redirect response
    // This might involve re-creating the client with the redirect response if
    // the ssr library needs the exact response object it can modify.
    // Re-check Supabase ssr docs if logout cookies aren't cleared.
    console.log('Middleware: Redirecting to /admin/login after logout');
    return response;
  }

  // --- 2. Refresh Session (Essential) ---
  // Use getUser instead of getSession for active user check
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // --- 3. Define Public and Protected Routes --- 
  const publicPaths = ['/admin/login', '/login', '/auth/forgot-password', '/auth/update-password', '/api/auth/callback']; // Add any other public paths
  const isAdminRoute = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  const isAppRoute = pathname.startsWith('/app'); // Example protected app route
  const isGeneralDashboardRoute = pathname.startsWith('/dashboard') || pathname === '/'; // Treat root as dashboard
  const isProtectedRoute = isAdminRoute || isAppRoute || isGeneralDashboardRoute; // Combine protected areas

  // --- 4. Access Control Logic --- 

  // Allow access to public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
      console.log(`Middleware: Allowing public access to ${pathname}`);
      return response; // Allow request to proceed
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!user && isProtectedRoute) {
    console.warn(`Middleware: Unauthenticated access attempt to ${pathname}, redirecting to login.`);
    const redirectUrl = request.nextUrl.clone();
    // Redirect to admin login for admin routes, general login otherwise
    redirectUrl.pathname = isAdminRoute ? '/admin/login' : '/login';
    redirectUrl.search = `redirectedFrom=${encodeURIComponent(pathname)}`; // Optional: pass redirect info
    return NextResponse.redirect(redirectUrl, { headers: response.headers });
  }

  // User is authenticated, check roles for specific routes
  if (user) {
    // Admin Route Protection
    if (isAdminRoute) {
      const role = await getRoleFromProfile(supabase, user.id);
      console.log(`Middleware: User ${user.id} accessing admin route ${pathname}. Role: ${role}`);
      if (role !== 'Admin') {
        console.warn(`Middleware: User ${user.id} (Role: ${role}) unauthorized for admin route ${pathname}. Redirecting.`);
        // Option 1: Redirect to a generic dashboard or access denied page
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/dashboard'; // Or a specific '/access-denied' page
        return NextResponse.redirect(redirectUrl, { headers: response.headers });
        // Option 2: Return a 403 Forbidden response (less user-friendly)
        // return new NextResponse('Forbidden: Admin access required', { status: 403, headers: response.headers });
      }
      // If user is Admin, allow access
      console.log(`Middleware: Admin user ${user.id} granted access to ${pathname}`);
    }
    
    // Add checks for other roles/routes if needed (e.g., Staff, Client Staff)

  }

  // --- 5. Return Response --- 
  // If no redirect happened, return the response potentially modified by ssr
  // As a safeguard, ensure the response cookies reflect any final changes made
  // to the request cookies during the middleware execution.
  // Note: This might be redundant if the closure modification of `response` works as expected.
  const latestRequestCookies = request.cookies.getAll();
  latestRequestCookies.forEach(cookie => {
    // We only have name/value from request cookies, need to set them on response
    // This won't include options like HttpOnly, Path, etc., which `setAll` should have handled.
    // This is truly just a fallback/debugging step.
    response.cookies.set(cookie.name, cookie.value);
  });

  console.log(`Middleware: Allowing authenticated user ${user?.id || 'N/A'} access to ${pathname}`);
  return response;
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth/callback|admin/login|login|auth/forgot-password|auth/update-password).*)',
  ],
}; 