# Job Readiness Product & Promotion Exam: Implementation Plan

## Overview
This plan outlines the development steps to integrate the new AI-centric "Job Readiness" product, including its 5-star system, difficulty tiers, AI-generated content (quizzes, projects, interview questions), expert sessions (pre-recorded videos from industry leaders), and optional Promotion Exams, into the existing Upskilling Platform. The Job Readiness product will be a distinct offering, leveraging existing assessment and course modules (the latter enhanced with AI quizzes) and incorporating new modules for AI-driven projects, expert session tracking, and AI-simulated interviews. Learners will progress through these modules sequentially, with each module unlocking upon completion of the previous one and attainment of the corresponding star. The focus is on changes to the Admin Panel and the Main (Student) App, while ensuring minimal disruption to the current architecture.

## 1. Project Setup & Configuration (Minimal - Leveraging Existing)
- [ ] Review existing project setup (database, repositories, CI/CD) for any minor adjustments needed for new AI service integrations or new data models. *(User to verify; AI can assist with specific file reviews if requested)*
- [x] Environment variable setup for new AI API keys and service endpoints. *(User to add GOOGLE_API_KEY for Google Gemini Flash 2.0 to .env or secrets manager)*
- [x] Set up new folder structure for Job Readiness-specific components within the existing project.
  - [x] `app/(app)/app/job-readiness` *(Created)*
  - [x] `app/(dashboard)/admin/job-readiness` *(Created)*
  - [x] `app/api/app/job-readiness` *(Created)*
  - [x] `app/api/admin/job-readiness` *(Created)*
  - [x] `lib/ai` *(Created)*
  - [x] `components/job-readiness` *(Created)*

## 2. Backend Development (API Endpoints, Controllers, Models, Services)

