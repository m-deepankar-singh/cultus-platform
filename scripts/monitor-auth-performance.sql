-- Auth Performance Monitoring Script
-- Run this script to monitor Phase 2 authentication performance

-- ============================================
-- 1. RPC Function Performance Statistics
-- ============================================
SELECT 
  '=== RPC FUNCTION PERFORMANCE ===' as section,
  'Phase 2 Database Optimization' as description;

SELECT * FROM get_auth_performance_stats();

-- ============================================
-- 2. Materialized View Statistics
-- ============================================
SELECT 
  '=== MATERIALIZED VIEW STATISTICS ===' as section;

-- Get materialized view info
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews 
WHERE matviewname = 'user_auth_cache';

-- Count total rows in cache
SELECT 
  'Total cached users' as metric,
  COUNT(*) as value
FROM user_auth_cache;

-- Check cache freshness
SELECT 
  'Cache freshness' as metric,
  MAX(cached_at) as latest_cache_time,
  MIN(cached_at) as oldest_cache_time,
  EXTRACT(EPOCH FROM (MAX(cached_at) - MIN(cached_at))) as cache_age_seconds
FROM user_auth_cache;

-- User type distribution
SELECT 
  'User type distribution' as metric,
  user_role,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM user_auth_cache
GROUP BY user_role
ORDER BY count DESC;

-- ============================================
-- 3. Database Table Sizes and Performance
-- ============================================
SELECT 
  '=== DATABASE TABLE SIZES ===' as section;

-- Table sizes
SELECT 
  'Table sizes' as metric,
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size,
  pg_total_relation_size(table_name::regclass) as size_bytes
FROM (
  SELECT 'students' as table_name
  UNION ALL
  SELECT 'profiles' as table_name
  UNION ALL
  SELECT 'user_auth_cache' as table_name
) t
ORDER BY size_bytes DESC;

-- Index usage statistics
SELECT 
  'Index usage' as metric,
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('students', 'profiles', 'user_auth_cache')
ORDER BY idx_scan DESC;

-- ============================================
-- 4. Query Performance Analysis
-- ============================================
SELECT 
  '=== QUERY PERFORMANCE ANALYSIS ===' as section;

-- Test individual RPC function performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_user_auth_profile_cached(
  (SELECT user_id FROM user_auth_cache LIMIT 1)
);

-- Test materialized view performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_user_auth_profile_fast(
  (SELECT user_id FROM user_auth_cache LIMIT 1)
);

-- Test bulk function performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_bulk_user_auth_profiles(
  ARRAY(SELECT user_id FROM user_auth_cache LIMIT 5)
);

-- ============================================
-- 5. Cache Hit Rate Analysis
-- ============================================
SELECT 
  '=== CACHE HIT RATE ANALYSIS ===' as section;

-- Simulate cache hit rate calculation
SELECT 
  'Cache effectiveness' as metric,
  COUNT(*) as total_cached_users,
  COUNT(CASE WHEN cached_at > NOW() - INTERVAL '1 hour' THEN 1 END) as fresh_cache_entries,
  ROUND(
    COUNT(CASE WHEN cached_at > NOW() - INTERVAL '1 hour' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 2
  ) as cache_freshness_percentage
FROM user_auth_cache;

-- ============================================
-- 6. Performance Benchmarking
-- ============================================
SELECT 
  '=== PERFORMANCE BENCHMARKING ===' as section;

-- Time the RPC function execution
SELECT 
  'RPC function timing' as test,
  'get_user_auth_profile_cached' as function_name,
  NOW() as start_time;

-- Run the function (you would measure this externally)
SELECT user_role, client_id, is_active 
FROM get_user_auth_profile_cached(
  (SELECT user_id FROM user_auth_cache LIMIT 1)
);

SELECT 
  'RPC function completed' as test,
  NOW() as end_time;

-- ============================================
-- 7. System Health Check
-- ============================================
SELECT 
  '=== SYSTEM HEALTH CHECK ===' as section;

-- Check if all functions exist
SELECT 
  'Function existence check' as check_type,
  proname as function_name,
  'EXISTS' as status
FROM pg_proc 
WHERE proname IN (
  'get_user_auth_profile_cached',
  'get_bulk_user_auth_profiles',
  'get_user_auth_profile_fast',
  'refresh_user_auth_cache',
  'get_auth_performance_stats'
);

-- Check if indexes exist
SELECT 
  'Index existence check' as check_type,
  indexname as index_name,
  tablename,
  'EXISTS' as status
FROM pg_indexes 
WHERE indexname IN (
  'idx_students_auth_lookup',
  'idx_profiles_auth_lookup',
  'idx_user_auth_cache_user_id'
);

-- Check if triggers exist
SELECT 
  'Trigger existence check' as check_type,
  trigger_name,
  event_object_table,
  'EXISTS' as status
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_students_auth_cache',
  'trigger_profiles_auth_cache'
);

-- ============================================
-- 8. Performance Recommendations
-- ============================================
SELECT 
  '=== PERFORMANCE RECOMMENDATIONS ===' as section;

-- Generate recommendations based on current state
WITH cache_stats AS (
  SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN cached_at > NOW() - INTERVAL '1 hour' THEN 1 END) as fresh_entries,
    AVG(EXTRACT(EPOCH FROM NOW() - cached_at)) as avg_age_seconds
  FROM user_auth_cache
),
performance_stats AS (
  SELECT 
    total_calls,
    avg_execution_time,
    cache_hit_ratio
  FROM get_auth_performance_stats()
  LIMIT 1
)
SELECT 
  'Performance recommendations' as type,
  CASE 
    WHEN p.cache_hit_ratio < 85 THEN 'WARNING: Cache hit ratio below 85%. Consider increasing Redis TTL.'
    WHEN p.avg_execution_time > 100 THEN 'WARNING: Average execution time above 100ms. Check database performance.'
    WHEN c.avg_age_seconds > 3600 THEN 'INFO: Cache entries are getting old. Consider more frequent refresh.'
    ELSE 'GOOD: Performance metrics look healthy.'
  END as recommendation
FROM cache_stats c
CROSS JOIN performance_stats p;

-- ============================================
-- 9. Monitoring Summary
-- ============================================
SELECT 
  '=== MONITORING SUMMARY ===' as section,
  NOW() as report_generated_at;

-- Final summary
SELECT 
  'PHASE 2 IMPLEMENTATION STATUS' as summary,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_auth_profile_cached') 
     AND EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'user_auth_cache')
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_auth_lookup')
    THEN 'FULLY DEPLOYED AND OPERATIONAL'
    ELSE 'INCOMPLETE DEPLOYMENT'
  END as status,
  (SELECT COUNT(*) FROM user_auth_cache) as total_users_cached,
  (SELECT cache_hit_ratio FROM get_auth_performance_stats() LIMIT 1) as cache_hit_ratio;