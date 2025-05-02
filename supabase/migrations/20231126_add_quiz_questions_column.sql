-- Add quiz_questions column to lessons table
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS quiz_questions JSONB;

-- Comment on the column
COMMENT ON COLUMN public.lessons.quiz_questions IS 'Stores the quiz questions associated with this lesson'; 