### 2.1. Core Job Readiness Database Schema
   - **Existing Tables to Leverage:**
     - [x] `products`: Use existing table with:
       - Add a `type` field value to identify Job Readiness products
       - Use products to represent the top-level Job Readiness offering
     - [x] `modules`: Use existing table for all the components of Job Readiness:
       - Add new module types in addition to existing 'course' and 'assessment' types:
         - `project`: For AI-generated real-world projects
           - Projects are background-specific:
             - Computer Science backgrounds: Code-based projects requiring GitHub repository submissions
             - All other backgrounds (Economics, Marketing, etc.): Text-based case studies with text answers
         - `interview`: For simulated interview sessions
         - `expert_session`: For tracking expert sessions
       - Use the `configuration` JSONB field to store module-specific settings:
         - For existing `course` modules: Add optional AI quiz configuration
           - `enable_ai_quizzes`: Boolean flag to enable/disable AI-generated quizzes
           - `ai_quiz_prompt_template`: Template for generating quiz questions from video content
           - `ai_quiz_question_count`: Number of questions to generate per video
           - `ai_quiz_passing_score`: Required score to consider the quiz passed
           - `tier_based_difficulty`: Boolean flag to use tier-specific quiz templates
         - For `project` modules: AI prompt templates, grading criteria
         - For `interview` modules: Question templates, time limits, grading criteria
         - For `expert_session` modules: Session types, completion requirements
       - Assessment modules (for the initial tier determination)
       - Course modules (leveraging existing structure, but enhanced with AI quizzes)
     - [x] `student_product_assignments`: Use existing enrollment mechanism to assign students to Job Readiness products
     - [x] `student_module_progress`: Use existing progress tracking for all Job Readiness modules
       - [x] Enhance the existing `progress_details` JSONB field to store Job Readiness specific progress:
         - For course modules: Quiz attempts, video watch progress, quiz scores
         - For project modules: Draft submissions, feedback history
         - For interview modules: Practice attempts, completion status
         - For expert session modules: Session attendance tracking
       - [x] Ensure progress is saved automatically at key interaction points
       - [x] Implement resume functionality to allow students to continue from where they left off
     - [x] `assessment_progress` and `assessment_submissions`: Use for initial assessment tier determination
     - [x] `students`: Extend with Job Readiness-specific fields:
       - `job_readiness_star_level`: Enum (ONE, TWO, THREE, FOUR, FIVE)
       - `job_readiness_tier`: Enum (BRONZE, SILVER, GOLD)
       - `job_readiness_last_updated`: Timestamp for tracking progress updates
       - `job_readiness_background_type`: Student's academic background
       - `job_readiness_promotion_eligible`: Boolean flag for promotion exam eligibility
       - These fields will only be populated for students enrolled in Job Readiness products

   - **New Tables to Create:**
     - [x] `job_readiness_products`: 
       - Extension of the products table with a reference to `products.id`
       - Fields for Job Readiness configuration (5-star criteria, difficulty tiers, etc.)
     - [x] `job_readiness_background_project_types`:
       - Configuration for which project types correspond to which backgrounds
       - Fields for background_type, project_type, project_description_template, grading_criteria
       - Fields for system_prompt and input_prompt for each tier (Bronze, Silver, Gold)
     - [x] `job_readiness_background_interview_types`:
       - Configuration for interview question types based on student backgrounds
       - Fields for background_type, interview_focus_area, question_quantity
       - Fields for system_prompt and input_prompt for each tier (Bronze, Silver, Gold)
       - Fields for video_time_limit, grading_criteria
     - [x] `job_readiness_promotion_exam_config`:
       - Configuration for Promotion Exams
       - Fields for product_id, is_enabled, question_count, pass_threshold, etc.
     - [x] `job_readiness_promotion_exam_attempts`:
       - Log of student attempts at Promotion Exams
       - Fields for student_id, product_id, star_level (2 or 3), current_tier, target_tier, timestamp, score, passed
     - [x] `job_readiness_ai_project_submissions`:
       - Student submissions for real-world projects
       - Fields for student_id, product_id, background_type, project_type, submission_content, submission_url, score, timestamp, passed
       - submission_content: Used for text-based submissions (case studies, etc.)
       - submission_url: Used primarily for Computer Science projects (GitHub repository URLs)
     - [x] `job_readiness_ai_interview_submissions`:
       - Student video interview submissions
       - Fields for student_id, product_id, video_storage_path, score, timestamp, passed
     - [x] `job_readiness_expert_sessions`:
       - Master table for available Expert Session videos
       - Fields for id, product_id, title, description, video_url, video_duration, created_at, is_active
       - Videos are pre-recorded from industry leaders (approx. 45min-1hr long)
       - Content is the same for all difficulty tiers (Bronze, Silver, Gold)
       - All uploaded Expert Session videos are available to all students at all times
     - [x] `job_readiness_expert_session_progress`:
       - Student progress tracking for Expert Session videos
       - Fields for student_id, expert_session_id, watch_time_seconds, completion_percentage, is_completed, completed_at
       - Session marked as completed when student watches 95% of video duration
       - Students must complete any 5 distinct sessions to earn the 3rd star (if more than 5 videos exist, student can choose which ones to watch)
     - [x] `job_readiness_course_quiz_templates`:
       - Configuration for tier-based quiz difficulty
       - Fields for course_module_id, tier (Bronze, Silver, Gold)
       - Fields for tier-specific quiz_prompt_template, question_count, passing_score
       - Allows for different quiz content/difficulty based on student's current tier
     - [x] `job_readiness_course_quiz_attempts`:
       - Tracks student quiz attempts with tier context
       - Fields for student_id, course_module_id, tier_used
       - Fields for storing quiz questions, answers, scores
       - Enables analysis of student performance across different difficulty tiers
   
   - **Enums to Add:**
     - [x] `job_readiness_difficulty_tier`: BRONZE, SILVER, GOLD
     - [x] `job_readiness_star_level`: ONE, TWO, THREE, FOUR, FIVE
     - [x] `student_background_type`: ECONOMICS, COMPUTER_SCIENCE, MARKETING, DESIGN, HUMANITIES, etc.
     - [x] `job_readiness_project_type`: CASE_STUDY, CODING_PROJECT, MARKETING_PLAN, DESIGN_CONCEPT, RESEARCH_OUTLINE, etc.

   - **Update to enum_types.md:**
     - [x] Add `module_type` values:
       - `project`: AI-generated real-world projects
       - `interview`: Simulated interview sessions  
       - `expert_session`: Expert-led training sessions

