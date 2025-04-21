-- Create the clients table to store university/organization details
CREATE TABLE public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    contact_email text,
    address text,
    logo_url text, -- URL for the client's logo
    is_active boolean DEFAULT true NOT NULL -- Indicates if the client is active or inactive
);

-- Add comments to the table and columns for better understanding
COMMENT ON TABLE public.clients IS 'Stores information about university clients.';
COMMENT ON COLUMN public.clients.id IS 'Unique identifier for the client.';
COMMENT ON COLUMN public.clients.created_at IS 'Timestamp when the client was created.';
COMMENT ON COLUMN public.clients.updated_at IS 'Timestamp when the client was last updated.';
COMMENT ON COLUMN public.clients.name IS 'Name of the university or client organization.';
COMMENT ON COLUMN public.clients.contact_email IS 'Primary contact email for the client.';
COMMENT ON COLUMN public.clients.address IS 'Physical address of the client.';
COMMENT ON COLUMN public.clients.logo_url IS 'URL pointing to the client''s logo image.';
COMMENT ON COLUMN public.clients.is_active IS 'Flag indicating if the client account is active (true) or inactive (false).';

-- Reminder: RLS is disabled on this table initially per the plan.
-- Enable RLS later using: ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;