"use client";

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Create a supabase client on the browser with project's credentials
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        // Reduce realtime warnings by limiting event rate
        // Can be increased if realtime subscriptions are needed
        params: {
          eventsPerSecond: 2,
        },
      },
    }
  );
} 