### 2.2. Job Readiness API Structure
   - **Create New API Route Groups:**
     - [x] `/api/admin/job-readiness/` - Admin configuration endpoints
     - [x] `/api/app/job-readiness/` - Student-facing endpoints
     - [x] `/api/client-staff/job-readiness/` - Client Staff view endpoints
   
   - **Admin Panel API Endpoints:**
     - [x] `/api/admin/job-readiness/products` - CRUD for Job Readiness product configuration
     - [x] `/api/admin/job-readiness/backgrounds` - Manage student background types and project mappings
     - [x] `/api/admin/job-readiness/promotion-exams` - Configure Promotion Exam settings
     - [x] `/api/admin/job-readiness/expert-sessions` - CRUD for Expert Session video management (upload, title, description)
       - GET - List all expert sessions with upload/management interface
       - POST - Upload new expert session video with title and description
       - PUT/PATCH - Update expert session details (title, description, activate/deactivate)
       - DELETE - Remove expert session (soft delete)
     - [x] `/api/admin/job-readiness/progress` - View student progress across Job Readiness products
     - [x] `/api/admin/job-readiness/progress/export` - Export detailed progress data
     - [x] `/api/admin/job-readiness/students/{studentId}/override-progress` - PATCH endpoint to allow admins to manually update a student's `job_readiness_star_level` and `job_readiness_tier`.
       - [x] Log all manual overrides for auditing.
     - [x] `/api/admin/job-readiness/interviews/{submissionId}/manual-review` - PATCH endpoint for admins to manually approve/reject an interview submission.
       - [x] Accepts `status` ('Approved'/'Rejected') and `admin_feedback`.
       - [x] Updates the `job_readiness_ai_interview_submissions` record.
       - [x] Logs the manual review action for auditing.

   - **Student App API Endpoints:**
     - [x] `/api/app/job-readiness/products` - Get assigned Job Readiness products and progress. 
       - Response should indicate module lock/unlock status based on student's current star level and progress.
     - [x] `/api/app/job-readiness/assessments` - Interact with initial tier-determining assessments (unlocks Star 1 and Courses module).
     - [x] `/api/app/job-readiness/courses` - Get courses with AI-generated quizzes (unlocks Star 2, Expert Sessions module, and optionally Promotion Exam).
     - [x] `/api/app/job-readiness/expert-sessions` - Get available expert sessions and track completion progress (unlocks Star 3, Projects module, and optionally Promotion Exam)
       - GET - List all available Expert Session videos with student's progress for each
       - POST /watch-progress - Update student's watch progress for a specific expert session video
       - Automatically marks session as complete when 95% watch threshold is reached
       - Returns completion count towards the required 5 sessions for 3rd star
     - [x] `/api/app/job-readiness/projects/generate` - Get AI-generated project based on background and tier.
     - [x] `/api/app/job-readiness/projects/submit` - Submit completed project (unlocks Star 4, Interview module, and optionally Promotion Exam).
     - [x] `/api/app/job-readiness/interviews/questions` - Get AI-generated interview questions.
     - [x] `/api/app/job-readiness/interviews/submit` - Submit recorded interview video (unlocks Star 5).
     - [x] `/api/app/job-readiness/promotion-exam/eligibility` - Check eligibility for promotion exam (available after Star 2 & Star 3, if not already passed for the current tier jump).
     - [x] `/api/app/job-readiness/promotion-exam/start` - Start a promotion exam.
     - [x] `/api/app/job-readiness/promotion-exam/submit` - Submit promotion exam answers.
   
   - **Viewer/Client Staff API Endpoints:**
     - [x] `/api/client-staff/job-readiness/progress` - View student progress for their client
     - [x] `/api/client-staff/job-readiness/progress/export` - Export progress for their client
     - [ ] `/api/viewer/job-readiness/analytics` - View aggregated analytics across all clients

   - **Module Locking Implementation:**
     - [x] Implement middleware for all Job Readiness API endpoints to enforce module access restrictions.
     - [x] Create a utility function `checkModuleAccess(studentId, moduleType)` that:
       - Checks student's current `job_readiness_star_level` and `job_readiness_tier` from the `students` table (which may have been manually overridden by an admin).
       - Determines if the requested module is accessible based on this current progress status according to the defined sequential unlocking logic.
       - Returns appropriate error messages for locked modules.
     - [x] Ensure all API endpoints validate module access before processing requests.
     - [x] Add database triggers/constraints to prevent direct data manipulation that would bypass access rules (this is a safeguard, primary logic in API).
     - [x] If an admin manually updates a student's star/tier, the frontend should refresh the student's view, and subsequent calls to `checkModuleAccess` will reflect the new status, potentially unlocking modules.

