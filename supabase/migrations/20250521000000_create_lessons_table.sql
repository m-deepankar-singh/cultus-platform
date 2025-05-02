-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    sequence INTEGER NOT NULL DEFAULT 0,
    has_quiz BOOLEAN NOT NULL DEFAULT false,
    quiz_data JSONB
);

-- Add comment to lessons table
COMMENT ON TABLE public.lessons IS 'Stores individual lessons that belong to course modules';

-- Add comments to columns
COMMENT ON COLUMN public.lessons.id IS 'Unique identifier for the lesson';
COMMENT ON COLUMN public.lessons.created_at IS 'Timestamp when the lesson was created';
COMMENT ON COLUMN public.lessons.updated_at IS 'Timestamp when the lesson was last updated';
COMMENT ON COLUMN public.lessons.module_id IS 'ID of the course module this lesson belongs to';
COMMENT ON COLUMN public.lessons.title IS 'Title of the lesson';
COMMENT ON COLUMN public.lessons.description IS 'Description of the lesson contents';
COMMENT ON COLUMN public.lessons.video_url IS 'URL to the video for this lesson';
COMMENT ON COLUMN public.lessons.sequence IS 'Order of the lesson within the module';
COMMENT ON COLUMN public.lessons.has_quiz IS 'Whether this lesson has an associated quiz';
COMMENT ON COLUMN public.lessons.quiz_data IS 'JSON data for the quiz associated with this lesson';

-- Create index on module_id to speed up queries by module
CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON public.lessons(module_id);

-- Create index on sequence for ordering queries
CREATE INDEX IF NOT EXISTS lessons_sequence_idx ON public.lessons(sequence);

-- Add RLS policies
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Policy for admins and staff to see all lessons
CREATE POLICY lessons_select_for_admin_and_staff
ON public.lessons FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin' OR profiles.role = 'staff')
    )
);

-- Policy for students to see lessons from modules they have access to
CREATE POLICY lessons_select_for_students
ON public.lessons FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.modules
        JOIN public.student_product_assignments ON modules.product_id = student_product_assignments.product_id
        WHERE modules.id = lessons.module_id
        AND student_product_assignments.student_id = auth.uid()
    )
);

-- Policy for admins to insert lessons
CREATE POLICY lessons_insert_for_admin
ON public.lessons FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Policy for admins to update lessons
CREATE POLICY lessons_update_for_admin
ON public.lessons FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Policy for admins to delete lessons
CREATE POLICY lessons_delete_for_admin
ON public.lessons FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Add functions to manage created_at and updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to update updated_at when lesson is modified
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 