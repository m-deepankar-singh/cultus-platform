-- Migration: Add RLS SELECT policies for Viewer role
-- Description: Grants necessary SELECT permissions for the Viewer role 
--              to allow the get_aggregated_progress_report function to execute.

-- Profiles: Allow Viewer to select student profiles needed for aggregation
CREATE POLICY "Viewer: Select student profiles for reports"
ON public.profiles
FOR SELECT TO authenticated
USING (role = 'Student'); -- Viewer needs to see student profiles, maybe others?
-- Consider if Viewer should see staff profiles too? For now, just students.

-- Client Product Assignments: Allow Viewer to select all assignments
CREATE POLICY "Viewer: Select all client product assignments"
ON public.client_product_assignments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Viewer', 'Admin')));

-- Student Module Progress: Allow Viewer to select all progress data
CREATE POLICY "Viewer: Select all student module progress"
ON public.student_module_progress
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Viewer', 'Admin')));

-- Clients: Allow Viewer to select all clients
CREATE POLICY "Viewer: Select all clients"
ON public.clients
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Viewer', 'Admin')));

-- Products: Allow Viewer to select all products
CREATE POLICY "Viewer: Select all products"
ON public.products
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Viewer', 'Admin')));

-- Modules: Ensure Viewer can select all modules (relying on existing authenticated policy is likely fine,
-- but adding an explicit one for clarity/safety).
-- The existing "Allow authenticated users to read modules" policy should cover this.
-- Optional: Add an explicit Viewer policy if needed for stricter control.
-- CREATE POLICY "Viewer: Select all modules"
-- ON public.modules
-- FOR SELECT TO authenticated
-- USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Viewer')); 