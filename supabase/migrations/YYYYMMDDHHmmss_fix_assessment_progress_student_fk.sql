-- Migration: Fix assessment_progress student foreign key
-- Description: Drops the incorrect FK constraint linking assessment_progress.student_id to public.profiles
--              and creates a new FK constraint linking it correctly to auth.users.
-- Affected Tables: public.assessment_progress

-- Drop the incorrect foreign key constraint
-- This constraint incorrectly linked student progress to the profiles table,
-- while student identity for the main app is managed via the students table, which links to auth.users.
alter table public.assessment_progress
drop constraint if exists assessment_progress_student_id_fkey;

-- Add the correct foreign key constraint
-- This constraint correctly links student progress records to the central user identity table.
alter table public.assessment_progress
add constraint assessment_progress_student_id_fkey
foreign key (student_id)
references auth.users (id)
on delete cascade; 