### 2.3. AI Services Integration
   - **Create New Service Modules:**
     - [x] `lib/ai/quiz-generator.js` - Service to generate quizzes from video content
       - Specific model to use: Google Gemini Flash 2.0
       - Integrates with existing course module structure
       - Only generates quizzes for courses where `enable_ai_quizzes` is true
       - **Fallback mechanism:** 
         - [x] Integration with Question Bank system via lesson_question_bank_mappings table
         - [x] API endpoints for admins to map Question Bank questions to specific lessons
         - [x] Automatic fallback to mapped questions when AI generation fails
         - [x] Priority order: 1) AI-generated questions, 2) Lesson-specific Question Bank questions
         - [ ] Pre-generate and store a set of generic quizzes per course (as final fallback)
         - [ ] Add monitoring to alert administrators of AI generation failures
     - [x] `lib/ai/project-generator.js` - Service to generate projects based on background and tier
       - Specific model to use: Google Gemini Flash 2.0
       - **Background-specific project generation:**
         - [x] For Computer Science: Generate coding projects requiring GitHub submissions
         - [x] For other backgrounds: Generate text-based case studies with clear requirements
         - [x] Uses admin-configured system prompts and input prompts from the `job_readiness_background_project_types` table
       - **Fallback mechanism:**
         - [x] Maintain a bank of pre-written projects for each background/tier combination
         - [x] Automatically serve fallback projects if AI generation fails
     - [x] `lib/ai/project-grader.js` - Service to grade submitted projects
       - **Background-specific grading:**
         - [x] For Computer Science: Evaluate GitHub repositories (potentially checking for specific functionality)
         - [x] For other backgrounds: Grade text-based case study responses
     - [x] `lib/ai/interview-question-generator.js` - Service to generate interview questions
       - Specific model to use: Google Gemini Flash 2.0
       - **Background-specific interview generation:**
         - [x] Generates different question types based on student's background
         - [x] Uses admin-configured system prompts and input prompts from the `job_readiness_background_interview_types` table
         - [x] Adapts difficulty based on student's current tier (Bronze, Silver, Gold)
     - [x] `lib/ai/video-analyzer.js` - Service to analyze interview videos
       - **Background-specific analysis:**
         - [x] Uses different evaluation criteria based on student's background
         - [x] Considers background-specific communication styles and expectations
       - **Enhanced robustness:**
         - [x] Implement multiple retry attempts with different prompt strategies
         - [x] Add comprehensive error handling and logging
         - [x] Include connection health checks before initiating student interviews
     - [x] `lib/ai/exam-generator.js` - Service to generate promotion exam questions

   - **AI Error Handling and Fallbacks:**
     - [x] Implement retry logic for AI service calls
     - [x] Create fallback content if AI services are temporarily unavailable
     - [x] Log and monitor AI service usage and performance

## 3. Frontend Development (UI Components, Pages, Features)

