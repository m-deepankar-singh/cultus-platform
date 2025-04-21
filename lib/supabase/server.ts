import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define a function that creates a Supabase client for server-side operations
export const createClient = async () => {
  // Get the cookie store from the headers
  const cookieStore = await cookies();

  // Create a server-side Supabase client instance with cookie handling
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Define the get method for retrieving cookies
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Define the set method for setting cookies
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Attempt to set the cookie using the cookie store
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
            // console.error("Error setting cookie from Server Component:", error);
          }
        },
        // Define the remove method for deleting cookies
        remove(name: string, options: CookieOptions) {
          try {
            // Attempt to delete the cookie by setting an empty value and options
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
            // console.error("Error removing cookie from Server Component:", error);
          }
        },
      },
    }
  );
}; 