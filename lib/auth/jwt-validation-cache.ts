import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { type User } from '@supabase/supabase-js';

// JWT validation cache configuration
const JWT_CACHE_CONFIG = {
  maxSize: 1000,
  ttl: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
};

// JWT validation cache entry
interface JWTCacheEntry {
  user: User;
  payload: JWTPayload;
  validUntil: number;
  createdAt: number;
}

// JWT validation cache
class JWTValidationCache {
  private cache = new Map<string, JWTCacheEntry>();
  private lastCleanup = Date.now();
  private jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

  /**
   * Get or create JWKS set for project
   */
  private getJWKSSet(projectUrl: string) {
    if (!this.jwksCache.has(projectUrl)) {
      const jwksUrl = new URL(`${projectUrl}/auth/v1/.well-known/jwks.json`);
      this.jwksCache.set(projectUrl, createRemoteJWKSet(jwksUrl));
    }
    return this.jwksCache.get(projectUrl)!;
  }

  /**
   * Validate JWT using Auth server (for legacy JWT secrets)
   * This is the recommended approach for HS256 signed JWTs
   */
  private async validateWithAuthServer(token: string, projectUrl: string): Promise<JWTPayload | null> {
    try {
      const response = await fetch(`${projectUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      
      // Extract and decode JWT payload manually since Auth server validation confirms it's valid
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload;
    } catch (error) {
      console.error('Auth server validation error:', error);
      return null;
    }
  }

  /**
   * Validate JWT token and return user info
   */
  async validateJWT(token: string): Promise<{ user: User; payload: JWTPayload } | null> {
    try {
      // Check cache first
      const cached = this.cache.get(token);
      if (cached && Date.now() < cached.validUntil) {
        return { user: cached.user, payload: cached.payload };
      }

      // Get project URL from environment
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!projectUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
      }

      let payload: JWTPayload;
      
      try {
        // Try JWKS validation first (for modern asymmetric keys)
        const jwksSet = this.getJWKSSet(projectUrl);
        const result = await jwtVerify(token, jwksSet);
        payload = result.payload;
      } catch (jwksError) {
        // If JWKS fails (likely legacy HS256), fallback to Auth server validation
        // This is the recommended approach for legacy JWT secrets according to Supabase docs
        const authValidationResult = await this.validateWithAuthServer(token, projectUrl);
        if (!authValidationResult) {
          throw new Error('JWT validation failed with both JWKS and Auth server');
        }
        payload = authValidationResult;
      }

      // Extract user information from JWT payload
      const user: User = {
        id: payload.sub!,
        aud: typeof payload.aud === 'string' ? payload.aud : payload.aud?.[0] || 'authenticated',
        role: payload.role as string,
        email: payload.email as string,
        email_confirmed_at: payload.email_confirmed_at as string,
        phone: payload.phone as string,
        phone_confirmed_at: payload.phone_confirmed_at as string,
        confirmed_at: payload.confirmed_at as string,
        last_sign_in_at: payload.last_sign_in_at as string,
        app_metadata: payload.app_metadata as Record<string, any> || {},
        user_metadata: payload.user_metadata as Record<string, any> || {},
        identities: [],
        created_at: payload.created_at as string,
        updated_at: payload.updated_at as string,
        is_anonymous: payload.is_anonymous as boolean || false,
      };

      // Cache the result (valid until JWT expires)
      const validUntil = (payload.exp! * 1000) - 30000; // 30 seconds before expiry
      this.cache.set(token, {
        user,
        payload,
        validUntil,
        createdAt: Date.now(),
      });

      // Cleanup old entries periodically
      this.cleanup();

      return { user, payload };
    } catch (error) {
      console.error('JWT validation error:', error);
      return null;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    
    // Only cleanup every minute
    if (now - this.lastCleanup < JWT_CACHE_CONFIG.cleanupInterval) {
      return;
    }

    const expiredKeys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.validUntil) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    // If cache is too large, remove oldest entries
    if (this.cache.size > JWT_CACHE_CONFIG.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const toRemove = entries.slice(0, this.cache.size - JWT_CACHE_CONFIG.maxSize);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }

    this.lastCleanup = now;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: JWT_CACHE_CONFIG.maxSize,
      lastCleanup: this.lastCleanup,
      jwksProjects: this.jwksCache.size,
    };
  }

  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
    this.jwksCache.clear();
  }
}

// Export singleton instance
export const jwtValidationCache = new JWTValidationCache();

/**
 * Fast JWT validation using JWKS endpoint and caching
 */
export async function validateJWTFast(token: string): Promise<{ user: User; payload: JWTPayload } | null> {
  return await jwtValidationCache.validateJWT(token);
}