### 3.1. Admin Panel Frontend
   - **New Admin Routes:**
     - [ ] `/admin/job-readiness/products` - Job Readiness product management
     - [ ] `/admin/job-readiness/backgrounds` - Background types and project mapping
   - **Product Management UI:**
     - [ ] Add a checkbox/selector when creating/editing a Product to designate it as "Job Readiness" type.
   - **New "Job Readiness Configuration" Section:**
     - [ ] UI for configuring 5-star criteria.
     - [ ] UI for setting assessment score ranges for Bronze, Silver, Gold tiers.
     - [ ] UI for managing AI quiz settings within Job Readiness courses.
       - [ ] Form to enable/disable AI quizzes for courses.
       - [ ] Form to enable/disable tier-based difficulty for quizzes.
       - [ ] Form to configure quiz templates for each tier (Bronze, Silver, Gold).
       - [x] **Integration with Question Banks:**
         - [x] UI to map Question Bank questions to specific lessons as fallback for AI generation
         - [x] Interface to select multiple questions from Question Banks and associate them with a lesson
         - [x] Option to mark certain questions as "required" (always included) vs "fallback" (used only when AI fails)
         - [ ] Preview functionality to see how the fallback questions will appear to students
     - [ ] UI for defining student backgrounds and corresponding AI Real-World Project types/prompts/grading.
       - [ ] Form to input background name (e.g., "Economics").
       - [ ] Form to select project type (e.g., "Case Study", "Coding Project").
       - [ ] Form to input AI generation prompts/parameters for that background/project type.
         - [ ] System prompt configuration: Sets the context and overall instructions for the AI model.
         - [ ] Input prompt configuration: Template for the specific project request that will be sent to the AI.
         - [ ] Separate configurations for Bronze, Silver, and Gold tier versions of each project.
         - [ ] Preview functionality to see sample generated projects before saving.
       - [ ] Form for AI grading criteria for that project type.
     - [ ] UI for configuring AI-powered Submissions (timer, AI analysis criteria).
       - [ ] Background-specific interview configuration:
         - [ ] System prompt configuration for interview question generation
         - [ ] Input prompt templates for different question types
         - [ ] Separate configurations for Bronze, Silver, and Gold tier interviews
         - [ ] Interview duration settings (default: 4 minutes)
         - [ ] Preview functionality to see sample generated interview questions
         - [ ] Grading criteria configuration for video response analysis
     - [ ] UI for configuring Promotion Exams (enable/disable, number of questions, pass/fail criteria).
     - [x] UI for Expert Session video management:
       - [x] Interface to upload Expert Session videos (approx. 45min-1hr long)
       - [x] Form fields for title and description
       - [x] List view of all uploaded Expert Sessions with edit/delete capabilities
       - [x] Video preview functionality
       - [x] Activate/deactivate sessions without permanent deletion
       - [x] View statistics on session completion rates across students
   - **Learner Progress View (Enhancements for Job Readiness):**
     - [ ] Enhance existing progress views or create a new Job Readiness specific student management interface.
     - [ ] Display Job Readiness data (stars, tier, component status) for Client Staff and Admin roles.
     - [ ] Add editable fields for admins to directly modify a student's `job_readiness_star_level` and `job_readiness_tier`.
       - [ ] Include clear warnings about the implications of manual overrides on automated module unlocking.
     - [ ] In the interview submissions list/details view, provide buttons for admins to "Manually Approve" or "Manually Reject" a submission.
       - [ ] This should call the new `/api/admin/job-readiness/interviews/{submissionId}/manual-review` endpoint.
       - [ ] Allow admin to add a comment for their decision.
       - [ ] Clearly display if a submission was AI-graded or manually reviewed.
     - [ ] Ensure export function includes new fields.

