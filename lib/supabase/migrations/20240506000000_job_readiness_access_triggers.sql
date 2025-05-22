-- This migration adds triggers to ensure data integrity for the Job Readiness feature
-- It prevents direct database manipulation that would bypass the API access rules

-- First, create a function to validate student progress updates
CREATE OR REPLACE FUNCTION validate_job_readiness_progress_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if star level is being updated and validate the sequence
  IF (NEW.job_readiness_star_level IS NOT NULL AND 
      OLD.job_readiness_star_level IS DISTINCT FROM NEW.job_readiness_star_level) THEN
    
    -- Get the enum values in order for validation
    DECLARE
      star_level_order TEXT[] := ARRAY['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
      old_idx INTEGER;
      new_idx INTEGER;
    BEGIN
      -- Find positions in the ordered array
      SELECT array_position(star_level_order, OLD.job_readiness_star_level) INTO old_idx;
      SELECT array_position(star_level_order, NEW.job_readiness_star_level) INTO new_idx;
      
      -- Make sure we're not skipping levels when updating naturally (not from admin)
      -- Admin updates are handled separately via the override endpoint and should set job_readiness_admin_override to true
      IF (new_idx > old_idx + 1 AND NEW.job_readiness_admin_override IS NOT TRUE) THEN
        RAISE EXCEPTION 'Cannot skip star levels in job readiness progression. Must complete each level sequentially.';
      END IF;
    END;
  END IF;
  
  -- If this update is from the admin override endpoint, reset the flag
  IF (NEW.job_readiness_admin_override IS TRUE) THEN
    NEW.job_readiness_admin_override := FALSE;
  END IF;
  
  -- Set the last updated timestamp
  NEW.job_readiness_last_updated := CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the students table to enforce the rules
DROP TRIGGER IF EXISTS job_readiness_progress_validation ON students;

CREATE TRIGGER job_readiness_progress_validation
BEFORE UPDATE ON students
FOR EACH ROW
WHEN (OLD.job_readiness_star_level IS DISTINCT FROM NEW.job_readiness_star_level OR 
      OLD.job_readiness_tier IS DISTINCT FROM NEW.job_readiness_tier)
EXECUTE FUNCTION validate_job_readiness_progress_update();

-- Add job_readiness_admin_override column to students table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'job_readiness_admin_override'
  ) THEN
    ALTER TABLE students ADD COLUMN job_readiness_admin_override BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create a function to log admin overrides for auditing
CREATE OR REPLACE FUNCTION log_job_readiness_admin_override()
RETURNS TRIGGER AS $$
DECLARE
  reason_text TEXT;
BEGIN
  IF (NEW.job_readiness_admin_override IS TRUE) THEN
    -- Try to get the override reason from the session variable
    -- If it fails or is not set, use a default reason
    BEGIN
      reason_text := current_setting('app.override_reason', true);
    EXCEPTION
      WHEN OTHERS THEN
        reason_text := 'Manual update by admin (reason not specified)';
    END;
    
    -- If reason is null or empty, use the default
    IF reason_text IS NULL OR reason_text = '' THEN
      reason_text := 'Manual update by admin (reason not specified)';
    END IF;
    
    -- Insert the override log record
    INSERT INTO job_readiness_admin_overrides (
      student_id,
      previous_star_level,
      new_star_level,
      previous_tier,
      new_tier,
      admin_id,
      timestamp,
      reason
    ) VALUES (
      NEW.id,
      OLD.job_readiness_star_level,
      NEW.job_readiness_star_level,
      OLD.job_readiness_tier,
      NEW.job_readiness_tier,
      current_setting('request.jwt.claims', true)::json->>'sub',
      CURRENT_TIMESTAMP,
      reason_text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the admin overrides audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_readiness_admin_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  previous_star_level TEXT,
  new_star_level TEXT,
  previous_tier TEXT,
  new_tier TEXT,
  admin_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Create a trigger on the students table to log admin overrides
DROP TRIGGER IF EXISTS job_readiness_admin_override_logging ON students;

CREATE TRIGGER job_readiness_admin_override_logging
BEFORE UPDATE ON students
FOR EACH ROW
WHEN (NEW.job_readiness_admin_override IS TRUE)
EXECUTE FUNCTION log_job_readiness_admin_override();

-- Add comments explaining the purpose of these objects
COMMENT ON FUNCTION validate_job_readiness_progress_update() IS 'Validates that job readiness star levels are updated sequentially, unless overridden by an admin';
COMMENT ON TRIGGER job_readiness_progress_validation ON students IS 'Enforces sequential progression through job readiness star levels';
COMMENT ON TABLE job_readiness_admin_overrides IS 'Audit log of admin overrides to job readiness progress';
COMMENT ON FUNCTION log_job_readiness_admin_override() IS 'Logs admin overrides to job readiness progress for auditing'; 