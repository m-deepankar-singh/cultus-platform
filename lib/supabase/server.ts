import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define a function that creates a Supabase client for server-side operations
// This function MUST use the getAll/setAll pattern as per the rule.
export async function createClient() {
  const cookieStore = await cookies(); // Get the cookie store from next/headers

  // Create a server-side Supabase client instance with the CORRECT cookie handling
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Use getAll as required by the rule
        getAll() {
          return cookieStore.getAll();
        },
        // Use setAll as required by the rule
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}