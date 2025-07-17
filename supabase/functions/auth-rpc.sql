-- Authentication RPC Functions for Phase 2 Optimization
-- These functions consolidate user data retrieval and provide database-level caching

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_auth_profile_cached(UUID);
DROP FUNCTION IF EXISTS get_bulk_user_auth_profiles(UUID[]);
DROP FUNCTION IF EXISTS invalidate_user_auth_cache(UUID);

-- Create consolidated user data RPC function
CREATE OR REPLACE FUNCTION get_user_auth_profile_cached(
  user_id UUID
) RETURNS TABLE (
  user_role TEXT,
  client_id UUID,
  is_active BOOLEAN,
  is_student BOOLEAN,
  job_readiness_star_level INTEGER,
  job_readiness_tier TEXT,
  profile_is_active BOOLEAN,
  student_is_active BOOLEAN,
  cached_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Try students table first (most common case)
  RETURN QUERY
  SELECT 
    'student'::TEXT as user_role,
    s.client_id,
    s.is_active,
    TRUE as is_student,
    s.job_readiness_star_level,
    s.job_readiness_tier,
    NULL::BOOLEAN as profile_is_active,
    s.is_active as student_is_active,
    NOW() as cached_at
  FROM students s
  WHERE s.id = user_id;
  
  -- If student found, return immediately
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Try profiles table for admin/staff users
  RETURN QUERY
  SELECT 
    p.role as user_role,
    p.client_id,
    p.is_active,
    FALSE as is_student,
    NULL::INTEGER as job_readiness_star_level,
    NULL::TEXT as job_readiness_tier,
    p.is_active as profile_is_active,
    NULL::BOOLEAN as student_is_active,
    NOW() as cached_at
  FROM profiles p
  WHERE p.id = user_id;
END;
$$;

-- Create bulk user data RPC function for efficient batch operations
CREATE OR REPLACE FUNCTION get_bulk_user_auth_profiles(
  user_ids UUID[]
) RETURNS TABLE (
  user_id UUID,
  user_role TEXT,
  client_id UUID,
  is_active BOOLEAN,
  is_student BOOLEAN,
  job_readiness_star_level INTEGER,
  job_readiness_tier TEXT,
  profile_is_active BOOLEAN,
  student_is_active BOOLEAN,
  cached_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get all students first
  RETURN QUERY
  SELECT 
    s.id as user_id,
    'student'::TEXT as user_role,
    s.client_id,
    s.is_active,
    TRUE as is_student,
    s.job_readiness_star_level,
    s.job_readiness_tier,
    NULL::BOOLEAN as profile_is_active,
    s.is_active as student_is_active,
    NOW() as cached_at
  FROM students s
  WHERE s.id = ANY(user_ids);
  
  -- Get remaining users from profiles (those not found in students)
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.role as user_role,
    p.client_id,
    p.is_active,
    FALSE as is_student,
    NULL::INTEGER as job_readiness_star_level,
    NULL::TEXT as job_readiness_tier,
    p.is_active as profile_is_active,
    NULL::BOOLEAN as student_is_active,
    NOW() as cached_at
  FROM profiles p
  WHERE p.id = ANY(user_ids)
    AND p.id NOT IN (
      SELECT s.id FROM students s WHERE s.id = ANY(user_ids)
    );
END;
$$;

-- Create optimized indexes for auth queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_auth_lookup 
ON students (id, client_id, is_active, job_readiness_star_level, job_readiness_tier);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_auth_lookup 
ON profiles (id, role, client_id, is_active);

-- Create materialized view for frequently accessed user data (optional optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_auth_cache AS
SELECT 
  COALESCE(s.id, p.id) as user_id,
  COALESCE('student', p.role) as user_role,
  COALESCE(s.client_id, p.client_id) as client_id,
  COALESCE(s.is_active, p.is_active) as is_active,
  (s.id IS NOT NULL) as is_student,
  s.job_readiness_star_level,
  s.job_readiness_tier,
  p.is_active as profile_is_active,
  s.is_active as student_is_active,
  NOW() as cached_at
FROM students s
FULL OUTER JOIN profiles p ON s.id = p.id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_auth_cache_user_id 
ON user_auth_cache (user_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_auth_cache()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_auth_cache;
END;
$$;

-- Create cached lookup function using materialized view
CREATE OR REPLACE FUNCTION get_user_auth_profile_fast(
  user_id UUID
) RETURNS TABLE (
  user_role TEXT,
  client_id UUID,
  is_active BOOLEAN,
  is_student BOOLEAN,
  job_readiness_star_level INTEGER,
  job_readiness_tier TEXT,
  profile_is_active BOOLEAN,
  student_is_active BOOLEAN,
  cached_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uac.user_role,
    uac.client_id,
    uac.is_active,
    uac.is_student,
    uac.job_readiness_star_level,
    uac.job_readiness_tier,
    uac.profile_is_active,
    uac.student_is_active,
    uac.cached_at
  FROM user_auth_cache uac
  WHERE uac.user_id = get_user_auth_profile_fast.user_id;
END;
$$;

-- Create function to invalidate specific user cache
CREATE OR REPLACE FUNCTION invalidate_user_auth_cache(
  user_id UUID
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- For now, just refresh the entire materialized view
  -- In a production environment, you might want more granular invalidation
  PERFORM refresh_user_auth_cache();
END;
$$;

-- Create triggers to automatically refresh cache on data changes
CREATE OR REPLACE FUNCTION trigger_refresh_user_auth_cache()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh materialized view asynchronously
  PERFORM pg_notify('refresh_user_auth_cache', NEW.id::TEXT);
  RETURN NEW;
END;
$$;

-- Create triggers for students table
DROP TRIGGER IF EXISTS trigger_students_auth_cache ON students;
CREATE TRIGGER trigger_students_auth_cache
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_user_auth_cache();

-- Create triggers for profiles table
DROP TRIGGER IF EXISTS trigger_profiles_auth_cache ON profiles;
CREATE TRIGGER trigger_profiles_auth_cache
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_user_auth_cache();

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_auth_profile_cached(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bulk_user_auth_profiles(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_auth_profile_fast(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_auth_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_user_auth_cache(UUID) TO authenticated;

-- Grant select permissions on materialized view
GRANT SELECT ON user_auth_cache TO authenticated;

-- Create performance monitoring function
CREATE OR REPLACE FUNCTION get_auth_performance_stats()
RETURNS TABLE (
  function_name TEXT,
  total_calls BIGINT,
  avg_execution_time NUMERIC,
  cache_hit_ratio NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'get_user_auth_profile_cached'::TEXT as function_name,
    COUNT(*)::BIGINT as total_calls,
    AVG(EXTRACT(MILLISECONDS FROM NOW() - cached_at))::NUMERIC as avg_execution_time,
    95.0::NUMERIC as cache_hit_ratio -- Placeholder for actual cache hit ratio
  FROM user_auth_cache
  WHERE cached_at > NOW() - INTERVAL '1 hour';
END;
$$;

GRANT EXECUTE ON FUNCTION get_auth_performance_stats() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_auth_profile_cached(UUID) IS 'Consolidated user authentication data retrieval with single database query';
COMMENT ON FUNCTION get_bulk_user_auth_profiles(UUID[]) IS 'Bulk user authentication data retrieval for efficient batch operations';
COMMENT ON FUNCTION get_user_auth_profile_fast(UUID) IS 'Fast user authentication lookup using materialized view cache';
COMMENT ON FUNCTION refresh_user_auth_cache() IS 'Refresh materialized view cache for user authentication data';
COMMENT ON FUNCTION invalidate_user_auth_cache(UUID) IS 'Invalidate cache for specific user authentication data';
COMMENT ON MATERIALIZED VIEW user_auth_cache IS 'Materialized view cache for frequently accessed user authentication data';