-- Create the roles table to define the possible user roles
CREATE TABLE public.roles (
    role_name text PRIMARY KEY NOT NULL, -- The unique name of the role (e.g., 'admin', 'student')
    description text -- Optional description of the role's purpose
);

-- Add comments for clarity
COMMENT ON TABLE public.roles IS 'Defines the set of user roles available in the platform.';
COMMENT ON COLUMN public.roles.role_name IS 'Unique identifier and name for the role.';
COMMENT ON COLUMN public.roles.description IS 'A brief description of what the role entails.';

-- Populate the table with the initial roles defined in the PRD/plan
INSERT INTO public.roles (role_name, description) VALUES
    ('admin', 'Platform Administrator with full access.'),
    ('staff', 'Platform Staff managing clients and students.'),
    ('viewer', 'Platform Viewer with read-only access to aggregated data.'),
    ('client_staff', 'Client Staff (University) monitoring their specific students.'),
    ('student', 'End-user (Learner) accessing the Main App.');

-- Optional Step: If you decide to enforce role integrity via foreign key constraint,
-- you can alter the profiles table AFTER creating this roles table and ensuring
-- existing profiles.role values match the role_name values inserted above.
--
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_role_fkey FOREIGN KEY (role) REFERENCES public.roles(role_name) ON UPDATE CASCADE;
--
-- Also, update the default value for profiles.role if needed, e.g.:
-- ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student'::text; -- Ensure default exists in roles table

-- Note: RLS does not typically apply to a simple lookup table like this,
-- but it could be added if role visibility needed restriction.