### 3.2. Student App Frontend
   - **New Student Routes:**
     - [ ] `/app/job-readiness` - Main Job Readiness dashboard (shows overall progress and current/next module).
     - [ ] `/app/job-readiness/assessments` - Initial assessments (module type `assessment`).
     - [ ] `/app/job-readiness/courses` - Courses with AI quizzes (module type `course`).
     - [ ] `/app/job-readiness/projects` - AI-generated projects interface (for module type `project`).
     - [ ] `/app/job-readiness/interviews` - Simulated interview interface (for module type `interview`).
     - [x] `/app/job-readiness/expert-sessions` - Expert sessions tracking (for module type `expert_session`).
     - [ ] `/app/job-readiness/promotion-exam` - Promotion exam interface.
   
   - **New "Job Readiness" Tab & UI:**
     - [ ] Create a distinct top-level tab/navigation item for "Job Readiness".
     - [ ] Design a unique, engaging UI for this section, different from the standard product/module view.
     - [ ] Prominent visual display of the 5-star progress system (e.g., 5 actual stars that fill up).
     - [ ] Display current star color (Bronze, Silver, Gold) based on tier.
     - [ ] Clearly indicate locked and unlocked modules. Locked modules should be visible but not interactive, possibly with a message about prerequisites.
   - **Standard Assessments (Existing UI, New Context):**
     - [ ] Integrate the 5 standard assessments as the first step in Job Readiness. This module is unlocked by default for enrolled students.
     - [ ] After completion, display the achieved tier (Bronze, Silver, Gold) and update star color. This awards the 1st star.
     - [ ] On completion, the "Courses" module unlocks.
     - [ ] Use existing assessment module type with custom configuration for tier determination.
   - **Courses with AI-Generated Quizzes UI:**
     - [ ] This module is locked until Star 1 (Assessments completion).
     - [ ] Leverage existing course video player UI.
     - [ ] Develop UI for AI-generated quizzes, ensuring it clearly indicates AI generation.
     - [ ] Implement tier-appropriate quiz experience:
       - [ ] Display quiz difficulty level based on student's current tier (Bronze/Silver/Gold)
       - [ ] Adapt question complexity based on tier (using the tier-specific quiz templates)
       - [ ] Provide tier-appropriate feedback on quiz results
     - [ ] Use existing course module type with enhanced configuration for AI quizzes.
       - [ ] Add option in the Admin UI to enable/disable AI quizzes for specific courses.
       - [ ] Add option to enable/disable tier-based difficulty for quizzes.
       - [ ] Maintain all existing course functionality while adding AI quiz capability.
       - [ ] Only display AI quiz UI for courses where it's enabled.
     - [ ] On completion, award the 2nd star. The "Expert Sessions" module unlocks.
     - [ ] After Star 2 is achieved, if eligible, present the Promotion Exam as an *optional* step to upgrade tier.
   - **Promotion Exam UI:**
     - [ ] This is not a standard module in the sequence but an optional path.
     - [ ] Modal/Notification to offer Promotion Exam after 2nd star completion (and again after 3rd star if a further tier upgrade is possible and exam not yet passed for that jump).
       - [ ] Clearly state it's a one-time attempt per star-level opportunity and its purpose (tier upgrade).
       - [ ] Buttons to "Start Exam" or "Skip". Skipping does not prevent progression to the next content module.
     - [ ] Exam interface to display 25 AI-generated questions.
     - [ ] Submission and immediate feedback (pass/fail).
     - [ ] Visual update of star color/tier if promoted.
   - **Expert Sessions UI:**
     - [x] This module is locked until Star 2 (Courses completion).
     - [x] Interface to display list of all available Expert Session videos with student's progress for each
     - [x] Video player for watching Expert Session videos (similar to course videos)
     - [x] Progress tracking that automatically marks session as complete when 95% watch threshold is reached
     - [x] Progress display showing "X of 5 sessions completed" towards 3rd star requirement
     - [x] Students can choose any 5 sessions to watch from all available videos
     - [x] Clear indication of which sessions have been completed
     - [x] Integrate with the new `expert_session` module type
     - [x] On completion of 5 sessions, award the 3rd star. The "Projects" module unlocks.
     - [x] After Star 3 is achieved, if eligible, present the Promotion Exam as an *optional* step to upgrade tier.
   - **AI-Generated Real-World Project UI:**
     - [ ] This module is locked until Star 3 (Expert Sessions completion).
     - [ ] Page to display the AI-generated project description.
       - [ ] Emphasize that it might change on refresh if not yet started/submitted.
     - [ ] Input mechanism for submission that adapts based on student background:
       - [ ] For Computer Science students: Form field to submit GitHub repository URL
       - [ ] For all other backgrounds: Rich text editor for submitting text-based case study answers
     - [ ] Display AI grading results/feedback.
     - [ ] UI to allow retries if failed.
     - [ ] Integrate with the new `project` module type.
     - [ ] On passing, award the 4th star. The "Submissions (Simulated Interview)" module unlocks.
     - [ ] After Star 4 is achieved, if eligible, present the Promotion Exam as an *optional* step.
   - **AI-Powered Submission (Simulated Interview) UI:**
     - [ ] This module is locked until Star 4 (Projects completion).
     - [ ] Interface to initiate the simulated interview.
     - [ ] **Detailed Frontend Component (`components/job-readiness/interview-recorder.tsx`):**
       - [ ] **Display Interview Questions:**
         - [ ] Fetch questions generated by `lib/ai/interview-question-generator.js` via the `questions/route.ts` endpoint. Questions should be tailored to the student's background (e.g., Computer Science vs Economics) and current tier.
         - [ ] Emphasize that questions might change on refresh if not yet started/cached for the session.
       - [ ] **Webcam Access and Recording:**
         - [ ] Request microphone and camera permissions.
         - [ ] Use `MediaRecorder` API to capture video and audio.
         - [ ] Output format: WebM (`video/webm; codecs=vp9,opus` or similar).
       - [ ] **Recording Timer:**
         - [ ] Implement a 5-minute countdown timer (replaces previous 4-minute default).
         - [ ] Display remaining time to the student.
         - [ ] On timer end, automatically finalize the recording and trigger the submission process.
       - [ ] **Manual Submission:**
         - [ ] Allow student to click a "Submit" button before timer ends to finalize and submit.
       - [ ] **Video Processing (Client-side attempt):**
         - [ ] Before upload, check video duration (max 5 minutes).
         - [ ] Attempt client-side compression if feasible, or ensure recording settings aim for <20MB. This is a best-effort; primary validation is server-side.
       - [ ] **Upload to API:**
         - [ ] On submit (manual or auto), send the WebM video blob to `app/api/app/job-readiness/interviews/submit/route.ts`.
     - [ ] Display AI analysis feedback (pass/fail, and detailed feedback from AI).
     - [ ] UI to allow retries if failed (subject to rules, e.g., limited attempts).
     - [ ] Integrate with the new `interview` module type.
     - [ ] On passing, award the 5th star. Job Readiness product considered complete at this star level.
   - **General UI Elements for Job Readiness:**
     - [ ] Clear instructions for all AI-powered components.
     - [ ] Consistent display of progress towards each star.
     - [ ] Responsive design for mobile and desktop.

