-- Video analyzer tables and fields for job readiness interviews
-- For interview recordings and AI analysis

-- Create bucket for storing interview recordings if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview_recordings', 'interview_recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Add policies for interview_recordings bucket
CREATE POLICY "Students can upload their own interview recordings" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'interview_recordings' AND
  (storage.foldername(name))[1] = 'interviews' AND
  position(auth.uid()::text in name) > 0
);

CREATE POLICY "Students can view their own interview recordings" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'interview_recordings' AND
  (storage.foldername(name))[1] = 'interviews' AND
  position(auth.uid()::text in name) > 0
);

-- Create or extend job_readiness_ai_interview_submissions table
CREATE TABLE IF NOT EXISTS public.job_readiness_ai_interview_submissions (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  interview_questions_id UUID REFERENCES public.job_readiness_active_interview_sessions(id),
  video_storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_analysis',
  background_when_submitted TEXT NOT NULL,
  tier_when_submitted TEXT NOT NULL,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT job_readiness_ai_interview_submissions_status_check
    CHECK (status IN ('pending_analysis', 'completed', 'analysis_failed', 'pending_manual_review'))
);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS job_readiness_ai_interview_submissions_student_id_idx
  ON public.job_readiness_ai_interview_submissions(student_id);

-- Set up RLS for interview submissions
ALTER TABLE public.job_readiness_ai_interview_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own submissions
CREATE POLICY "Students can view their own interview submissions"
  ON public.job_readiness_ai_interview_submissions
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can create their own submissions
CREATE POLICY "Students can create their own interview submissions"
  ON public.job_readiness_ai_interview_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Only allow service roles to update submissions (for analysis results)
CREATE POLICY "Service role can update interview submissions"
  ON public.job_readiness_ai_interview_submissions
  FOR UPDATE
  TO service_role
  USING (true);

-- Add a field for grading criteria in job_readiness_background_interview_types if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'job_readiness_background_interview_types'
    AND column_name = 'grading_criteria'
  ) THEN
    ALTER TABLE public.job_readiness_background_interview_types
    ADD COLUMN grading_criteria JSONB;
  END IF;
END
$$; 