-- Migration: Add calculate_module_completion_rates database function
-- Purpose: Create a function to calculate completion rates for each module,
-- counting students who have started vs completed modules

CREATE OR REPLACE FUNCTION public.calculate_module_completion_rates()
RETURNS TABLE (
  "moduleId" uuid,
  "moduleName" text,
  "moduleType" text,
  "completionRate" float,
  "totalEnrolled" bigint,
  "totalCompleted" bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id AS "moduleId",
    m.name AS "moduleName",
    m.type AS "moduleType", 
    COALESCE(
      (COUNT(CASE WHEN smp.status = 'Completed' THEN 1 END) * 100.0) /
      NULLIF(COUNT(DISTINCT smp.student_id), 0),
      0
    ) AS "completionRate",
    COUNT(DISTINCT smp.student_id) AS "totalEnrolled",
    COUNT(CASE WHEN smp.status = 'Completed' THEN 1 END) AS "totalCompleted"
  FROM
    public.modules m
  LEFT JOIN
    public.student_module_progress smp ON m.id = smp.module_id
  GROUP BY
    m.id, m.name, m.type
  ORDER BY
    m.name;
$$;

-- Security: Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_module_completion_rates() TO authenticated;
-- No access for anonymous users
REVOKE EXECUTE ON FUNCTION public.calculate_module_completion_rates() FROM anon; 