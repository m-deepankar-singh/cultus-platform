# Phase 2 Migration Guide: Database Query Optimization

This guide covers the implementation of Phase 2 optimizations for the authentication bottleneck solution.

## Phase 2 Overview

Phase 2 focuses on database query optimization through:
- **Phase 2.1**: Consolidated User Data RPC Functions
- **Phase 2.2**: Enhanced API Authentication with Redis + RPC

## Expected Performance Improvements

- **75% reduction** in auth-related database load
- **50% improvement** in API authentication speed
- **Single query** instead of 2-4 queries per auth request
- **Database-level caching** with materialized views

## Phase 2.1: Database RPC Functions

### 1. Apply Database Migration

First, apply the RPC functions to your Supabase database:

```bash
# Apply the RPC functions
supabase db reset --linked
# OR manually run the SQL file
psql -h your-db-host -U your-username -d your-database -f supabase/functions/auth-rpc.sql
```

### 2. Verify RPC Functions

Test the RPC functions in your Supabase SQL editor:

```sql
-- Test single user lookup
SELECT * FROM get_user_auth_profile_cached('user-uuid-here');

-- Test bulk user lookup
SELECT * FROM get_bulk_user_auth_profiles(ARRAY['user-uuid-1', 'user-uuid-2']);

-- Test materialized view
SELECT * FROM user_auth_cache LIMIT 10;

-- Check performance
SELECT * FROM get_auth_performance_stats();
```

### 3. Database Indexes

The migration creates optimized indexes automatically:

```sql
-- Students table auth index
CREATE INDEX CONCURRENTLY idx_students_auth_lookup 
ON students (id, client_id, is_active, job_readiness_star_level, job_readiness_tier);

-- Profiles table auth index
CREATE INDEX CONCURRENTLY idx_profiles_auth_lookup 
ON profiles (id, role, client_id, is_active);

-- Materialized view index
CREATE UNIQUE INDEX idx_user_auth_cache_user_id ON user_auth_cache (user_id);
```

## Phase 2.2: Enhanced API Authentication

### 1. Update Environment Variables

Add the following to your `.env.local`:

```bash
# Phase 2 RPC Optimization (optional)
ENABLE_PHASE2_RPC=true

# Redis Configuration (from Phase 1)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### 2. Update API Routes

Replace existing authentication calls with Phase 2 optimized versions:

#### Before (Phase 1):
```typescript
// Old API authentication
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequestSecure(['Admin', 'Staff']);
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  
  // Use authResult.user, authResult.claims, authResult.supabase
}
```

#### After (Phase 2):
```typescript
// New optimized API authentication
import { authenticateApiRequestHybrid } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequestHybrid(['Admin', 'Staff']);
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  
  // Use authResult.user, authResult.claims, authResult.supabase
  // Now with Redis caching + RPC fallback for optimal performance
}
```

### 3. Available Authentication Methods

Phase 2 provides multiple authentication methods:

```typescript
import { 
  authenticateApiRequestOptimized,  // Redis-first caching
  authenticateApiRequestRPC,        // RPC-only (database optimized)
  authenticateApiRequestHybrid      // Recommended: Redis + RPC fallback
} from '@/lib/auth/api-auth';

// Choose based on your needs:
// - authenticateApiRequestHybrid: Best overall performance (recommended)
// - authenticateApiRequestOptimized: Redis-heavy workloads
// - authenticateApiRequestRPC: Database-optimized, minimal Redis usage
```

### 4. Update Higher-Order Functions

For convenience, update route handlers to use the new authentication:

```typescript
// Before
import { withAuth } from '@/lib/auth/api-auth';

export const GET = withAuth(['Admin'])(async (req, auth) => {
  // Handler logic
});

// After - Create enhanced version
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestHybrid } from '@/lib/auth/api-auth';

export function withAuthOptimized(requiredRoles?: string[]) {
  return function(
    handler: (req: NextRequest, auth: any) => Promise<NextResponse>
  ) {
    return async function(req: NextRequest) {
      const authResult = await authenticateApiRequestHybrid(requiredRoles);
      
      if ('error' in authResult) {
        return NextResponse.json(
          { error: authResult.error }, 
          { status: authResult.status }
        );
      }

      return handler(req, authResult);
    };
  };
}

// Usage
export const GET = withAuthOptimized(['Admin'])(async (req, auth) => {
  // Handler logic with optimized auth
});
```

## Phase 2.3: Middleware Integration

The middleware will automatically use RPC functions when `ENABLE_PHASE2_RPC=true`:

```typescript
// middleware.ts - No changes needed
import { optimizedMiddleware } from '@/lib/auth/optimized-middleware';

