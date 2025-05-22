-- Core Job Readiness Database Schema Migration

-- Add module types for Job Readiness
ALTER TYPE module_type ADD VALUE IF NOT EXISTS 'project';
ALTER TYPE module_type ADD VALUE IF NOT EXISTS 'interview';
ALTER TYPE module_type ADD VALUE IF NOT EXISTS 'expert_session';

-- Add enum for Job Readiness difficulty tiers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_readiness_difficulty_tier') THEN
    CREATE TYPE job_readiness_difficulty_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD');
  END IF;
END$$;

-- Add enum for Job Readiness star levels if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_readiness_star_level') THEN
    CREATE TYPE job_readiness_star_level AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE');
  END IF;
END$$;

-- Add enum for student background types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_background_type') THEN
    CREATE TYPE student_background_type AS ENUM (
      'ECONOMICS', 
      'COMPUTER_SCIENCE', 
      'MARKETING', 
      'DESIGN', 
      'HUMANITIES', 
      'BUSINESS', 
      'ENGINEERING'
    );
  END IF;
END$$;

-- Add enum for job readiness project types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_readiness_project_type') THEN
    CREATE TYPE job_readiness_project_type AS ENUM (
      'CASE_STUDY', 
      'CODING_PROJECT', 
      'MARKETING_PLAN', 
      'DESIGN_CONCEPT', 
      'RESEARCH_OUTLINE', 
      'BUSINESS_PLAN'
    );
  END IF;
END$$;

-- Extend students table with Job Readiness fields
ALTER TABLE students
ADD COLUMN IF NOT EXISTS job_readiness_star_level job_readiness_star_level,
ADD COLUMN IF NOT EXISTS job_readiness_tier job_readiness_difficulty_tier,
ADD COLUMN IF NOT EXISTS job_readiness_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS job_readiness_background_type student_background_type,
ADD COLUMN IF NOT EXISTS job_readiness_promotion_eligible BOOLEAN DEFAULT FALSE;

-- Add type field to products if it doesn't exist (for Job Readiness type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'type'
  ) THEN
    ALTER TABLE products ADD COLUMN type TEXT;
  END IF;
END $$;

-- Create job_readiness_products table
CREATE TABLE IF NOT EXISTS job_readiness_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bronze_assessment_min_score INTEGER NOT NULL,
  bronze_assessment_max_score INTEGER NOT NULL,
  silver_assessment_min_score INTEGER NOT NULL,
  silver_assessment_max_score INTEGER NOT NULL,
  gold_assessment_min_score INTEGER NOT NULL,
  gold_assessment_max_score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT job_readiness_products_score_ranges_check 
    CHECK (
      bronze_assessment_min_score <= bronze_assessment_max_score AND
      silver_assessment_min_score <= silver_assessment_max_score AND
      gold_assessment_min_score <= gold_assessment_max_score AND
      bronze_assessment_max_score < silver_assessment_min_score AND
      silver_assessment_max_score < gold_assessment_min_score
    )
);

-- Create job_readiness_background_project_types table
CREATE TABLE IF NOT EXISTS job_readiness_background_project_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  background_type student_background_type NOT NULL,
  project_type job_readiness_project_type NOT NULL,
  project_description_template TEXT NOT NULL,
  grading_criteria JSONB NOT NULL,
  bronze_system_prompt TEXT NOT NULL,
  bronze_input_prompt TEXT NOT NULL,
  silver_system_prompt TEXT NOT NULL,
  silver_input_prompt TEXT NOT NULL,
  gold_system_prompt TEXT NOT NULL,
  gold_input_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (background_type, project_type)
);

-- Create job_readiness_background_interview_types table
CREATE TABLE IF NOT EXISTS job_readiness_background_interview_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  background_type student_background_type NOT NULL,
  interview_focus_area TEXT NOT NULL,
  question_quantity INTEGER NOT NULL DEFAULT 5,
  video_time_limit INTEGER NOT NULL DEFAULT 240, -- seconds (4 minutes)
  grading_criteria JSONB NOT NULL,
  bronze_system_prompt TEXT NOT NULL,
  bronze_input_prompt TEXT NOT NULL,
  silver_system_prompt TEXT NOT NULL,
  silver_input_prompt TEXT NOT NULL,
  gold_system_prompt TEXT NOT NULL,
  gold_input_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (background_type, interview_focus_area)
);

