import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
}

// Create a single instance of the Supabase client for admin operations
// NOTE: this assumes the process runs long enough for this to be beneficial.
// In serverless functions, creating the client per request might be necessary if cold starts are frequent.
// Using generics for Database type definition is recommended for better type safety
// Replace `any` with your actual Database type from `supabase gen types typescript`
const supabaseAdmin: SupabaseClient<any, "public", any> = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      // Prevent client persistence for service role key
      autoRefreshToken: false,
      persistSession: false,
      // It's recommended to set detectSessionInUrl to false for admin clients
      detectSessionInUrl: false 
    },
  }
);

/**
 * Retrieves the Supabase admin client instance.
 * This client uses the Service Role Key and should ONLY be used in secure server-side environments.
 * NEVER expose this client or the Service Role Key to the browser or client-side code.
 * 
 * @returns {SupabaseClient<any, "public", any>} The Supabase admin client instance.
 */
export function createAdminClient(): SupabaseClient<any, "public", any> {
  // In a serverless environment, you might conditionally create the client here
  // if (!supabaseAdmin) { /* create client */ }
  return supabaseAdmin;
} 