export async function middleware(request: NextRequest) {
  // Automatically uses RPC functions when ENABLE_PHASE2_RPC=true
  return optimizedMiddleware.process(request);
}
```

## Performance Monitoring

### 1. Database Performance

Monitor RPC function performance:

```sql
-- Check auth performance stats
SELECT * FROM get_auth_performance_stats();

-- Monitor materialized view size
SELECT 
  schemaname,
  matviewname,
  matviewsize,
  matviewdefn
FROM pg_matviews 
WHERE matviewname = 'user_auth_cache';

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM get_user_auth_profile_cached('user-uuid');
```

### 2. Application Performance

Monitor cache hit rates and response times:

```typescript
// Add to your monitoring/health check endpoint
import { authCacheManager } from '@/lib/auth/auth-cache-manager';

export async function GET() {
  const metrics = authCacheManager.getMetrics();
  
  return NextResponse.json({
    phase: 2,
    redis_metrics: metrics,
    database_rpc: 'enabled',
    performance: {
      cache_hit_rate: metrics.hit_rate,
      avg_response_time: metrics.average_response_time,
      database_fallbacks: metrics.database_fallbacks
    }
  });
}
```

## Troubleshooting

### Common Issues

1. **RPC Function Not Found**
   ```
   Error: function get_user_auth_profile_cached(uuid) does not exist
   ```
   
   **Solution**: Apply the database migration:
   ```bash
   psql -h your-db-host -U your-username -d your-database -f supabase/functions/auth-rpc.sql
   ```

2. **Materialized View Stale Data**
   ```sql
   -- Manually refresh materialized view
   SELECT refresh_user_auth_cache();
   ```

3. **Permission Errors**
   ```
   Error: permission denied for function get_user_auth_profile_cached
   ```
   
   **Solution**: Check function permissions:
   ```sql
   GRANT EXECUTE ON FUNCTION get_user_auth_profile_cached(UUID) TO authenticated;
   ```

4. **Redis Connection Issues**
   - Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Check Redis instance health
   - Functions will fallback to RPC automatically

### Performance Debugging

Enable detailed logging:

```bash
# Enable RPC debugging
ENABLE_PHASE2_RPC=true
DEBUG_AUTH_PERFORMANCE=true
```

Check logs for:
- RPC function execution times
- Cache hit/miss ratios
- Database fallback frequency

## Rollback Plan

If issues occur, you can disable Phase 2 optimizations:

```bash
# Disable RPC optimization
ENABLE_PHASE2_RPC=false
```

Or revert to Phase 1 functions:

```typescript
// Revert to Phase 1 authentication
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

// Use this instead of Phase 2 functions
const authResult = await authenticateApiRequestSecure(['Admin']);
```

## Migration Checklist

### Phase 2.1 - Database Optimization
- [ ] Apply RPC functions migration (`supabase/functions/auth-rpc.sql`)
- [ ] Verify RPC functions work in SQL editor
- [ ] Check that indexes are created correctly
- [ ] Test materialized view refresh process
- [ ] Verify permissions are set correctly

### Phase 2.2 - API Authentication
- [ ] Add `ENABLE_PHASE2_RPC=true` to environment variables
- [ ] Update critical API routes to use `authenticateApiRequestHybrid`
- [ ] Test API authentication with Redis + RPC fallback
- [ ] Monitor cache hit rates and response times
- [ ] Update higher-order functions if needed

### Phase 2.3 - Middleware Integration
- [ ] Verify middleware automatically uses RPC when enabled
- [ ] Test route protection with RPC authentication
- [ ] Monitor middleware performance improvements
- [ ] Check that fallback to Redis/database works

### Validation
- [ ] Load test with 100+ concurrent users
- [ ] Verify 75% reduction in database queries
- [ ] Confirm 50% improvement in API auth speed
- [ ] Check that all authentication flows work correctly
- [ ] Validate error handling and fallback mechanisms

## Expected Results

After successful Phase 2 implementation:

### Database Metrics
- **Query Reduction**: 75% fewer auth-related database queries
- **Response Time**: <10ms for RPC function calls
- **Cache Hit Rate**: >90% with Redis + materialized view

### API Performance
- **Authentication Speed**: 50% faster API authentication
- **Concurrent Users**: Support for 1000+ concurrent users
- **Memory Usage**: <5MB additional memory for RPC caching

### Monitoring Dashboard
- Real-time cache hit rates
- RPC function performance metrics
- Database query reduction statistics
- Authentication response time tracking

## Next Steps

After Phase 2 completion, consider:
1. **Phase 3**: Advanced caching architecture
2. **Phase 4**: Security & compliance enhancements
3. **Phase 5**: Advanced optimizations and microservices preparation

---

*Phase 2 Migration Guide*
*Version: 1.0*
*Created: 2025-01-16*
*Status: Ready for Implementation*