-- Create job_readiness_promotion_exam_config table
CREATE TABLE IF NOT EXISTS job_readiness_promotion_exam_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  question_count INTEGER NOT NULL DEFAULT 25,
  pass_threshold INTEGER NOT NULL DEFAULT 75, -- percentage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (product_id)
);

-- Create job_readiness_promotion_exam_attempts table
CREATE TABLE IF NOT EXISTS job_readiness_promotion_exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  star_level job_readiness_star_level NOT NULL,
  current_tier job_readiness_difficulty_tier NOT NULL,
  target_tier job_readiness_difficulty_tier NOT NULL,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create job_readiness_ai_project_submissions table
CREATE TABLE IF NOT EXISTS job_readiness_ai_project_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  background_type student_background_type NOT NULL,
  project_type job_readiness_project_type NOT NULL,
  submission_content TEXT,
  submission_url TEXT,
  score INTEGER,
  passed BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT submission_content_or_url_check 
    CHECK (submission_content IS NOT NULL OR submission_url IS NOT NULL)
);

-- Create job_readiness_ai_interview_submissions table
CREATE TABLE IF NOT EXISTS job_readiness_ai_interview_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  video_storage_path TEXT NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create job_readiness_expert_sessions table
CREATE TABLE IF NOT EXISTS job_readiness_expert_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  completion_status BOOLEAN NOT NULL DEFAULT FALSE,
  completion_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a table to store different quiz templates for each tier
CREATE TABLE IF NOT EXISTS job_readiness_course_quiz_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  tier job_readiness_difficulty_tier NOT NULL,
  quiz_prompt_template TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 5,
  passing_score INTEGER NOT NULL DEFAULT 70,
  time_limit_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (course_module_id, tier)
);

-- Create a table to store student quiz attempts
CREATE TABLE IF NOT EXISTS job_readiness_course_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  tier_used job_readiness_difficulty_tier NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB,
  score INTEGER,
  passed BOOLEAN,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submission_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add triggers for updated_at timestamp maintenance
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all Job Readiness tables
CREATE TRIGGER set_timestamp_job_readiness_products
BEFORE UPDATE ON job_readiness_products
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_background_project_types
BEFORE UPDATE ON job_readiness_background_project_types
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_background_interview_types
BEFORE UPDATE ON job_readiness_background_interview_types
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_promotion_exam_config
BEFORE UPDATE ON job_readiness_promotion_exam_config
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_promotion_exam_attempts
BEFORE UPDATE ON job_readiness_promotion_exam_attempts
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_ai_project_submissions
BEFORE UPDATE ON job_readiness_ai_project_submissions
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_ai_interview_submissions
BEFORE UPDATE ON job_readiness_ai_interview_submissions
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_expert_sessions
BEFORE UPDATE ON job_readiness_expert_sessions
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_course_quiz_templates
BEFORE UPDATE ON job_readiness_course_quiz_templates
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_job_readiness_course_quiz_attempts
BEFORE UPDATE ON job_readiness_course_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- RLS Policies (to be expanded based on exact requirements)
ALTER TABLE job_readiness_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_background_project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_background_interview_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_promotion_exam_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_promotion_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_ai_project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_ai_interview_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_expert_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_course_quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_readiness_course_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies to allow admins to access all tables
CREATE POLICY admin_job_readiness_products ON job_readiness_products
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_background_project_types ON job_readiness_background_project_types
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_background_interview_types ON job_readiness_background_interview_types
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_promotion_exam_config ON job_readiness_promotion_exam_config
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_promotion_exam_attempts ON job_readiness_promotion_exam_attempts
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_ai_project_submissions ON job_readiness_ai_project_submissions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_ai_interview_submissions ON job_readiness_ai_interview_submissions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_expert_sessions ON job_readiness_expert_sessions
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_course_quiz_templates ON job_readiness_course_quiz_templates
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY admin_job_readiness_course_quiz_attempts ON job_readiness_course_quiz_attempts
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Additional policies for students to view and submit their own data
CREATE POLICY student_view_job_readiness_ai_project_submissions ON job_readiness_ai_project_submissions
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM students WHERE id = student_id
  ));

