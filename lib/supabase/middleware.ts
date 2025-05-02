import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export function createClient(request: NextRequest) {
  // Create an initial response object to be potentially modified
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Apply cookies to the request object first (name and value only)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          
          // Create the response *after* modifying the request cookies
          // Pass the modified request object to NextResponse.next()
          response = NextResponse.next({
            request: {
              headers: request.headers, // Maintain original headers
            },
          });

          // Apply cookies to the response object created from the *modified* request
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, response };
} 