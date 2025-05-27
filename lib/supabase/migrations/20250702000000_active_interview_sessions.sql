-- Create the active interview sessions table for caching interview questions
CREATE TABLE IF NOT EXISTS job_readiness_active_interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add a unique constraint to ensure only one active session per student
  UNIQUE (student_id)
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS job_readiness_active_interview_sessions_student_idx
ON job_readiness_active_interview_sessions (student_id);

-- Add RLS policies for the active interview sessions table
ALTER TABLE job_readiness_active_interview_sessions ENABLE ROW LEVEL SECURITY;

-- Students can select their own active sessions
CREATE POLICY job_readiness_active_interview_sessions_student_select ON job_readiness_active_interview_sessions
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
  );

-- Admins can select all active sessions
CREATE POLICY job_readiness_active_interview_sessions_admin_select ON job_readiness_active_interview_sessions
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Students can insert/update their own active sessions
CREATE POLICY job_readiness_active_interview_sessions_student_insert ON job_readiness_active_interview_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
  );

CREATE POLICY job_readiness_active_interview_sessions_student_update ON job_readiness_active_interview_sessions
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
  )
  WITH CHECK (
    student_id = auth.uid()
  );

-- Admins can do all operations
CREATE POLICY job_readiness_active_interview_sessions_admin_all ON job_readiness_active_interview_sessions
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add a scheduled function to clean up old interview sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION clean_old_interview_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM job_readiness_active_interview_sessions
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run the cleanup function daily (if pg_cron extension is available)
-- This is commented out as pg_cron might not be available in all environments
-- If pg_cron is not available, you can schedule this via an external cron job or cloud function
/*
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    EXECUTE format('SELECT cron.schedule(''@daily'', ''SELECT clean_old_interview_sessions()'')');
  END IF;
END
$$;
*/ 