## 4. Database Migration Strategy

### 4.1. Migration Approach
   - [ ] Create separate migrations for Job Readiness tables to keep them isolated from core functionality
   - [ ] Create migration to extend the students table with Job Readiness fields
   - [ ] Add the new module types to accommodate the Job Readiness components 
   - [ ] Use foreign key references to link to existing tables (products, students) rather than extending them directly
   - [ ] Version migrations properly to ensure rollback capability
   - [ ] Test migrations thoroughly in development and staging environments before production deployment

### 4.2. Data Migration (if needed)
   - [ ] Plan for migration of any existing data if Job Readiness is replacing an existing feature
   - [ ] Create data validation scripts to ensure integrity before and after migration
   - [ ] Maintain backup points during migration process

## 5. Integration with Existing System

### 5.1. Leveraging Existing Components
   - [ ] Use existing authentication and role-based access control
   - [ ] Utilize existing student enrollment and client-product assignment logic
     - When a student is enrolled in a client, they should also get access to any Job Readiness products assigned to that client
   - [ ] Leverage existing assessment module for the initial 5 assessments, but track results separately for Job Readiness tier determination
   - [ ] Use existing course module for video content delivery, but extend with AI quiz generation
   - [ ] Reuse UI components where appropriate (dashboard layouts, navigation, assessment interfaces)

### 5.2. Minimal Changes to Existing Code
   - [ ] Add a product type enum value for "JOB_READINESS" to distinguish these products
   - [ ] Add navigation links to Job Readiness sections in the main navigation bars
   - [ ] Add Job Readiness progress to relevant dashboards and exports
   - [ ] No modifications to core assessment or course functionality needed - they remain independent

### 5.3. Ensuring System Compatibility
   - [ ] Ensure database query performance is not impacted by new tables
   - [ ] Optimize AI service calls to minimize impact on system responsiveness
   - [ ] Implement proper error boundaries to prevent Job Readiness errors from affecting core platform functionality
   - [ ] Apply consistent styling and UX patterns to maintain platform cohesion

## 6. Testing Strategy

### 6.1. End-to-end Testing
   - [ ] Test all API endpoints and UI components for functionality and error handling
   - [ ] Verify data integrity and consistency across all Job Readiness features
   - [ ] Test integration with existing system components

### 6.2. Performance Testing
   - [ ] Test API response times and database performance
   - [ ] Verify system scalability and load handling

