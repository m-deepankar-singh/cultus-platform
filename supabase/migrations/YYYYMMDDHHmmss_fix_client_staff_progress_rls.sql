-- Migration: Fix Client Staff RLS SELECT policies for progress tables
-- Description: Drops the incorrect SELECT policies and creates corrected policies
--              for Client Staff on student_module_progress and assessment_progress,
--              correctly checking the student's client association via the 'students' table.
-- Affected Tables: public.student_module_progress, public.assessment_progress

-- == student_module_progress ==

-- Drop the incorrect policy (use the exact name from pg_policies)
drop policy if exists "Client Staff: SELECT module progress for their client's student" on public.student_module_progress;

-- Create the corrected SELECT policy for Client Staff
create policy "Client Staff: Select progress for students in their client" 
on public.student_module_progress for select to authenticated 
using (
  exists (
    -- Check 1: Is the current user a Client Staff in the profiles table?
    select 1
    from public.profiles staff_profile
    where staff_profile.id = auth.uid()
    and staff_profile.role = 'Client Staff'
    -- Check 2: Does the student_id on this progress row belong to a student 
    --          whose client_id matches the staff member's client_id?
    and exists (
      select 1
      from public.students student_record
      where student_record.id = student_module_progress.student_id
      and student_record.client_id = staff_profile.client_id -- Compare student's client_id to staff's client_id
    )
  )
);

-- == assessment_progress ==

-- Drop the incorrect policy (use the exact name from pg_policies, note potential truncation)
drop policy if exists "Client Staff: SELECT assessment progress for their client's stu" on public.assessment_progress;

-- Create the corrected SELECT policy for Client Staff
create policy "Client Staff: Select progress for students in their client" 
on public.assessment_progress for select to authenticated 
using (
  exists (
    -- Check 1: Is the current user a Client Staff in the profiles table?
    select 1
    from public.profiles staff_profile
    where staff_profile.id = auth.uid()
    and staff_profile.role = 'Client Staff'
    -- Check 2: Does the student_id on this progress row belong to a student 
    --          whose client_id matches the staff member's client_id?
    and exists (
      select 1
      from public.students student_record
      where student_record.id = assessment_progress.student_id
      and student_record.client_id = staff_profile.client_id -- Compare student's client_id to staff's client_id
    )
  )
); 