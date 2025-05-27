-- Create the fallback interview questions table for AI interview question generation
CREATE TABLE IF NOT EXISTS job_readiness_fallback_interview_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  background_type student_background_type NOT NULL,
  tier job_readiness_difficulty_tier NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS job_readiness_fallback_interview_questions_background_tier_idx
ON job_readiness_fallback_interview_questions (background_type, tier);

-- Add RLS policies for the fallback interview questions table
ALTER TABLE job_readiness_fallback_interview_questions ENABLE ROW LEVEL SECURITY;

-- Only admins can insert, update, or delete
CREATE POLICY job_readiness_fallback_interview_questions_admin_all ON job_readiness_fallback_interview_questions
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Both admins and staff can view 
CREATE POLICY job_readiness_fallback_interview_questions_admin_staff_select ON job_readiness_fallback_interview_questions
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'staff'));

-- Insert some sample fallback questions for each background type and tier
-- These will be used if AI generation fails

-- Computer Science - Bronze
INSERT INTO job_readiness_fallback_interview_questions (background_type, tier, question_text)
VALUES 
('COMPUTER_SCIENCE', 'BRONZE', 'What programming languages are you most comfortable with?'),
('COMPUTER_SCIENCE', 'BRONZE', 'Describe a simple project you have worked on recently.'),
('COMPUTER_SCIENCE', 'BRONZE', 'How do you approach debugging a simple program?'),
('COMPUTER_SCIENCE', 'BRONZE', 'What is version control and why is it important?'),
('COMPUTER_SCIENCE', 'BRONZE', 'How do you stay updated with new technologies?');

-- Computer Science - Silver
INSERT INTO job_readiness_fallback_interview_questions (background_type, tier, question_text)
VALUES 
('COMPUTER_SCIENCE', 'SILVER', 'Explain a complex algorithm you have implemented.'),
('COMPUTER_SCIENCE', 'SILVER', 'How do you approach optimizing code for performance?'),
('COMPUTER_SCIENCE', 'SILVER', 'Describe a challenging bug you encountered and how you solved it.'),
('COMPUTER_SCIENCE', 'SILVER', 'What design patterns have you used in your projects?'),
('COMPUTER_SCIENCE', 'SILVER', 'How do you approach testing your code?');

-- Computer Science - Gold
INSERT INTO job_readiness_fallback_interview_questions (background_type, tier, question_text)
VALUES 
('COMPUTER_SCIENCE', 'GOLD', 'Describe a system architecture you designed and the trade-offs you considered.'),
('COMPUTER_SCIENCE', 'GOLD', 'How do you ensure scalability in your applications?'),
('COMPUTER_SCIENCE', 'GOLD', 'Explain a time when you had to refactor a large codebase. What approach did you take?'),
('COMPUTER_SCIENCE', 'GOLD', 'Describe your experience with CI/CD pipelines and DevOps practices.'),
('COMPUTER_SCIENCE', 'GOLD', 'How do you approach security in your software development process?');

-- Business - Bronze
INSERT INTO job_readiness_fallback_interview_questions (background_type, tier, question_text)
VALUES 
('BUSINESS', 'BRONZE', 'What interests you about working in business?'),
('BUSINESS', 'BRONZE', 'Describe a time when you worked effectively in a team.'),
('BUSINESS', 'BRONZE', 'How do you prioritize your work?'),
('BUSINESS', 'BRONZE', 'What do you think are the most important skills for a business professional?'),
('BUSINESS', 'BRONZE', 'How do you stay organized when managing multiple tasks?');

-- Add more fallback questions for other background types and tiers as needed 