CREATE POLICY student_insert_job_readiness_ai_project_submissions ON job_readiness_ai_project_submissions
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM students WHERE id = student_id
  ));

CREATE POLICY student_view_job_readiness_ai_interview_submissions ON job_readiness_ai_interview_submissions
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM students WHERE id = student_id
  ));

CREATE POLICY student_insert_job_readiness_ai_interview_submissions ON job_readiness_ai_interview_submissions
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM students WHERE id = student_id
  ));

CREATE POLICY student_view_job_readiness_expert_sessions ON job_readiness_expert_sessions
  FOR SELECT USING (auth.uid() = (
    SELECT id FROM students 
    WHERE id = job_readiness_expert_sessions.student_id
  ));

-- Enable client staff to view their students' progress
CREATE POLICY client_staff_view_job_readiness_ai_project_submissions ON job_readiness_ai_project_submissions
  FOR SELECT USING (auth.uid() IN (
    SELECT cs.user_id FROM client_staff cs
    JOIN student_client_assignments sca ON cs.client_id = sca.client_id
    WHERE sca.student_id = job_readiness_ai_project_submissions.student_id
  ));

CREATE POLICY client_staff_view_job_readiness_ai_interview_submissions ON job_readiness_ai_interview_submissions
  FOR SELECT USING (auth.uid() IN (
    SELECT cs.user_id FROM client_staff cs
    JOIN student_client_assignments sca ON cs.client_id = sca.client_id
    WHERE sca.student_id = job_readiness_ai_interview_submissions.student_id
  ));

CREATE POLICY client_staff_view_job_readiness_expert_sessions ON job_readiness_expert_sessions
  FOR SELECT USING (auth.uid() IN (
    SELECT cs.user_id FROM client_staff cs
    JOIN student_client_assignments sca ON cs.client_id = sca.client_id
    WHERE sca.student_id = job_readiness_expert_sessions.student_id
  ));

-- Add indexes for performance
CREATE INDEX idx_job_readiness_products_product_id ON job_readiness_products(product_id);
CREATE INDEX idx_job_readiness_background_project_types_background ON job_readiness_background_project_types(background_type);
CREATE INDEX idx_job_readiness_background_interview_types_background ON job_readiness_background_interview_types(background_type);
CREATE INDEX idx_job_readiness_promotion_exam_config_product_id ON job_readiness_promotion_exam_config(product_id);
CREATE INDEX idx_job_readiness_promotion_exam_attempts_student_id ON job_readiness_promotion_exam_attempts(student_id);
CREATE INDEX idx_job_readiness_promotion_exam_attempts_product_id ON job_readiness_promotion_exam_attempts(product_id);
CREATE INDEX idx_job_readiness_ai_project_submissions_student_id ON job_readiness_ai_project_submissions(student_id);
CREATE INDEX idx_job_readiness_ai_project_submissions_product_id ON job_readiness_ai_project_submissions(product_id);
CREATE INDEX idx_job_readiness_ai_interview_submissions_student_id ON job_readiness_ai_interview_submissions(student_id);
CREATE INDEX idx_job_readiness_ai_interview_submissions_product_id ON job_readiness_ai_interview_submissions(product_id);
CREATE INDEX idx_job_readiness_expert_sessions_student_id ON job_readiness_expert_sessions(student_id);
CREATE INDEX idx_job_readiness_expert_sessions_product_id ON job_readiness_expert_sessions(product_id);

-- Add indexes for quiz templates and attempts
CREATE INDEX idx_job_readiness_course_quiz_templates_module ON job_readiness_course_quiz_templates(course_module_id);
CREATE INDEX idx_job_readiness_course_quiz_templates_tier ON job_readiness_course_quiz_templates(tier);
CREATE INDEX idx_job_readiness_course_quiz_attempts_student ON job_readiness_course_quiz_attempts(student_id);
CREATE INDEX idx_job_readiness_course_quiz_attempts_module ON job_readiness_course_quiz_attempts(course_module_id);
CREATE INDEX idx_job_readiness_course_quiz_attempts_tier ON job_readiness_course_quiz_attempts(tier_used); 