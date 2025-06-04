-- Add verdict fields to job_readiness_interview_submissions table
-- This supports the new AI verdict system with admin override capabilities

ALTER TABLE job_readiness_ai_interview_submissions 
ADD COLUMN IF NOT EXISTS ai_verdict TEXT CHECK (ai_verdict IN ('approved', 'rejected'));

ALTER TABLE job_readiness_ai_interview_submissions 
ADD COLUMN IF NOT EXISTS admin_verdict_override TEXT CHECK (admin_verdict_override IN ('approved', 'rejected'));

ALTER TABLE job_readiness_ai_interview_submissions 
ADD COLUMN IF NOT EXISTS final_verdict TEXT CHECK (final_verdict IN ('approved', 'rejected'));

ALTER TABLE job_readiness_ai_interview_submissions 
ADD COLUMN IF NOT EXISTS verdict_reason TEXT;

ALTER TABLE job_readiness_ai_interview_submissions 
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

ALTER TABLE job_readiness_ai_interview_submissions 
ADD COLUMN IF NOT EXISTS questions_used JSONB;

-- Add comments for documentation
COMMENT ON COLUMN job_readiness_ai_interview_submissions.ai_verdict IS 'Automatic AI verdict based on analysis (approved/rejected)';
COMMENT ON COLUMN job_readiness_ai_interview_submissions.admin_verdict_override IS 'Admin override of AI verdict (approved/rejected)';
COMMENT ON COLUMN job_readiness_ai_interview_submissions.final_verdict IS 'Final verdict considering both AI and admin input';
COMMENT ON COLUMN job_readiness_ai_interview_submissions.verdict_reason IS 'Explanation for the verdict decision';
COMMENT ON COLUMN job_readiness_ai_interview_submissions.confidence_score IS 'AI confidence score (0.00 to 1.00)';
COMMENT ON COLUMN job_readiness_ai_interview_submissions.questions_used IS 'JSON array of questions used during the interview';

-- Create index for efficient verdict queries
CREATE INDEX IF NOT EXISTS idx_interview_submissions_final_verdict 
ON job_readiness_ai_interview_submissions(final_verdict);

CREATE INDEX IF NOT EXISTS idx_interview_submissions_ai_verdict 
ON job_readiness_ai_interview_submissions(ai_verdict);

-- Update existing records to have a default final_verdict based on current status
UPDATE job_readiness_ai_interview_submissions 
SET final_verdict = CASE 
  WHEN status = 'completed' AND passed = true THEN 'approved'
  WHEN status = 'completed' AND passed = false THEN 'rejected'
  ELSE NULL
END
WHERE final_verdict IS NULL; 