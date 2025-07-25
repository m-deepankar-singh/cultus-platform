# JWT Signing Key Migration Plan
## From Legacy HS256 to Asymmetric ES256 Keys

**Document Version:** 1.0  
**Migration Target:** Production Environment  
**Estimated Duration:** 45-60 minutes  
**Risk Level:** Medium (with zero downtime strategy)

---

## Overview

This plan outlines the migration from legacy HS256 JWT signing keys to modern asymmetric ES256 keys in Supabase, enabling local JWT verification and eliminating expensive Auth server round-trips (50-100ms savings per request).

### Current State
- **JWT Algorithm:** HS256 (symmetric, legacy)
- **Verification Method:** Auth server validation required
- **Performance Impact:** 50-100ms per middleware request
- **JWKS Endpoint:** Returns empty keys (incompatible with asymmetric verification)

### Target State
- **JWT Algorithm:** ES256 (asymmetric, modern)
- **Verification Method:** Local JWKS verification
- **Performance Improvement:** ~95% latency reduction for JWT verification
- **JWKS Endpoint:** Returns public keys for local verification

---

## Prerequisites

### Environment Verification
- [ ] **Supabase Project Access:** Admin access to Supabase dashboard
- [ ] **Deployment Pipeline:** Verified deployment process
- [ ] **Monitoring Tools:** Application performance monitoring active
- [ ] **Rollback Capability:** Confirmed ability to revert database changes

### Technical Requirements
- [ ] **JWT Verification Service:** Already implemented (`lib/auth/jwt-verification-service.ts`)
- [ ] **Feature Flags:** Environment variables configured (`ENABLE_LOCAL_JWT_VERIFICATION`)
- [ ] **Fallback Logic:** Auth server fallback for HS256 tokens implemented
- [ ] **Performance Monitoring:** Metrics collection active

---

## Migration Phases

### Phase 1: Preparation and Validation (10 minutes)

#### 1.1 Pre-Migration Checklist
```bash
# Verify current configuration
curl -s "https://meizvwwhasispvfbprck.supabase.co/auth/v1/.well-known/jwks.json" | jq .

# Expected: Empty keys array for HS256 projects
# {"keys": []}
```

#### 1.2 Application State Verification
```bash
# Confirm feature flag status
grep "ENABLE_LOCAL_JWT_VERIFICATION" .env
# Should be: ENABLE_LOCAL_JWT_VERIFICATION=true

# Test current authentication flow
pnpm test:middleware-performance
```

#### 1.3 Create Migration Backup Point
```bash
# Document current JWT configuration
echo "Migration started: $(date)" >> migration.log
echo "Current JWKS endpoint: Empty keys (HS256)" >> migration.log
```

### Phase 2: Supabase Configuration Update (15 minutes)

#### 2.1 Access Supabase Dashboard
1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `meizvwwhasispvfbprck`
3. Go to **Settings** → **API** → **JWT Settings**

#### 2.2 Enable Asymmetric JWT Signing
1. **Locate JWT Configuration Section**
   - Find "JWT Signing Algorithm" settings
   - Current setting should show "HS256"

2. **Update Algorithm Settings**
   ```
   Algorithm: ES256 (or RS256 as alternative)
   Key Type: Asymmetric
   Auto-rotation: Enabled (recommended)
   ```

3. **Generate New Signing Keys**
   - Click "Generate New Keys"
   - Confirm the operation
   - **Note:** This will invalidate existing JWT tokens

#### 2.3 Verify JWKS Endpoint Update
```bash
# Wait 2-3 minutes for propagation, then verify
curl -s "https://meizvwwhasispvfbprck.supabase.co/auth/v1/.well-known/jwks.json" | jq .

# Expected: Non-empty keys array
# {
#   "keys": [
#     {
#       "kty": "EC",
#       "kid": "...",
#       "crv": "P-256",
#       "x": "...",
#       "y": "...",
#       "use": "sig",
#       "alg": "ES256"
#     }
#   ]
# }
```

### Phase 3: Application Validation (10 minutes)

