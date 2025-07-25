import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import { type User } from '@supabase/supabase-js';

// JWT verification configuration
const JWT_VERIFICATION_CONFIG = {
  // JWKS cache TTL - 10 minutes as recommended by Supabase docs
  JWKS_CACHE_TTL: 10 * 60 * 1000,
  // Request-level cache TTL - 1 second to avoid duplicate work
  REQUEST_CACHE_TTL: 1 * 1000,
  // Max cache size to prevent memory leaks
  MAX_CACHE_SIZE: 1000,
  // Clock skew tolerance - 5 minutes as recommended
  CLOCK_SKEW_TOLERANCE: 5 * 60,
} as const;

// JWT verification result interface
export interface JWTVerificationResult {
  user: User | null;
  payload: JWTPayload | null;
  isValid: boolean;
  source: 'cache' | 'jwks' | 'auth-server';
  error?: string;
}

// Request-level cache entry
interface RequestCacheEntry {
  result: JWTVerificationResult;
  expiresAt: number;
}

// JWKS cache entry
interface JWKSCacheEntry {
  jwksSet: ReturnType<typeof createRemoteJWKSet>;
  createdAt: number;
}

/**
 * High-performance JWT verification service that eliminates Auth server round-trips
 * Uses Supabase JWKS endpoint for local verification with proper caching
 */
export class JWTVerificationService {
  // Request-level cache for identical tokens within same request cycle
  private requestCache = new Map<string, RequestCacheEntry>();
  
  // JWKS cache per project
  private jwksCache = new Map<string, JWKSCacheEntry>();
  
  // Metrics for monitoring
  private metrics = {
    totalVerifications: 0,
    cacheHits: 0,
    jwksVerifications: 0,
    authServerFallbacks: 0,
    errors: 0,
  };

  /**
   * Main JWT verification method with multi-level caching
   */
  async verifyJWT(token: string, projectUrl: string): Promise<JWTVerificationResult> {
    this.metrics.totalVerifications++;
    
    // Check request-level cache first (1-second TTL)
    const cached = this.getFromRequestCache(token);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    try {
      // Attempt local verification using JWKS
      const result = await this.verifyWithJWKS(token, projectUrl);
      
      // Cache successful results
      if (result.isValid) {
        this.setRequestCache(token, result);
      }
      
      return result;
    } catch (error) {
      console.error('JWT verification error:', error);
      this.metrics.errors++;
      
      // Fallback to Auth server for critical scenarios
      return this.fallbackToAuthServer(token, projectUrl);
    }
  }

  /**
   * Verify JWT using JWKS endpoint (primary method)
   * For projects using legacy JWT secret (HS256), this will fail and fallback to Auth server
   */
  private async verifyWithJWKS(token: string, projectUrl: string): Promise<JWTVerificationResult> {
    try {
      // Quick check: decode JWT header to see if it uses HS256 (legacy secret)
      const headerB64 = token.split('.')[0];
      const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
      
      if (header.alg === 'HS256') {
        // Legacy JWT secret detected - skip JWKS and go directly to Auth server
        throw new Error('Legacy HS256 JWT detected - Auth server validation required');
      }

      const jwksSet = this.getJWKSSet(projectUrl);
      
      // Verify JWT signature and extract payload
      const { payload } = await jwtVerify(token, jwksSet, {
        clockTolerance: JWT_VERIFICATION_CONFIG.CLOCK_SKEW_TOLERANCE,
      });

      this.metrics.jwksVerifications++;

      // Extract user information from JWT payload
      const user = this.extractUserFromPayload(payload);
      
      return {
        user,
        payload,
        isValid: true,
        source: 'jwks',
      };
    } catch (error) {
      // JWT verification failed - token uses legacy secret or is invalid
      return {
        user: null,
        payload: null,
        isValid: false,
        source: 'jwks',
        error: error instanceof Error ? error.message : 'JWT verification failed',
      };
    }
  }

