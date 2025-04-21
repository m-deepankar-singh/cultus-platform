-- Create the modules table to store individual learning components (courses, assessments) within products
CREATE TABLE public.modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, -- Links module to a product. Deleting product deletes modules.
    type text NOT NULL, -- Type of module, e.g., 'course', 'assessment'. Consider creating an ENUM type later.
    name text NOT NULL,
    sequence integer DEFAULT 0 NOT NULL, -- For ordering modules within a product, or lessons within a course
    configuration jsonb, -- Store module-specific settings (e.g., time limit, score per question, video URL)
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL -- Links to the Admin profile who created the module
);

-- Add comments for clarity
COMMENT ON TABLE public.modules IS 'Stores individual learning modules (e.g., courses, assessments) that belong to a product.';
COMMENT ON COLUMN public.modules.id IS 'Unique identifier for the module.';
COMMENT ON COLUMN public.modules.created_at IS 'Timestamp when the module was created.';
COMMENT ON COLUMN public.modules.updated_at IS 'Timestamp when the module was last updated.';
COMMENT ON COLUMN public.modules.product_id IS 'Identifier of the product this module belongs to.';
COMMENT ON COLUMN public.modules.type IS 'Type of the learning module (e.g., ''course'', ''assessment'').';
COMMENT ON COLUMN public.modules.name IS 'Name of the module.';
COMMENT ON COLUMN public.modules.sequence IS 'Order of the module within its product, or of a lesson within a course module.';
COMMENT ON COLUMN public.modules.configuration IS 'JSONB field to store configuration specific to the module type (e.g., time limits, video URLs).';
COMMENT ON COLUMN public.modules.created_by IS 'Identifier of the admin user (profile) who created the module.';

-- Consider adding an index on product_id for faster lookups of modules within a product
CREATE INDEX idx_modules_product_id ON public.modules(product_id);

-- Consider adding an index on type if filtering by module type is common
CREATE INDEX idx_modules_type ON public.modules(type);

-- Reminder: RLS is disabled on this table initially per the plan.
-- Enable RLS later using: ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;