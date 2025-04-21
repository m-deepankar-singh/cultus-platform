-- Create the profiles table to store user-specific data, linked to Supabase Auth users
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Links directly to the authenticated user in auth.users
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text,
    role text DEFAULT 'student'::text NOT NULL, -- Possible values: 'admin', 'staff', 'viewer', 'client_staff', 'student'
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL, -- Links Client Staff and Students to a specific client
    is_active boolean DEFAULT true NOT NULL, -- Indicates if the user account is active
    is_enrolled boolean DEFAULT false NOT NULL -- Specifically indicates if a student is currently enrolled
);

-- Add comments to the table and columns
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user, extending auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'User ID, references the id field in auth.users.';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp when the profile was last updated.';
COMMENT ON COLUMN public.profiles.full_name IS 'Full name of the user.';
COMMENT ON COLUMN public.profiles.role IS 'Role assigned to the user (e.g., admin, staff, student). Determines permissions.';
COMMENT ON COLUMN public.profiles.client_id IS 'Identifier for the client (university) the user belongs to (if applicable).';
COMMENT ON COLUMN public.profiles.is_active IS 'Flag indicating if the user account is currently active.';
COMMENT ON COLUMN public.profiles.is_enrolled IS 'Flag indicating if the user (specifically a student) is currently enrolled and allowed access to the Main App.';

-- Reminder: RLS is disabled on this table initially per the plan.
-- Enable RLS later using: ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;