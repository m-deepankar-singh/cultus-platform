-- Migration: Update calculate_client_usage_metrics database function
-- Purpose: Update the function to use the is_active column instead of last_login_at for determining active learners

CREATE OR REPLACE FUNCTION public.calculate_client_usage_metrics()
RETURNS TABLE (
  "clientId" uuid,
  "clientName" text,
  "activeLearnersInClient" bigint,
  "averageProductProgressInClient" float
)
LANGUAGE sql
STABLE
AS $$
WITH
  -- 1. Identify active students based on is_active flag
  active_students AS (
    SELECT id AS student_id
    FROM public.students
    WHERE is_active = true
  ),

  -- 2. Get all products and their total modules
  product_total_modules AS (
    SELECT
      p.id AS product_id,
      COUNT(m.id) AS total_modules_in_product
    FROM public.products p
    JOIN public.modules m ON p.id = m.product_id
    GROUP BY p.id
  ),
  
  -- 3. Calculate each student's progress in each product they are assigned via their client
  student_product_progress AS (
    SELECT
      s.client_id,
      cpa.product_id,
      s.id AS student_id,
      ptm.total_modules_in_product,
      COUNT(DISTINCT CASE WHEN smp.status = 'Completed' THEN smp.module_id END) AS completed_modules
    FROM public.students s
    JOIN public.client_product_assignments cpa ON s.client_id = cpa.client_id
    JOIN product_total_modules ptm ON cpa.product_id = ptm.product_id
    LEFT JOIN public.student_module_progress smp ON s.id = smp.student_id
    LEFT JOIN public.modules m ON smp.module_id = m.id AND m.product_id = cpa.product_id
    GROUP BY s.client_id, cpa.product_id, s.id, ptm.total_modules_in_product
  ),

  -- 4. Calculate average product progress PER STUDENT across all products they are assigned
  student_avg_product_progress AS (
    SELECT
      spp.client_id,
      spp.student_id,
      COALESCE(AVG(
        CASE 
          WHEN spp.total_modules_in_product > 0 THEN (spp.completed_modules * 100.0 / spp.total_modules_in_product)
          ELSE 0 
        END
      ), 0) AS avg_progress_across_products -- Average of individual product completion percentages for this student
    FROM student_product_progress spp
    GROUP BY spp.client_id, spp.student_id
  )

-- 5. Aggregate metrics per client
SELECT
  c.id AS "clientId",
  c.name AS "clientName",
  -- Count active learners for this client
  COUNT(DISTINCT CASE WHEN acs.student_id IS NOT NULL THEN s.id ELSE NULL END) AS "activeLearnersInClient",
  -- Calculate average product progress for this client (average of student_avg_product_progress)
  COALESCE(AVG(sapp.avg_progress_across_products), 0) AS "averageProductProgressInClient"
FROM public.clients c
-- Join students belonging to this client
LEFT JOIN public.students s ON c.id = s.client_id
-- Join to see if these students are active
LEFT JOIN active_students acs ON s.id = acs.student_id
-- Join to get the per-student average progress for students of this client
LEFT JOIN student_avg_product_progress sapp ON c.id = sapp.client_id AND s.id = sapp.student_id
GROUP BY c.id, c.name
ORDER BY c.name;
$$;

-- Security: Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_client_usage_metrics() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_client_usage_metrics() FROM anon; 