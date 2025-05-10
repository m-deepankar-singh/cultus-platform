-- Migration: Add calculate_product_performance database function
-- Purpose: Create a function to calculate product performance metrics including
-- average progress, completion rates, and learner engagement
-- This provides data for the Product Performance section of the analytics dashboard

-- Function to calculate performance metrics for all products
CREATE OR REPLACE FUNCTION public.calculate_product_performance()
RETURNS TABLE (
  "productId" uuid,
  "productName" text,
  "averageOverallProductProgress" float,
  "totalEngagedLearners" bigint,
  "completionRate" float,
  "completedCount" bigint,
  "enrolledCount" bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH product_modules AS (
    -- Get all modules for each product
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      m.id AS module_id
    FROM
      public.products p
    JOIN
      public.modules m ON m.product_id = p.id
  ),
  
  student_product_engagement AS (
    -- For each product, find all students who have started any module in the product
    SELECT
      pm.product_id,
      pm.product_name,
      smp.student_id,
      -- Calculate the average progress across all modules in a product for each student
      AVG(COALESCE(smp.progress_percentage, 0)) AS student_product_progress,
      -- A student has completed a product if they've completed all modules
      BOOL_AND(smp.status = 'Completed') AS has_completed_product
    FROM
      product_modules pm
    LEFT JOIN
      public.student_module_progress smp ON pm.module_id = smp.module_id
    WHERE
      smp.student_id IS NOT NULL -- Only include students who have started at least one module
    GROUP BY
      pm.product_id, pm.product_name, smp.student_id
  )
  
  -- Final aggregation by product
  SELECT
    spe.product_id AS "productId",
    spe.product_name AS "productName",
    -- Average progress across all students for the product
    COALESCE(AVG(spe.student_product_progress), 0) AS "averageOverallProductProgress",
    -- Count of unique students who have engaged with this product
    COUNT(DISTINCT spe.student_id) AS "totalEngagedLearners",
    -- Product completion rate (percentage of students who completed all modules)
    COALESCE(
      (COUNT(CASE WHEN spe.has_completed_product THEN 1 END) * 100.0) /
      NULLIF(COUNT(DISTINCT spe.student_id), 0),
      0
    ) AS "completionRate",
    -- Count of students who completed the entire product
    COUNT(CASE WHEN spe.has_completed_product THEN 1 END) AS "completedCount",
    -- Count of students who started the product (enrolled)
    COUNT(DISTINCT spe.student_id) AS "enrolledCount"
  FROM
    student_product_engagement spe
  GROUP BY
    spe.product_id, spe.product_name
  ORDER BY
    spe.product_name;
$$;

-- Security: Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_product_performance() TO authenticated;
-- No access for anonymous users
REVOKE EXECUTE ON FUNCTION public.calculate_product_performance() FROM anon; 