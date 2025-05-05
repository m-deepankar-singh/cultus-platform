-- Migration: Add Staff RLS policies for client management
-- Description: Adds Row Level Security policies for Staff to fully manage clients
-- Affected Tables: public.clients

-- Enable RLS on clients table if not already enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Add policy for Staff to view all clients
CREATE POLICY "Staff: Select all clients"
ON public.clients
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Staff'
    )
);

-- Add policy for Staff to create new clients
CREATE POLICY "Staff: Insert clients"
ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Staff'
    )
);

-- Add policy for Staff to update existing clients
CREATE POLICY "Staff: Update clients"
ON public.clients
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Staff'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Staff'
    )
);

-- Add policy for Staff to delete clients
CREATE POLICY "Staff: Delete clients"
ON public.clients
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Staff'
    )
);

-- Ensure Admin has full access to clients
CREATE POLICY "Admin: Full access to clients"
ON public.clients
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'
    )
); 