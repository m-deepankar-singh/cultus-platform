-- Create the products table to store information about learning products (containers for modules)
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL -- Links to the Admin profile who created the product
);

-- Add comments for clarity
COMMENT ON TABLE public.products IS 'Stores learning products, which act as containers for modules (courses, assessments).';
COMMENT ON COLUMN public.products.id IS 'Unique identifier for the product.';
COMMENT ON COLUMN public.products.created_at IS 'Timestamp when the product was created.';
COMMENT ON COLUMN public.products.updated_at IS 'Timestamp when the product was last updated.';
COMMENT ON COLUMN public.products.name IS 'Name of the learning product.';
COMMENT ON COLUMN public.products.description IS 'Optional description of the product.';
COMMENT ON COLUMN public.products.created_by IS 'Identifier of the admin user (profile) who created the product.';

-- Reminder: RLS is disabled on this table initially per the plan.
-- Enable RLS later using: ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;