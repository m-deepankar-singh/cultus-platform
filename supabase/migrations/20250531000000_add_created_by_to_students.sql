-- Add created_by columns to students table
ALTER TABLE public.students 
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN created_by_email TEXT;
 
-- Add comments explaining the columns
COMMENT ON COLUMN public.students.created_by IS 'ID of the user who created this student record';
COMMENT ON COLUMN public.students.created_by_email IS 'Email of the user who created this student record'; 