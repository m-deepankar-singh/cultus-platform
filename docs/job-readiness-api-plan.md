# Job Readiness API Implementation Plan

This document outlines the detailed step-by-step plan for implementing the API structure for the Job Readiness product.

## 1. API Route Groups
- [x] Create new API route group: `/api/admin/job-readiness/` for Admin configuration endpoints.
- [x] Create new API route group: `/api/app/job-readiness/` for Student-facing endpoints.
- [x] Create new API route group: `/api/client-staff/job-readiness/` for Client Staff view endpoints.

## 2. Admin Panel API Endpoints
- [x] Implement `/api/admin/job-readiness/products`: CRUD operations for Job Readiness product configuration.
  - [x] Include ability to define "Course" type modules and manage their lessons.
  - [x] For each lesson within a "Course" module, provide an option to:
    - Enable/disable AI-generated quizzes (e.g., a boolean flag `enable_ai_quiz`).
    - If `enable_ai_quiz` is true, specify a "quiz generation prompt/topic" (text) for that lesson. This prompt will be used with Gemini 2.0 Flash to generate 5 questions. Passing criteria (4/5) is fixed.
- [x] Implement `/api/admin/job-readiness/backgrounds`: Manage student background types and project mappings.
- [x] Implement `/api/admin/job-readiness/promotion-exams`: Configure Promotion Exam settings.
- [ ] Implement `/api/admin/job-readiness/expert-sessions`: CRUD for Expert Session video management.
  - [ ] GET: List all expert sessions with upload/management interface
  - [ ] POST: Upload new expert session video with title and description (approx. 45min-1hr long)
  - [ ] PUT/PATCH: Update expert session details (title, description, activate/deactivate)
  - [ ] DELETE: Remove expert session (soft delete)
  - [ ] Include video upload to Supabase Storage and duration validation
- [x] Implement `/api/admin/job-readiness/progress`: View student progress across Job Readiness products.
- [x] Implement `/api/admin/job-readiness/progress/export`: Export detailed progress data.
- [x] Implement `/api/admin/job-readiness/students/{studentId}/override-progress`: PATCH endpoint to allow admins to manually update a student's `job_readiness_star_level` and `job_readiness_tier`.
  - [x] Ensure all manual overrides are logged for auditing purposes.
- [x] Implement `/api/admin/modules/[moduleId]/lessons/[lessonId]/question-bank-mapping`: Admin endpoint to map existing assessment questions to lessons as fallback for AI-generated quizzes.

## 3. Student App API Endpoints
- [x] Implement `/api/app/job-readiness/products`: Get assigned Job Readiness products and progress.
  - [x] Ensure response indicates module lock/unlock status based on student's current star level and progress.
- [x] Implement `/api/app/job-readiness/assessments`: Interact with initial tier-determining assessments (unlocks Star 1 and Courses module).
- [x] Implement `/api/app/job-readiness/courses`:
  - [x] `GET /api/app/job-readiness/courses?productId=XYZ`: List available "Course" type modules for the student within the specified Job Readiness product.
    - [x] Automatically creates job_readiness_product entry if it doesn't exist using a SECURITY DEFINER function.
    - [x] Properly extracts course descriptions from module configuration JSON.
- [x] Implement `GET /api/app/job-readiness/courses/{moduleId}/content`: Fetch detailed content for a specific Job Readiness course module.
  - [x] Response to include:
    - Course module details (name, description from configuration).
    - List of lessons (title, video URL, sequence, etc.).
    - For each lesson with `enable_ai_quiz = true`:
        - Backend uses the lesson's configured prompt to call Gemini 2.0 Flash for 5 structured JSON quiz questions (question_text, options, correct_option_id).
        - If AI generation fails, falls back to mapped assessment questions from the question bank.
        - Full quiz (questions + correct answers) is temporarily cached/managed server-side for the student's attempt.
        - Client receives only quiz questions and options (no correct answers).
    - Student's progress for the course module (last viewed/completed lesson, video progress, quiz attempts/scores per lesson).
- [x] Implement `POST /api/app/job-readiness/courses/{moduleId}/lessons/{lessonId}/submit-quiz`: Submit answers for an AI-generated lesson quiz.
  - [x] Request body: `{ "answers": [{"question_id": "...", "selected_option_id": "..."}] }` (example).
  - [x] Backend retrieves cached/managed full quiz (with correct answers) for the student's attempt.
  - [x] Supports both MCQ (single answer) and MSQ (multiple answers) question types.
  - [x] Grades submission (4/5 correct = pass).
  - [x] Updates student's lesson progress in DB: `lesson_quiz_completed: true`, `lesson_quiz_passed: boolean`, `lesson_quiz_score: X/5`.
  - [x] Response: `{ "score": X, "passed": boolean, "correct_answers_for_review": [...] }` (correct answers optional for review).
