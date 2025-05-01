-- Migration: Allow authenticated users to select assigned products
-- Description: Adds an RLS policy to the public.products table to allow authenticated users
--              (specifically students) to read products that are assigned to their client.
-- Affected Tables: public.products

-- Enable RLS if not already enabled (idempotent)
-- Note: The previous list_tables output showed RLS was already enabled, but this ensures it.
alter table public.products enable row level security;

-- Add SELECT policy for authenticated users
create policy "Allow authenticated users to select assigned products" 
on public.products for select to authenticated using (
  exists (
    select 1
    from public.client_product_assignments cpa
    join public.students s on cpa.client_id = s.client_id
    where cpa.product_id = public.products.id
    and s.id = auth.uid()
  )
); 