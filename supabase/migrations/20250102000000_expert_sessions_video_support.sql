-- Update expert sessions schema for video support
-- Drop existing expert sessions table if it exists with the old schema
DROP TABLE IF EXISTS job_readiness_expert_sessions CASCADE;

-- Create updated job_readiness_expert_sessions table for video sessions
CREATE TABLE job_readiness_expert_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  video_duration INTEGER NOT NULL, -- Duration in seconds
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expert session progress tracking table
CREATE TABLE job_readiness_expert_session_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expert_session_id UUID NOT NULL REFERENCES job_readiness_expert_sessions(id) ON DELETE CASCADE,
  watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, expert_session_id)
);

-- Add triggers for updated_at timestamps
CREATE TRIGGER set_timestamp_job_readiness_expert_sessions
BEFORE UPDATE ON job_readiness_expert_sessions
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_expert_session_progress
BEFORE UPDATE ON job_readiness_expert_session_progress
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE job_readiness_expert_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_expert_session_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for expert sessions
CREATE POLICY admin_job_readiness_expert_sessions ON job_readiness_expert_sessions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY student_view_job_readiness_expert_sessions ON job_readiness_expert_sessions
  FOR SELECT USING (is_active = TRUE);

-- RLS policies for expert session progress
CREATE POLICY admin_job_readiness_expert_session_progress ON job_readiness_expert_session_progress
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY student_job_readiness_expert_session_progress ON job_readiness_expert_session_progress
  FOR ALL USING (auth.uid() = student_id);

-- Add indexes for performance
CREATE INDEX idx_job_readiness_expert_sessions_product_id ON job_readiness_expert_sessions(product_id);
CREATE INDEX idx_job_readiness_expert_sessions_active ON job_readiness_expert_sessions(is_active);
CREATE INDEX idx_job_readiness_expert_session_progress_student_id ON job_readiness_expert_session_progress(student_id);
CREATE INDEX idx_job_readiness_expert_session_progress_session_id ON job_readiness_expert_session_progress(expert_session_id);
CREATE INDEX idx_job_readiness_expert_session_progress_completed ON job_readiness_expert_session_progress(is_completed); 