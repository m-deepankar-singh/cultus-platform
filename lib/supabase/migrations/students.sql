-- Add new columns to the students table as requested
ALTER TABLE public.students
ADD COLUMN email text, -- Note: Consider fetching from auth.users instead to avoid sync issues
ADD COLUMN phone_number text,
ADD COLUMN star_rating smallint CHECK (star_rating >= 0 AND star_rating <= 5), -- Optional rating feature
ADD COLUMN last_login_at timestamp with time zone;

-- Add comments for the new columns
COMMENT ON COLUMN public.students.email IS 'Student''s email address (Consider fetching from auth.users).';
COMMENT ON COLUMN public.students.phone_number IS 'Student''s phone number.';
COMMENT ON COLUMN public.students.star_rating IS 'A 1-5 star rating feature, purpose TBD.';
COMMENT ON COLUMN public.students.last_login_at IS 'Timestamp of the student''s last successful login.';

-- Optional: Add an index if querying by email is frequent
-- CREATE INDEX idx_students_email ON public.students(email);