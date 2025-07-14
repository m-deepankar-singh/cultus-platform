-- Migration: Add image_url to student progress function
-- This fixes the missing image_url field in the get_student_progress_overview function

CREATE OR REPLACE FUNCTION public.get_student_progress_overview(
  p_student_id uuid,
  p_client_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  result jsonb;
begin
  -- Single query to get all student progress data with proper JOINs
  with assigned_products as (
    select distinct 
      p.id as product_id, 
      p.name as product_name,
      p.description as product_description,
      p.image_url as product_image_url,  -- ✅ FIXED: Added image_url field
      p.type as product_type
    from public.products p
    join public.client_product_assignments cpa on p.id = cpa.product_id
    where cpa.client_id = p_client_id
  ),
  product_modules as (
    select 
      ap.product_id,
      ap.product_name,
      ap.product_description,
      ap.product_image_url,  -- ✅ FIXED: Pass through image_url
      ap.product_type,
      m.id as module_id,
      m.name as module_name,
      m.type as module_type,
      m.sequence,
      m.configuration
    from assigned_products ap
    join public.module_product_assignments mpa on ap.product_id = mpa.product_id
    join public.modules m on mpa.module_id = m.id
  ),
  progress_data as (
    select 
      pm.product_id,
      pm.product_name,
      pm.product_description,
      pm.product_image_url,  -- ✅ FIXED: Pass through image_url
      pm.product_type,
      pm.module_id,
      pm.module_name,
      pm.module_type,
      pm.sequence,
      pm.configuration,
      -- Progress from student_module_progress
      coalesce(smp.status::text, 'NotStarted') as status,
      coalesce(smp.progress_percentage, 0) as progress_percentage,
      smp.score as smp_score,
      smp.completed_at as smp_completed_at,
      smp.last_updated as smp_last_updated,
      -- Assessment data from assessment_submissions (newer system)
      asub.score as assessment_score,
      asub.passed as assessment_passed,
      asub.submitted_at as assessment_submitted_at,
      -- Assessment progress for in-progress assessments
      ap.saved_answers,
      ap.started_at as assessment_started_at,
      ap.remaining_time_seconds,
      ap.timer_paused
    from product_modules pm
    left join public.student_module_progress smp on pm.module_id = smp.module_id and smp.student_id = p_student_id
    left join public.assessment_submissions asub on pm.module_id = asub.assessment_id and asub.student_id = p_student_id
    left join public.assessment_progress ap on pm.module_id = ap.module_id and ap.student_id = p_student_id
  ),
  aggregated_products as (
    select 
      product_id,
      product_name,
      product_description,
      product_image_url,  -- ✅ FIXED: Pass through image_url
      product_type,
      -- Aggregate modules for each product
      jsonb_agg(
        jsonb_build_object(
          'id', module_id,
          'name', module_name,
          'type', module_type,
          'sequence', sequence,
          'configuration', configuration,
          'status', status,
          'progress_percentage', progress_percentage,
          'score', coalesce(assessment_score, smp_score),
          'completed_at', coalesce(assessment_submitted_at, smp_completed_at),
          'last_updated', smp_last_updated,
          'assessment_passed', assessment_passed,
          'assessment_in_progress', case when saved_answers is not null and assessment_submitted_at is null then true else false end,
          'assessment_started_at', assessment_started_at,
          'remaining_time_seconds', remaining_time_seconds,
          'timer_paused', timer_paused
        ) order by sequence
      ) as modules,
      -- Calculate product-level progress summary
      count(*) as total_modules,
      count(*) filter (where status = 'Completed') as completed_modules,
      count(*) filter (where status = 'InProgress') as in_progress_modules,
      count(*) filter (where status = 'NotStarted') as not_started_modules,
      round(
        count(*) filter (where status = 'Completed') * 100.0 / nullif(count(*), 0), 
        1
      ) as completion_percentage
    from progress_data
    group by product_id, product_name, product_description, product_image_url, product_type
  )
  select jsonb_build_object(
    'student_id', p_student_id,
    'client_id', p_client_id,
    'generated_at', extract(epoch from now()) * 1000,
    'products', jsonb_agg(
      jsonb_build_object(
        'id', product_id,
        'name', product_name,
        'description', product_description,
        'image_url', product_image_url,  -- ✅ FIXED: Include image_url in response
        'type', product_type,
        'modules', modules,
        'progress_summary', jsonb_build_object(
          'total_modules', total_modules,
          'completed_modules', completed_modules,
          'in_progress_modules', in_progress_modules,
          'not_started_modules', not_started_modules,
          'completion_percentage', completion_percentage
        )
      ) order by product_name
    ),
    'overall_summary', jsonb_build_object(
      'total_products', count(*),
      'total_modules', sum(total_modules),
      'completed_modules', sum(completed_modules),
      'in_progress_modules', sum(in_progress_modules),
      'not_started_modules', sum(not_started_modules),
      'overall_completion_percentage', round(
        sum(completed_modules) * 100.0 / nullif(sum(total_modules), 0), 
        1
      )
    )
  ) into result
  from aggregated_products;

  return coalesce(result, jsonb_build_object(
    'student_id', p_student_id,
    'client_id', p_client_id,
    'generated_at', extract(epoch from now()) * 1000,
    'products', '[]'::jsonb,
    'overall_summary', jsonb_build_object(
      'total_products', 0,
      'total_modules', 0,
      'completed_modules', 0,
      'in_progress_modules', 0,
      'not_started_modules', 0,
      'overall_completion_percentage', 0
    )
  ));

exception
  when others then
    -- Log error and return empty result
    raise log 'Error in get_student_progress_overview for student %, client %: %', 
              p_student_id, p_client_id, sqlerrm;
    return jsonb_build_object(
      'error', true,
      'message', sqlerrm,
      'student_id', p_student_id,
      'client_id', p_client_id,
      'generated_at', extract(epoch from now()) * 1000
    );
end;
$$;

-- Update function comment
COMMENT ON FUNCTION public.get_student_progress_overview(uuid, uuid) IS 
'Returns comprehensive student progress data including image URLs for products assigned to the student''s client. Optimized single-query implementation.';