-- Fix database function compliance issues
-- Add search_path configuration, fully qualified table names, and proper stability
-- Applied via MCP on 2025-01-22

-- This migration fixes critical compliance issues in the progress API functions:
-- 1. Added 'set search_path = '';' configuration for security
-- 2. Changed all table references to fully qualified names (public.table_name)
-- 3. Changed functions from VOLATILE to STABLE since they only read data
-- 4. Maintained SECURITY INVOKER for proper access control

-- 1. Fix get_student_progress_overview function
create or replace function public.get_student_progress_overview(
  p_student_id uuid, 
  p_client_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  result jsonb;
begin
  -- Single query to get all student progress data with proper JOINs
  with assigned_products as (
    select distinct 
      p.id as product_id, 
      p.name as product_name,
      p.description as product_description,
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
    group by product_id, product_name, product_description, product_type
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

-- 2. Fix get_course_progress_with_lessons function
create or replace function public.get_course_progress_with_lessons(
  p_student_id uuid, 
  p_module_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  result jsonb;
begin
  with module_info as (
    select 
      m.id,
      m.name,
      m.type,
      m.sequence,
      m.configuration
    from public.modules m
    where m.id = p_module_id
  ),
  module_progress as (
    select 
      smp.status,
      smp.progress_percentage,
      smp.completed_videos,
      smp.video_completion_count,
      smp.course_completed_at,
      smp.last_updated,
      smp.progress_details
    from public.student_module_progress smp
    where smp.student_id = p_student_id 
      and smp.module_id = p_module_id
  ),
  lesson_data as (
    select 
      l.id,
      l.title,
      l.description,
      l.sequence,
      l.video_url,
      l.has_quiz,
      l.quiz_data,
      l.quiz_questions,
      -- Check if this lesson is completed
      case 
        when mp.completed_videos is not null 
        then l.id::text = any(mp.completed_videos)
        else false 
      end as is_completed
    from public.lessons l
    cross join module_progress mp
    where l.module_id = p_module_id 
  )
  select jsonb_build_object(
    'module', jsonb_build_object(
      'id', mi.id,
      'name', mi.name,
      'type', mi.type,
      'sequence', mi.sequence,
      'configuration', mi.configuration
    ),
    'progress', jsonb_build_object(
      'status', coalesce(mp.status::text, 'NotStarted'),
      'progress_percentage', coalesce(mp.progress_percentage, 0),
      'completed_videos', coalesce(mp.completed_videos, '{}'),
      'video_completion_count', coalesce(mp.video_completion_count, 0),
      'course_completed_at', mp.course_completed_at,
      'last_updated', mp.last_updated,
      'progress_details', mp.progress_details
    ),
    'lessons', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'id', ld.id,
          'title', ld.title,
          'description', ld.description,
          'sequence', ld.sequence,
          'video_url', ld.video_url,
          'has_quiz', ld.has_quiz,
          'quiz_data', ld.quiz_data,
          'quiz_questions', ld.quiz_questions,
          'is_completed', ld.is_completed
        ) order by ld.sequence
      ) from lesson_data ld), 
      '[]'::jsonb
    ),
    'summary', jsonb_build_object(
      'total_lessons', (select count(*) from lesson_data),
      'completed_lessons', (select count(*) from lesson_data where is_completed = true),
      'completion_percentage', round(
        (select count(*) from lesson_data where is_completed = true) * 100.0 / 
        nullif((select count(*) from lesson_data), 0), 1
      )
    ),
    'generated_at', extract(epoch from now()) * 1000
  ) into result
  from module_info mi
  left join module_progress mp on true;

  return coalesce(result, jsonb_build_object(
    'error', true,
    'message', 'Module not found or no access',
    'module_id', p_module_id,
    'student_id', p_student_id,
    'generated_at', extract(epoch from now()) * 1000
  ));

exception
  when others then
    raise log 'Error in get_course_progress_with_lessons for student %, module %: %', 
              p_student_id, p_module_id, sqlerrm;
    return jsonb_build_object(
      'error', true,
      'message', sqlerrm,
      'module_id', p_module_id,
      'student_id', p_student_id,
      'generated_at', extract(epoch from now()) * 1000
    );
end;
$$;