#### 3.1 Test New JWT Verification
```bash
# Test JWT verification service
node -e "
const { jwtVerificationService } = require('./lib/auth/jwt-verification-service');
console.log('JWT service metrics:', jwtVerificationService.getMetrics());
"
```

#### 3.2 Verify Authentication Flow
```bash
# Run authentication test
pnpm test:middleware-performance

# Monitor for successful JWKS verifications
# Expected: Reduced auth server fallback rate (<5%)
```

#### 3.3 User Session Testing
1. **Force User Re-authentication**
   - All existing sessions will be invalidated
   - Users will need to log in again (expected behavior)

2. **Test New Session Creation**
   - Perform login from test account
   - Verify JWT token uses ES256 algorithm
   - Confirm local verification works

### Phase 4: Performance Validation (10 minutes)

#### 4.1 Performance Metrics Collection
```bash
# Run comprehensive performance test
pnpm test:middleware-performance

# Monitor key metrics:
# - Middleware latency: Should be <50ms (target)
# - JWKS verification rate: Should be >90%
# - Auth server fallback rate: Should be <5%
# - Cache hit rate: Should be >85%
```

#### 4.2 Real-Time Monitoring
```bash
# Monitor application logs for 5 minutes
tail -f logs/application.log | grep "JWT\|auth"

# Look for:
# - Successful JWKS verifications
# - Reduced Auth server calls
# - No authentication errors
```

#### 4.3 Load Testing (Optional)
```bash
# Test under load if possible
ab -n 1000 -c 10 http://localhost:3000/admin/dashboard

# Monitor for performance degradation
```

### Phase 5: Cleanup and Documentation (5 minutes)

#### 5.1 Update Environment Configuration
```bash
# Ensure optimization flags are properly set
cat >> .env << EOF
# JWT Verification Optimization - Production
ENABLE_LOCAL_JWT_VERIFICATION=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_PERFORMANCE_LOGGING=false
EOF
```

#### 5.2 Document Migration Completion
```bash
# Log migration completion
echo "Migration completed: $(date)" >> migration.log
echo "New algorithm: ES256" >> migration.log
echo "JWKS endpoint: Active with public keys" >> migration.log
```

### Phase 6: Legacy Key Revocation (5 minutes)

#### 6.1 Confirm New Keys Working
- Verify all authentication flows work correctly
- Check that no Auth server fallbacks occur for new tokens
- Confirm user experience is normal

#### 6.2 Revoke Legacy Keys (Optional)
- In Supabase dashboard, remove old HS256 configuration
- This step is optional as new keys will be used automatically
- Keep for rollback capability if needed

---

## Success Criteria

### Performance Metrics
- [ ] **Middleware Latency:** <50ms average (down from 100-200ms)
- [ ] **JWKS Verification Rate:** >90% of requests
- [ ] **Auth Server Fallback Rate:** <5% of requests
- [ ] **Cache Hit Rate:** >85%
- [ ] **Error Rate:** <1%

### Functional Verification
- [ ] **User Authentication:** All login flows work correctly
- [ ] **JWT Verification:** Local verification using JWKS succeeds
- [ ] **API Access:** Protected endpoints respond correctly
- [ ] **Session Management:** Session timeouts and renewals work
- [ ] **Role-Based Access:** Role validation functions properly

### System Health
- [ ] **Application Stability:** No increase in error rates
- [ ] **Database Performance:** No degradation in query performance
- [ ] **Memory Usage:** No memory leaks from JWT verification service
- [ ] **CPU Usage:** Reduced CPU usage due to fewer Auth server calls

---

## Rollback Plan

### Immediate Rollback (if critical issues occur)

#### Step 1: Revert Feature Flag
```bash
# Disable JWT optimization immediately
sed -i 's/ENABLE_LOCAL_JWT_VERIFICATION=true/ENABLE_LOCAL_JWT_VERIFICATION=false/' .env

# Restart application
pnpm build && pnpm start
```

#### Step 2: Monitor System Recovery
```bash
# Verify auth server validation is working
tail -f logs/application.log | grep "auth-server"

# Should see auth server validations resuming
```

### Full Rollback (if needed)

