-- Migration: Update calculate_product_performance database function
-- Purpose: Correct the function to properly calculate product performance metrics
-- including all modules a student has access to, not just the ones they've started

-- Update function to calculate performance metrics for all products
CREATE OR REPLACE FUNCTION public.calculate_product_performance()
RETURNS TABLE (
  "productId" uuid,
  "productName" text,
  "averageOverallProductProgress" float,
  "totalEngagedLearners" bigint,
  "totalEligibleLearners" bigint,
  "completionRate" float,
  "completedCount" bigint,
  "enrolledCount" bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH 
  -- Get all products and their modules
  product_modules AS (
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      COUNT(DISTINCT m.id) AS total_modules_in_product
    FROM
      public.products p
    JOIN
      public.modules m ON m.product_id = p.id
    GROUP BY
      p.id, p.name
  ),
  
  -- Get all students who have access to each product through their client
  eligible_students AS (
    SELECT
      pm.product_id,
      pm.product_name,
      s.id AS student_id,
      pm.total_modules_in_product
    FROM
      product_modules pm
    JOIN
      public.client_product_assignments cpa ON cpa.product_id = pm.product_id
    JOIN
      public.students s ON s.client_id = cpa.client_id
  ),
  
  -- Calculate progress for students who have started modules
  student_progress AS (
    SELECT
      es.product_id,
      es.product_name,
      es.student_id,
      es.total_modules_in_product,
      -- Count completed modules for this student
      COUNT(DISTINCT CASE WHEN smp.status = 'Completed' THEN smp.module_id END) AS completed_modules,
      -- Calculate progress percentage across all started modules
      COALESCE(AVG(smp.progress_percentage), 0) AS progress_percentage,
      -- Has student started any modules?
      COUNT(DISTINCT smp.module_id) > 0 AS has_started_product
    FROM
      eligible_students es
    LEFT JOIN
      public.student_module_progress smp ON es.student_id = smp.student_id
    LEFT JOIN
      public.modules m ON smp.module_id = m.id AND m.product_id = es.product_id
    GROUP BY
      es.product_id, es.product_name, es.student_id, es.total_modules_in_product
  )
  
  -- Final aggregation by product
  SELECT
    sp.product_id AS "productId",
    sp.product_name AS "productName",
    -- Average progress across students who have started the product
    COALESCE(
      AVG(CASE WHEN sp.has_started_product THEN sp.progress_percentage ELSE NULL END),
      0
    ) AS "averageOverallProductProgress",
    -- Count of unique students who have engaged with this product
    COUNT(DISTINCT CASE WHEN sp.has_started_product THEN sp.student_id ELSE NULL END) AS "totalEngagedLearners",
    -- Count of all students who have access to this product
    COUNT(DISTINCT sp.student_id) AS "totalEligibleLearners",
    -- Product completion rate (percentage of eligible students who completed all modules)
    COALESCE(
      (COUNT(DISTINCT CASE WHEN sp.completed_modules = sp.total_modules_in_product THEN sp.student_id ELSE NULL END) * 100.0) /
      NULLIF(COUNT(DISTINCT sp.student_id), 0),
      0
    ) AS "completionRate",
    -- Count of students who completed all modules in the product
    COUNT(DISTINCT CASE WHEN sp.completed_modules = sp.total_modules_in_product THEN sp.student_id ELSE NULL END) AS "completedCount",
    -- Count of all students who have access to the product
    COUNT(DISTINCT sp.student_id) AS "enrolledCount"
  FROM
    student_progress sp
  GROUP BY
    sp.product_id, sp.product_name
  ORDER BY
    sp.product_name;
$$;

-- Security: Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_product_performance() TO authenticated;
-- No access for anonymous users
REVOKE EXECUTE ON FUNCTION public.calculate_product_performance() FROM anon; 