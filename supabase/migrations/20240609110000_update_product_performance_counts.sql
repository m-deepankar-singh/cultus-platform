-- Migration: Update calculate_product_performance to include Not Started and In Progress counts per product
-- Purpose: Enhance the function to output explicit counts for students who are
-- Not Started, In Progress, or Completed for each product, based on eligibility.

CREATE OR REPLACE FUNCTION public.calculate_product_performance()
RETURNS TABLE (
  "productId" uuid,
  "productName" text,
  "averageOverallProductProgress" float, -- Still based on engaged learners progress / eligible learners
  "totalEngagedLearners" bigint,
  "totalEligibleLearners" bigint,
  "completionRate" float, -- Based on eligible learners completing all modules
  "completedCount" bigint, -- Eligible learners who completed all modules
  "inProgressCount" bigint, -- Eligible learners who started but not completed all modules
  "notStartedCount" bigint -- Eligible learners who have not started any module in the product
  -- enrolledCount is effectively totalEligibleLearners, so removed redundant enrolledCount field
)
LANGUAGE sql
STABLE
AS $$
WITH 
  product_modules AS (
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      COUNT(DISTINCT m.id) AS total_modules_in_product
    FROM public.products p
    JOIN public.modules m ON m.product_id = p.id
    GROUP BY p.id, p.name
  ),
  
  eligible_students AS (
    SELECT
      pm.product_id,
      pm.product_name,
      s.id AS student_id,
      pm.total_modules_in_product
    FROM product_modules pm
    JOIN public.client_product_assignments cpa ON cpa.product_id = pm.product_id
    JOIN public.students s ON s.client_id = cpa.client_id
  ),
  
  student_product_actual_progress AS (
    SELECT
      es.product_id,
      es.product_name,
      es.student_id,
      es.total_modules_in_product,
      COUNT(DISTINCT CASE WHEN smp.status = 'Completed' THEN smp.module_id END) AS num_completed_modules_by_student,
      COALESCE(AVG(smp.progress_percentage), 0) AS avg_progress_of_started_modules_by_student,
      COUNT(DISTINCT smp.module_id) > 0 AS has_started_any_module -- True if student has any record in student_module_progress for this product's modules
    FROM eligible_students es
    LEFT JOIN public.student_module_progress smp ON es.student_id = smp.student_id
    LEFT JOIN public.modules m ON smp.module_id = m.id AND m.product_id = es.product_id
    GROUP BY es.product_id, es.product_name, es.student_id, es.total_modules_in_product
  )
  
SELECT
  spap.product_id AS "productId",
  spap.product_name AS "productName",
  COALESCE(
    SUM(CASE WHEN spap.has_started_any_module THEN spap.avg_progress_of_started_modules_by_student ELSE 0 END) / NULLIF(COUNT(DISTINCT spap.student_id), 0),
    0
  ) AS "averageOverallProductProgress", -- Weighted average product progress across all eligible students
  COUNT(DISTINCT CASE WHEN spap.has_started_any_module THEN spap.student_id END) AS "totalEngagedLearners",
  COUNT(DISTINCT spap.student_id) AS "totalEligibleLearners",
  COALESCE(
    (COUNT(DISTINCT CASE WHEN spap.num_completed_modules_by_student = spap.total_modules_in_product THEN spap.student_id END) * 100.0) /
    NULLIF(COUNT(DISTINCT spap.student_id), 0),
    0
  ) AS "completionRate",
  COUNT(DISTINCT CASE WHEN spap.num_completed_modules_by_student = spap.total_modules_in_product THEN spap.student_id END) AS "completedCount",
  COUNT(DISTINCT CASE WHEN spap.has_started_any_module AND spap.num_completed_modules_by_student < spap.total_modules_in_product THEN spap.student_id END) AS "inProgressCount",
  COUNT(DISTINCT CASE WHEN NOT spap.has_started_any_module THEN spap.student_id END) AS "notStartedCount"
FROM student_product_actual_progress spap
GROUP BY spap.product_id, spap.product_name
ORDER BY spap.product_name;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_product_performance() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_product_performance() FROM anon; 