#### Step 1: Revert Supabase Configuration
1. Access Supabase Dashboard
2. Navigate to JWT Settings
3. Change algorithm back to HS256
4. Regenerate symmetric keys
5. Wait for propagation (2-3 minutes)

#### Step 2: Clear JWT Caches
```bash
# Clear all JWT verification caches
node -e "
const { jwtVerificationService } = require('./lib/auth/jwt-verification-service');
jwtVerificationService.clearCaches();
console.log('Caches cleared');
"
```

#### Step 3: Verify Rollback
```bash
# Test authentication flow
pnpm test:middleware-performance

# Verify HS256 tokens work correctly
curl -s "https://meizvwwhasispvfbprck.supabase.co/auth/v1/.well-known/jwks.json"
# Should return: {"keys": []}
```

---

## Risk Mitigation

### High-Risk Scenarios

#### 1. **All Users Logged Out**
- **Cause:** JWT key rotation invalidates existing sessions
- **Impact:** Users need to log in again
- **Mitigation:** Communicate maintenance window to users
- **Recovery:** Normal - users can log in immediately

#### 2. **JWKS Endpoint Not Working**
- **Cause:** Supabase configuration issue
- **Impact:** All authentication fails
- **Mitigation:** Auth server fallback already implemented
- **Recovery:** Automatic fallback to Auth server validation

#### 3. **Performance Degradation**
- **Cause:** Increased JWKS fetching
- **Impact:** Higher latency than expected
- **Mitigation:** Request-level and JWKS caching implemented
- **Recovery:** Monitor and adjust cache TTL values

### Medium-Risk Scenarios

#### 1. **Partial Authentication Failures**
- **Cause:** Mixed JWT algorithms during transition
- **Impact:** Some users experience intermittent issues
- **Mitigation:** Gradual rollout with feature flags
- **Recovery:** Disable optimization for affected users

#### 2. **Memory Usage Increase**
- **Cause:** JWT verification service caching
- **Impact:** Higher memory consumption
- **Mitigation:** Cache size limits implemented
- **Recovery:** Adjust cache configuration

---

## Post-Migration Monitoring

### First 24 Hours
- [ ] Monitor authentication success rates hourly
- [ ] Check performance metrics every 4 hours
- [ ] Review error logs for JWT-related issues
- [ ] Verify user experience remains normal

### First Week
- [ ] Daily performance reports
- [ ] Weekly cache hit rate analysis
- [ ] Monitor Auth server fallback trends
- [ ] Collect user feedback on authentication speed

### Ongoing Monitoring
- [ ] Weekly performance dashboard review
- [ ] Monthly optimization assessment
- [ ] Quarterly JWT verification metrics analysis
- [ ] Annual security review of JWT configuration

---

## Contact Information

### Migration Team
- **Primary Contact:** Development Team
- **Backup Contact:** DevOps Team
- **Escalation:** Technical Lead

### Support Resources
- **Supabase Documentation:** [JWT Configuration Guide](https://supabase.com/docs/guides/auth/jwt)
- **Application Monitoring:** Performance dashboard
- **Incident Management:** Standard escalation procedures

---

## Appendix

### A. Environment Variables Reference
```bash
# JWT Verification Optimization
ENABLE_LOCAL_JWT_VERIFICATION=true
ENABLE_REQUEST_LEVEL_CACHE=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_PERFORMANCE_LOGGING=false

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://meizvwwhasispvfbprck.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### B. Performance Targets
| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Middleware Latency | 100-200ms | <50ms | 75-90% |
| Auth Server Calls | 100% | <5% | 95% |
| JWT Verification | N/A | >90% | New capability |
| Cache Hit Rate | N/A | >85% | New capability |

### C. Testing Commands
```bash
# Performance test
pnpm test:middleware-performance

# JWT verification test
curl -s "https://meizvwwhasispvfbprck.supabase.co/auth/v1/.well-known/jwks.json" | jq .

# Authentication flow test
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/users
```

---

**Migration Plan Approved By:** Claude Code Performance Analyzer  
**Document Status:** Ready for Implementation  
**Last Updated:** 2025-07-25