### 6.3. Security Testing
   - [ ] Test secure handling of API keys and data
   - [ ] Verify data isolation and access control

## 7. Deployment Strategy
   - [ ] Feature flagging to enable gradual rollout or quick disabling if issues arise
   - [ ] Database migrations deployed separately from code changes
   - [ ] Staged deployment: first to development, then staging, then production
   - [ ] Monitoring plan for API endpoints, database performance, and AI service reliability
   - [ ] Rollback plan in case of critical issues

## 8. Documentation Updates
   - [ ] Create new database schema documentation for Job Readiness tables
   - [ ] Update API documentation to include new endpoints
   - [ ] Create admin guide for Job Readiness configuration
   - [ ] Create student guide for Job Readiness features
   - [ ] Document AI service integration points and configuration options

## 9. Job Readiness Analytics

### 9.1. Student Performance Metrics
   - [ ] Implement specialized analytics dashboard for Job Readiness
   - [ ] Track key metrics:
     - [ ] Star acquisition rates (time taken to achieve each star)
     - [ ] Tier distribution (percentage of students in Bronze/Silver/Gold)
     - [ ] Module completion rates
     - [ ] Promotion exam attempt/success rates
     - [ ] Project submission quality metrics
     - [ ] Interview performance metrics
   - [ ] Create cohort comparison views to benchmark student groups

### 9.2. Product Effectiveness Analysis
   - [ ] Develop tools to evaluate the effectiveness of each module:
     - [ ] Quiz effectiveness (correlation between quiz performance and overall success)
     - [ ] Project relevance (student feedback and completion rates)
     - [ ] AI-generated content quality assessment
   - [ ] Implement monitoring for AI-generated component quality
   - [ ] Create dashboards for administrators and client staff

### 9.3. Export Capabilities
   - [ ] Implement detailed CSV/Excel export for all Job Readiness metrics
   - [ ] Create scheduled reporting functionality for client staff
   - [ ] Develop data visualizations for key performance indicators

This plan maintains a separation between the core platform functionality and the new Job Readiness product, minimizing risk to existing features while allowing for the complex new AI-driven capabilities. The approach uses separate tables with foreign key relationships rather than extending existing tables, creating a clean separation of concerns while still maintaining data integrity and relationships.

---

## ✅ COMPLETED: Expert Sessions Implementation

### Summary of Completed Work
The Expert Sessions feature has been **fully implemented** and is production-ready:

#### Database Schema ✅
- Created `job_readiness_expert_sessions` table with proper structure
- Created `job_readiness_expert_session_progress` table for tracking student progress
- Applied all necessary migrations using Supabase MCP tools
- Fixed RLS policies and database constraints

#### Storage Configuration ✅
- Created private `expert_session_videos` bucket with 500MB file limit
- Configured proper RLS policies for admin upload/management and student viewing
- Set up signed URL access with appropriate expiry times

#### API Implementation ✅
- **Admin API** (`/api/admin/job-readiness/expert-sessions/`):
  - GET: List all sessions with statistics
  - POST: Upload videos with metadata (title, description, product_id)
  - PATCH: Update session details
  - DELETE: Soft delete sessions
- **Student API** (`/api/app/job-readiness/expert-sessions/`):
  - GET: List available sessions with individual progress
  - POST: Track watch progress with automatic completion at 95% threshold
- **Progress Tracking** (`/api/app/job-readiness/expert-sessions/[sessionId]/watch-progress/`):
  - Real-time progress updates with upsert functionality
  - Automatic 3rd star unlock when 5 sessions completed

#### Technical Features ✅
- Private video storage with signed URL access (1-year storage, 24-hour viewing)
- 95% completion threshold for automatic session completion
- 5 completed sessions required for 3rd star unlock
- Video duration support (client-provided or estimated)
- Comprehensive error handling and validation
- RLS security policies for data access

#### TypeScript Fixes ✅
- Fixed all implicit `any[]` type errors in submissions route
- Added explicit type annotations for better type safety

### Status: PRODUCTION READY ✅
All Expert Sessions functionality is complete and tested. The feature integrates seamlessly with the existing Job Readiness progression system and is ready for deployment. 