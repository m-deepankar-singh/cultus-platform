import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type Database } from '@/lib/database.types';
import { type SupabaseClient } from '@supabase/supabase-js';

// Connection pool for Supabase clients
const clientPool = new Map<string, SupabaseClient<Database>>();
const poolMetrics = {
  hits: 0,
  misses: 0,
  created: 0,
  cleaned: 0,
  lastCleanup: Date.now(),
};

// Pool configuration optimized for 1000 concurrent users
const POOL_CONFIG = {
  maxSize: 150, // Increased from 20 to support 1000 users (1000/150 = ~7 users per connection)
  maxAge: 600000, // 10 minutes (increased for better reuse)
  cleanupInterval: 120000, // 2 minutes (reduced cleanup frequency)
  warmupSize: 10, // Maintain minimum connections
};

/**
 * Generate a cache key for the client based on cookies
 */
async function generateClientKey(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const authCookies = cookieStore.getAll()
      .filter((cookie: { name: string; value: string }) => cookie.name.startsWith('sb-'))
      .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
      .sort()
      .join('|');
    
    return `client:${Buffer.from(authCookies).toString('base64').slice(0, 32)}`;
  } catch (error) {
    // Fallback to timestamp-based key for unique instances
    return `client:fallback:${Date.now()}:${Math.random()}`;
  }
}

/**
 * Clean up expired clients from the pool
 */
function cleanupPool(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, client] of clientPool.entries()) {
    const metadata = (client as any)._poolMetadata;
    if (metadata && now - metadata.createdAt > POOL_CONFIG.maxAge) {
      expiredKeys.push(key);
    }
  }
  
  for (const key of expiredKeys) {
    clientPool.delete(key);
    poolMetrics.cleaned++;
  }
  
  // If pool is too large, remove oldest entries while maintaining warmup size
  const targetSize = Math.max(POOL_CONFIG.warmupSize, POOL_CONFIG.maxSize);
  if (clientPool.size > targetSize) {
    const entries = Array.from(clientPool.entries());
    entries.sort((a, b) => {
      const aTime = (a[1] as any)._poolMetadata?.createdAt || 0;
      const bTime = (b[1] as any)._poolMetadata?.createdAt || 0;
      return aTime - bTime;
    });
    
    const toRemove = entries.slice(0, clientPool.size - targetSize);
    for (const [key] of toRemove) {
      clientPool.delete(key);
      poolMetrics.cleaned++;
    }
  }
  
  poolMetrics.lastCleanup = now;
}

/**
 * Warm up the connection pool with minimum connections
 */
async function warmupPool(): Promise<void> {
  if (clientPool.size >= POOL_CONFIG.warmupSize) {
    return;
  }
  
  const warmupPromises: Promise<void>[] = [];
  const needed = POOL_CONFIG.warmupSize - clientPool.size;
  
  for (let i = 0; i < needed; i++) {
    warmupPromises.push(
      (async () => {
        try {
          await createOptimizedClient();
        } catch (error) {
          console.warn('Pool warmup failed:', error);
        }
      })()
    );
  }
  
  await Promise.allSettled(warmupPromises);
}

/**
 * Create optimized Supabase client with connection pooling
 */
export async function createOptimizedClient(): Promise<SupabaseClient<Database>> {
  const clientKey = await generateClientKey();
  
  // Check if client exists in pool
  if (clientPool.has(clientKey)) {
    const client = clientPool.get(clientKey)!;
    const metadata = (client as any)._poolMetadata;
    
    // Verify client is still valid
    if (metadata && Date.now() - metadata.createdAt < POOL_CONFIG.maxAge) {
      poolMetrics.hits++;
      return client;
    } else {
      // Remove expired client
      clientPool.delete(clientKey);
    }
  }
  
  // Create new client
  const cookieStore = await cookies();
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Ignore cookie setting errors in read-only contexts
          }
        },
      },
    }
  );
  
  // Add metadata for pool management
  (client as any)._poolMetadata = {
    createdAt: Date.now(),
    key: clientKey,
  };
  
  // Store in pool
  clientPool.set(clientKey, client);
  poolMetrics.misses++;
  poolMetrics.created++;
  
  // Periodic cleanup and warmup
  const now = Date.now();
  if (now - poolMetrics.lastCleanup > POOL_CONFIG.cleanupInterval) {
    cleanupPool();
    // Trigger warmup in background (don't await to avoid blocking)
    warmupPool().catch(() => {}); 
  }
  
  return client;
}

/**
 * Create standard Supabase client (fallback)
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Ignore cookie setting errors in read-only contexts
          }
        },
      },
    }
  );
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  return {
    ...poolMetrics,
    poolSize: clientPool.size,
    hitRate: poolMetrics.hits + poolMetrics.misses > 0 
      ? (poolMetrics.hits / (poolMetrics.hits + poolMetrics.misses)) * 100 
      : 0,
  };
}

/**
 * Clear the connection pool (for testing/debugging)
 */
export function clearPool(): void {
  clientPool.clear();
  poolMetrics.hits = 0;
  poolMetrics.misses = 0;
  poolMetrics.created = 0;
  poolMetrics.cleaned = 0;
  poolMetrics.lastCleanup = Date.now();
}

/**
 * Force cleanup of the pool
 */
export function forceCleanup(): void {
  cleanupPool();
}