- [x] Implement `POST /api/app/job-readiness/courses/{courseModuleId}/save-progress`: Save student's general progress within a course module.
  - [x] Request body: `{ "last_viewed_lesson_sequence": 1, "video_playback_positions": {"lessonId1": 120}, "fully_watched_video_ids": ["lessonId1"] }`.
  - [x] Updates `student_module_progress.progress_details`.
- [ ] Implement `/api/app/job-readiness/expert-sessions`: Get available expert sessions and track completion progress.
  - [ ] GET `/api/app/job-readiness/expert-sessions?productId=XYZ`: List all available Expert Session videos with student's progress for each
    - [ ] Response includes: session details (id, title, description, video_url, video_duration)
    - [ ] Student progress: watch_time_seconds, completion_percentage, is_completed for each session
    - [ ] Overall progress: completed_sessions_count towards required 5 sessions for 3rd star
  - [ ] POST `/api/app/job-readiness/expert-sessions/{sessionId}/watch-progress`: Update student's watch progress for a specific expert session video
    - [ ] Request body: `{ "current_time_seconds": 1800, "total_duration_seconds": 3600 }`
    - [ ] Calculates completion_percentage and automatically marks session as complete when 95% watch threshold is reached
    - [ ] Updates job_readiness_expert_session_progress table
    - [ ] Returns updated progress and completion status
  - [ ] Unlocks Star 3, Projects module, and optionally Promotion Exam when 5 sessions are completed
- [x] Implement `/api/app/job-readiness/projects/generate`: Get AI-generated project based on background and tier.
- [x] Implement `/api/app/job-readiness/projects/submit`: Submit completed project (unlocks Star 4, Interview module, and optionally Promotion Exam).
- [x] Implement `/api/app/job-readiness/interviews/questions`: Get AI-generated interview questions.
- [x] Implement `/api/app/job-readiness/interviews/submit`: Submit recorded interview video (unlocks Star 5).
- [x] Implement `/api/app/job-readiness/promotion-exam/eligibility`: Check eligibility for promotion exam (available after Star 2 & Star 3, if not already passed for the current tier jump).
- [x] Implement `/api/app/job-readiness/promotion-exam/start`: Start a promotion exam.
- [x] Implement `/api/app/job-readiness/promotion-exam/submit`: Submit promotion exam answers.

## 4. Viewer/Client Staff API Endpoints
- [ ] Implement `/api/client-staff/job-readiness/progress`: View student progress for their client.
- [ ] Implement `/api/client-staff/job-readiness/progress/export`: Export progress for their client.
- [ ] Implement `/api/viewer/job-readiness/analytics`: View aggregated analytics across all clients.

## 5. Module Locking Implementation
- [x] Implement middleware for all Job Readiness API endpoints to enforce module access restrictions.
- [x] Create a utility function `checkModuleAccess(studentId, moduleType)` that:
  - [x] Checks student's current `job_readiness_star_level` and `job_readiness_tier` from the `students` table (which may have been manually overridden by an admin).
  - [x] Determines if the requested module is accessible based on this current progress status according to the defined sequential unlocking logic.
  - [x] Returns appropriate error messages for locked modules.
- [x] Ensure all API endpoints validate module access before processing requests.
- [x] Add database triggers/constraints to prevent direct data manipulation that would bypass access rules (this is a safeguard, primary logic in API).
- [x] Ensure that if an admin manually updates a student's star/tier, the frontend refreshes the student's view, and subsequent calls to `checkModuleAccess` reflect the new status, potentially unlocking modules.

## 6. Database Utilities
- [x] Implement `ensure_job_readiness_product` SECURITY DEFINER function:
  - [x] Checks if a product exists and is of type JOB_READINESS
  - [x] If job_readiness_product entry doesn't exist, creates it with default tier settings
  - [x] Used by API endpoints to ensure proper configuration exists before proceeding

## 7. Quiz Fallback Mechanism
- [x] Implement a fallback system for when AI-generated quizzes fail:
  - [x] Create a `lesson_question_bank_mappings` table to link lessons with pre-existing assessment questions
  - [x] Modify content endpoint to check for fallback questions if AI generation fails
  - [x] Enhance submit-quiz endpoint to properly handle both AI-generated questions and fallback questions
  - [x] Support both MCQ (single answer) and MSQ (multiple answers) question formats 