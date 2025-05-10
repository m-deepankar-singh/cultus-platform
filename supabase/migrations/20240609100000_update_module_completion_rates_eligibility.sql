-- Migration: Update calculate_module_completion_rates function for accurate eligibility
-- Purpose: Modify the function to base 'totalEnrolled' and 'completionRate' on all students
-- eligible for a module (via client-product assignment), not just those who started it.
-- Also adds counts for 'inProgress' and 'notStarted' by eligible students.

CREATE OR REPLACE FUNCTION public.calculate_module_completion_rates()
RETURNS TABLE (
  "moduleId" uuid,
  "moduleName" text,
  "moduleType" text,
  "completionRate" float,
  "totalEligibleStudents" bigint, -- Renamed from totalEnrolled
  "totalCompletedByEligible" bigint, -- Renamed from totalCompleted
  "totalInProgressByEligible" bigint,
  "totalNotStartedByEligible" bigint
)
LANGUAGE sql
STABLE
AS $$
WITH
  -- 1. For each module, find all students eligible for it
  -- A student is eligible if their client is assigned the product containing the module.
  module_eligible_students AS (
    SELECT
      m.id AS module_id,
      s.id AS student_id
    FROM public.modules m
    JOIN public.products p ON m.product_id = p.id
    JOIN public.client_product_assignments cpa ON p.id = cpa.product_id
    JOIN public.students s ON cpa.client_id = s.client_id
    GROUP BY m.id, s.id -- Ensure unique student per module eligibility
  ),

  -- 2. Aggregate progress for eligible students for each module
  module_stats AS (
    SELECT
      mes.module_id,
      COUNT(DISTINCT mes.student_id) AS eligible_count,
      COUNT(DISTINCT CASE WHEN smp.status = 'Completed' THEN mes.student_id END) AS completed_count,
      COUNT(DISTINCT CASE WHEN smp.status = 'InProgress' THEN mes.student_id END) AS inprogress_count,
      COUNT(DISTINCT CASE WHEN smp.status IS NULL THEN mes.student_id END) AS not_started_count_among_eligible
    FROM module_eligible_students mes
    LEFT JOIN public.student_module_progress smp ON mes.module_id = smp.module_id AND mes.student_id = smp.student_id
    GROUP BY mes.module_id
  )

-- 3. Final select joining with module details
SELECT
  m.id AS "moduleId",
  m.name AS "moduleName",
  m.type AS "moduleType",
  COALESCE(
    (ms.completed_count * 100.0) / NULLIF(ms.eligible_count, 0),
    0
  ) AS "completionRate",
  COALESCE(ms.eligible_count, 0) AS "totalEligibleStudents",
  COALESCE(ms.completed_count, 0) AS "totalCompletedByEligible",
  COALESCE(ms.inprogress_count, 0) AS "totalInProgressByEligible",
  -- If a module has eligible students but no matching record in module_stats (e.g. no one ever started any module)
  -- then eligible_count would be NULL from the LEFT JOIN. We need to handle this. 
  -- However, the above CTE design should give a row for every module with eligible students.
  -- The not_started_count_among_eligible from module_stats is correct if an eligible student has NO smp record for that module.
  COALESCE(ms.not_started_count_among_eligible, COALESCE(ms.eligible_count, 0) - (COALESCE(ms.completed_count, 0) + COALESCE(ms.inprogress_count, 0)) ) AS "totalNotStartedByEligible"
FROM public.modules m
LEFT JOIN module_stats ms ON m.id = ms.module_id
ORDER BY m.name;
$$;

-- Security: Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_module_completion_rates() TO authenticated;
-- No access for anonymous users
REVOKE EXECUTE ON FUNCTION public.calculate_module_completion_rates() FROM anon; 