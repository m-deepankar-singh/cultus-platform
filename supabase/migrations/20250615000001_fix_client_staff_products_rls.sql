-- Migration: Fix Client Staff RLS for product-related tables
-- Description: Enables RLS on client_product_assignments and adds policies for Client Staff

-- Enable RLS on client_product_assignments table (it was disabled before)
ALTER TABLE public.client_product_assignments ENABLE ROW LEVEL SECURITY;

-- Add policy for Client Staff to access client_product_assignments
CREATE POLICY "Client Staff: Select assignments for their client"
ON public.client_product_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles staff_profile
    WHERE staff_profile.id = auth.uid()
    AND staff_profile.role = 'Client Staff'
    AND staff_profile.client_id = client_product_assignments.client_id
  )
);

-- Add policy for Admin to access client_product_assignments
CREATE POLICY "Admin: Full access to client_product_assignments"
ON public.client_product_assignments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- Add policy for Client Staff to access products table
CREATE POLICY "Client Staff: Select products assigned to their client"
ON public.products
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles staff_profile
    JOIN public.client_product_assignments cpa
    ON staff_profile.client_id = cpa.client_id
    WHERE staff_profile.id = auth.uid()
    AND staff_profile.role = 'Client Staff'
    AND cpa.product_id = products.id
  )
); 