  /**
   * Fallback to Auth server validation (for legacy JWT secrets or critical failures)
   */
  private async fallbackToAuthServer(token: string, projectUrl: string): Promise<JWTVerificationResult> {
    try {
      this.metrics.authServerFallbacks++;
      
      const response = await fetch(`${projectUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          user: null,
          payload: null,
          isValid: false,
          source: 'auth-server',
          error: `Auth server returned ${response.status}`,
        };
      }

      const user = await response.json();
      
      // Parse the JWT payload manually for additional claims
      const payload = this.parseJWTPayload(token);

      return {
        user,
        payload,
        isValid: true,
        source: 'auth-server',
      };
    } catch (error) {
      return {
        user: null,
        payload: null,
        isValid: false,
        source: 'auth-server',
        error: error instanceof Error ? error.message : 'Auth server validation failed',
      };
    }
  }

  /**
   * Get or create JWKS set for project with caching
   */
  private getJWKSSet(projectUrl: string): ReturnType<typeof createRemoteJWKSet> {
    const now = Date.now();
    const cached = this.jwksCache.get(projectUrl);
    
    // Check if cached JWKS is still valid
    if (cached && (now - cached.createdAt) < JWT_VERIFICATION_CONFIG.JWKS_CACHE_TTL) {
      return cached.jwksSet;
    }

    // Create new JWKS set
    const jwksUrl = new URL(`${projectUrl}/auth/v1/.well-known/jwks.json`);
    const jwksSet = createRemoteJWKSet(jwksUrl, {
      timeoutDuration: 10000, // 10 second timeout
      cooldownDuration: 30000, // 30 second cooldown between fetches
    });

    // Cache the new JWKS set
    this.jwksCache.set(projectUrl, {
      jwksSet,
      createdAt: now,
    });

    // Cleanup old entries to prevent memory leaks
    this.cleanupJWKSCache();

    return jwksSet;
  }

  /**
   * Extract user object from JWT payload
   */
  private extractUserFromPayload(payload: JWTPayload): User {
    return {
      id: payload.sub || '',
      email: payload.email as string || '',
      phone: payload.phone as string || '',
      user_metadata: payload.user_metadata as any || {},
      app_metadata: payload.app_metadata as any || {},
      aud: payload.aud as string || 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: undefined,
      phone_confirmed_at: undefined,
      last_sign_in_at: undefined,
      role: payload.role as string || 'authenticated',
      is_anonymous: payload.is_anonymous as boolean || false,
    };
  }

  /**
   * Parse JWT payload manually (for fallback scenarios)
   */
  private parseJWTPayload(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8')
      );
      
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Request-level caching methods
   */
  private getFromRequestCache(token: string): JWTVerificationResult | null {
    const entry = this.requestCache.get(token);
    
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() > entry.expiresAt) {
      this.requestCache.delete(token);
      return null;
    }
    
    return entry.result;
  }

  private setRequestCache(token: string, result: JWTVerificationResult): void {
    // Prevent memory leaks by limiting cache size
    if (this.requestCache.size >= JWT_VERIFICATION_CONFIG.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple cleanup)
      const entries = Array.from(this.requestCache.entries());
      entries.slice(0, 100).forEach(([key]) => {
        this.requestCache.delete(key);
      });
    }

    this.requestCache.set(token, {
      result,
      expiresAt: Date.now() + JWT_VERIFICATION_CONFIG.REQUEST_CACHE_TTL,
    });
  }

  /**
   * Cleanup expired JWKS cache entries
   */
  private cleanupJWKSCache(): void {
    const now = Date.now();
    
    for (const [projectUrl, entry] of this.jwksCache.entries()) {
      if ((now - entry.createdAt) > JWT_VERIFICATION_CONFIG.JWKS_CACHE_TTL) {
        this.jwksCache.delete(projectUrl);
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const hitRate = this.metrics.totalVerifications > 0 
      ? (this.metrics.cacheHits / this.metrics.totalVerifications) * 100 
      : 0;
      
    const authServerRate = this.metrics.totalVerifications > 0
      ? (this.metrics.authServerFallbacks / this.metrics.totalVerifications) * 100
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      authServerRate: Math.round(authServerRate * 100) / 100,
    };
  }

  /**
   * Clear all caches (for testing or emergency reset)
   */
  clearCaches(): void {
    this.requestCache.clear();
    this.jwksCache.clear();
  }

  /**
   * Get cache status for monitoring
   */
  getCacheStatus() {
    return {
      requestCacheSize: this.requestCache.size,
      jwksCacheSize: this.jwksCache.size,
      maxCacheSize: JWT_VERIFICATION_CONFIG.MAX_CACHE_SIZE,
    };
  }
}

// Singleton instance for application-wide use
export const jwtVerificationService = new JWTVerificationService();

// Export configuration for testing
export { JWT_VERIFICATION_CONFIG };