-- 3. Fix get_assessment_details_with_progress function
create or replace function public.get_assessment_details_with_progress(
  p_student_id uuid, 
  p_module_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  result jsonb;
begin
  -- Single query to get all assessment data with proper JOINs and access verification
  with module_info as (
    select 
      m.id,
      m.name,
      m.type,
      m.configuration,
      -- Get product assignment for access verification
      mpa.product_id
    from public.modules m
    join public.module_product_assignments mpa on m.id = mpa.module_id
    where m.id = p_module_id and m.type = 'Assessment'
  ),
  access_check as (
    select 
      mi.*,
      -- Check if student's client has access to this product
      case when cpa.client_id is not null then true else false end as has_access,
      s.client_id
    from module_info mi
    cross join public.students s
    left join public.client_product_assignments cpa on mi.product_id = cpa.product_id and s.client_id = cpa.client_id
    where s.id = p_student_id and s.is_active = true
  ),
  assessment_questions as (
    select 
      ac.id,
      ac.name,
      ac.type,
      ac.configuration,
      ac.has_access,
      ac.client_id,
      -- Aggregate questions
      jsonb_agg(
        jsonb_build_object(
          'id', aq.id,
          'question_text', aq.question_text,
          'question_type', aq.question_type,
          'options', coalesce(aq.options, '[]'::jsonb)
        ) order by amq.sequence
      ) as questions
    from access_check ac
    left join public.assessment_module_questions amq on ac.id = amq.module_id
    left join public.assessment_questions aq on amq.question_id = aq.id
    where ac.has_access = true
    group by ac.id, ac.name, ac.type, ac.configuration, ac.has_access, ac.client_id
  ),
  progress_data as (
    select 
      aq.*,
      -- Get submission status
      ap_submitted.submitted_at as submission_time,
      ap_submitted.passed as submission_passed,
      -- Get in-progress attempt details
      ap_progress.saved_answers,
      ap_progress.started_at,
      ap_progress.remaining_time_seconds,
      ap_progress.timer_paused
    from assessment_questions aq
    -- Check for submitted attempts
    left join public.assessment_progress ap_submitted on aq.id = ap_submitted.module_id 
      and ap_submitted.student_id = p_student_id 
      and ap_submitted.submitted_at is not null
    -- Check for in-progress attempts
    left join public.assessment_progress ap_progress on aq.id = ap_progress.module_id 
      and ap_progress.student_id = p_student_id 
      and ap_progress.submitted_at is null
  )
  select jsonb_build_object(
    'assessment', jsonb_build_object(
      'id', pd.id,
      'name', pd.name,
      'instructions', (pd.configuration->>'instructions'),
      'time_limit_minutes', coalesce(
        (pd.configuration->>'timeLimitMinutes')::integer,
        (pd.configuration->>'time_limit_minutes')::integer
      ),
      'passing_threshold', coalesce(
        (pd.configuration->>'passThreshold')::integer,
        (pd.configuration->>'passing_threshold')::integer,
        60
      ),
      'questions', coalesce(pd.questions, '[]'::jsonb),
      'is_submitted', case when pd.submission_time is not null then true else false end,
      'retakes_allowed', coalesce(
        (pd.configuration->>'retakesAllowed')::boolean,
        (pd.configuration->>'retakes_allowed')::boolean,
        false
      )
    ),
    'in_progress_attempt', case 
      when pd.submission_time is null and pd.started_at is not null then
        jsonb_build_object(
          'saved_answers', coalesce(pd.saved_answers, '{}'::jsonb),
          'start_time', pd.started_at,
          'remaining_time_seconds', pd.remaining_time_seconds,
          'timer_paused', pd.timer_paused
        )
      else null
    end,
    'submission_details', case 
      when pd.submission_time is not null then
        jsonb_build_object(
          'submitted_at', pd.submission_time,
          'passed', pd.submission_passed
        )
      else null
    end,
    'access_verified', true,
    'generated_at', extract(epoch from now()) * 1000
  ) into result
  from progress_data pd;

  -- Return error if no access or module not found
  if result is null then
    return jsonb_build_object(
      'error', true,
      'message', 'Assessment not found or access denied',
      'module_id', p_module_id,
      'student_id', p_student_id,
      'generated_at', extract(epoch from now()) * 1000
    );
  end if;

  return result;

exception
  when others then
    -- Log error and return error response
    raise log 'Error in get_assessment_details_with_progress for student %, module %: %', 
              p_student_id, p_module_id, sqlerrm;
    return jsonb_build_object(
      'error', true,
      'message', sqlerrm,
      'module_id', p_module_id,
      'student_id', p_student_id,
      'generated_at', extract(epoch from now()) * 1000
    );
end;
$$; 