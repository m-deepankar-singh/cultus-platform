-- Add utility functions for the Job Readiness feature

-- Create a function to set configuration values safely
-- This is used for passing values to triggers like the override reason
CREATE OR REPLACE FUNCTION set_config(
  parameter TEXT,
  value TEXT,
  is_local BOOLEAN DEFAULT true
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input to prevent SQL injection
  IF parameter !~ '^[a-zA-Z0-9_.]+$' THEN
    RAISE EXCEPTION 'Invalid parameter name: %', parameter;
  END IF;
  
  -- Call the built-in set_config function
  RETURN pg_catalog.set_config(parameter, value, is_local);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, store it in a more accessible way for debugging
    -- but don't expose the full error to prevent information disclosure
    INSERT INTO job_readiness_error_logs (
      error_type,
      function_name,
      details,
      parameters
    ) VALUES (
      SQLERRM,
      'set_config',
      'Error setting configuration parameter',
      jsonb_build_object('parameter', parameter, 'value_length', length(value))
    );
    
    RETURN '';
END;
$$;

-- Create an error log table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_readiness_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_type TEXT,
  function_name TEXT,
  details TEXT,
  parameters JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments explaining the purpose
COMMENT ON FUNCTION set_config IS 'Safely sets configuration parameters for use with triggers, with error handling';
COMMENT ON TABLE job_readiness_error_logs IS 'Logs errors that occur during function execution for debugging'; 