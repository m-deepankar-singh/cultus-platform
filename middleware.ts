import { type NextRequest } from 'next/server';
import { optimizedMiddleware } from '@/lib/auth/optimized-middleware';

export async function middleware(request: NextRequest) {
  return optimizedMiddleware.process(request);
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