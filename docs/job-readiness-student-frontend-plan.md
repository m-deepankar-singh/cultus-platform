# Job Readiness: Student App Frontend Implementation Plan

## Overview
This document outlines the detailed step-by-step plan for implementing the student-facing frontend for the Job Readiness product. It includes UI components, page structures, API interactions, and state management considerations. The primary goal is to create an engaging and intuitive experience for students as they progress through the Job Readiness program.

## Implementation Progress Summary

### ✅ Completed Sections:
1. **Foundational Setup & Global Components** - ✅ COMPLETE - All core infrastructure is in place
2. **Job Readiness Dashboard Page** - ✅ COMPLETE - Main dashboard with progress display and module navigation
3. **Complete Hook Foundation** - ✅ COMPLETE - All TanStack Query hooks for data fetching and mutations
4. **Module: Standard Assessments (Star 1)** - ✅ COMPLETE - Tier-determining assessments with full interface
5. **Module Grouping System** - ✅ COMPLETE - Unified display for assessment and course modules

### 🚧 Next Phase - Individual Module Implementation:
5. **Module: Courses with AI-Generated Quizzes (Star 2)** - Video content with quizzes
6. **Module: Expert Sessions (Star 3)** - Video sessions with progress tracking
7. **Module: AI-Generated Real-World Projects (Star 4)** - Background-specific projects
8. **Module: AI-Powered Simulated Interview (Star 5)** - Video interview recording
9. **Optional: Promotion Exam** - Tier advancement exams

### 📁 Files Created/Completed:
**✅ Completed:**
- `app/(app)/app/job-readiness/page.tsx` - Main dashboard page
- `components/app/app-header.tsx` - Updated with Job Readiness navigation
- `components/job-readiness/JobReadinessLayout.tsx` - Layout wrapper component
- `components/job-readiness/OverallProgressDisplay.tsx` - 5-star progress display
- `components/job-readiness/ModuleNavigation.tsx` - ✅ **UPDATED**: Now uses module grouping system
- `components/ui/StarRating.tsx` - Reusable star rating component
- `hooks/useJobReadinessProgress.ts` - Progress data hook
- `hooks/useJobReadinessProducts.ts` - Products data hook
- `hooks/useJobReadinessMutations.ts` - Action mutation hooks
- `hooks/useJobReadinessModuleGroups.ts` - ✅ **NEW**: Groups modules by type for unified display

**✅ Foundational Hooks Completed:**
- `hooks/useAssessmentList.ts` - Hook for fetching Job Readiness assessments ✅
- `hooks/useAssessmentDetails.ts` - Hook for fetching assessment details and questions ✅
- `hooks/useCourseList.ts` - Hook for fetching available courses ✅
- `hooks/useCourseContent.ts` - Hook for fetching course content and lessons ✅
- `hooks/useExpertSessions.ts` - Hook for fetching expert sessions and progress ✅
- `hooks/useProjectGeneration.ts` - Hook for generating/fetching projects ✅
- `hooks/useInterviewQuestions.ts` - Hook for fetching interview questions ✅
- `hooks/usePromotionExamEligibility.ts` - Hook for checking promotion exam eligibility ✅
- `hooks/useSubmitAssessment.ts` - Mutation hook for submitting assessments ✅
- `hooks/useStartPromotionExam.ts` - Mutation hook for starting promotion exams ✅
- `hooks/useSubmitPromotionExam.ts` - Mutation hook for submitting promotion exams ✅

**✅ Assessment Module Completed:**
- `app/(app)/app/job-readiness/assessments/page.tsx` - Assessment listing page ✅
- `app/(app)/app/job-readiness/assessments/[moduleId]/page.tsx` - Individual assessment taking page ✅
- `app/(app)/app/job-readiness/assessments/[moduleId]/results/page.tsx` - Assessment results page ✅
- `components/job-readiness/AssessmentList.tsx` - Display available assessments ✅
- `components/job-readiness/AssessmentCard.tsx` - Individual assessment card ✅
- `components/job-readiness/TierDisplay.tsx` - Show tier criteria and current tier ✅
- `components/job-readiness/AssessmentInterface.tsx` - Assessment taking interface ✅
- `components/job-readiness/AssessmentResults.tsx` - Results display with tier feedback ✅

**✅ Module Grouping System Completed:**
- **Frontend Change**: Job Readiness modules are now grouped by type (assessments, courses) instead of showing individual modules
- **Student UI**: Dashboard shows "Assessments" and "Courses" groups with aggregate progress (X/Y completed)
- **Individual Listings**: Clicking groups shows all modules of that type (multiple assessments, multiple courses)
- **API Enhancement**: Added `assessmentType` filtering to assessment endpoint for better categorization

## 1. Foundational Setup & Global Components ✅ COMPLETED

- [x] **Project Setup:**
  - [x] Ensure Next.js routing is configured for the new Job Readiness student app section.
  - [x] Path: `app/(app)/app/job-readiness/` ✅
- [x] **Main Navigation & Layout:**
  - [x] Create a distinct top-level tab/navigation item "Job Readiness" in the main student dashboard.
    - File: `components/app/app-header.tsx` ✅ (Added Job Readiness navigation with Briefcase icon)
  - [x] Design a unique and engaging layout for the Job Readiness section.
    - Component: `components/job-readiness/JobReadinessLayout.tsx` ✅ (Completed)
    - This layout wraps all Job Readiness pages and includes the 5-star progress display.
- [x] **TanStack Query Hooks & Data Management:**
  - [x] Create custom hooks for Job Readiness data fetching and caching:
    - `useJobReadinessProducts()` - Fetch and cache Job Readiness products and progress ✅
      - **API:** `GET /api/app/job-readiness/products`
    - `useJobReadinessProgress()` - Fetch and cache student's current star level and tier ✅
      - **API:** `GET /api/app/job-readiness/products` (includes progress data)
    - `useJobReadinessModuleGroups()` - ✅ **NEW**: Groups modules by type for unified display
      - **API:** `GET /api/app/job-readiness/products` (processes and groups module data)
    - [x] `useCourseContent(moduleId)` - Fetch course content and lessons ✅
      - **API:** `GET /api/app/job-readiness/courses/{moduleId}/content`
    - [x] `useExpertSessions(productId)` - Fetch expert sessions and progress ✅
      - **API:** `GET /api/app/job-readiness/expert-sessions?productId={productId}`
    - [x] `useInterviewQuestions()` - Fetch AI-generated interview questions ✅
      - **API:** `GET /api/app/job-readiness/interviews/questions`
    - [x] `usePromotionExamEligibility()` - Check promotion exam eligibility ✅
      - **API:** `GET /api/app/job-readiness/promotion-exam/eligibility`
    - [x] `useAssessmentList(productId)` - Fetch Job Readiness assessments ✅
      - **API:** `GET /api/app/job-readiness/assessments?productId={productId}&assessmentType={type}` (enhanced with filtering)
    - [x] `useAssessmentDetails(moduleId)` - Fetch assessment details and questions ✅
      - **API:** `GET /api/app/job-readiness/assessments/{moduleId}/details`
    - [x] `useCourseList(productId)` - Fetch available courses ✅
      - **API:** `GET /api/app/job-readiness/courses?productId={productId}`
    - [x] `useProjectGeneration(productId)` - Generate or fetch existing project ✅
      - **API:** `GET /api/app/job-readiness/projects/generate?productId={productId}`
  - [x] Create mutation hooks for actions:
    - `useSubmitQuiz()` - Submit lesson quiz answers ✅
      - **API:** `POST /api/app/job-readiness/courses/{moduleId}/lessons/{lessonId}/submit-quiz`
    - `useUpdateProgress()` - Update video/course progress ✅
      - **API:** `POST /api/app/job-readiness/courses/{moduleId}/save-progress`
    - `useSubmitProject()` - Submit project work ✅
      - **API:** `POST /api/app/job-readiness/projects/submit`
    - `useSubmitInterview()` - Submit interview video ✅
      - **API:** `POST /api/app/job-readiness/interviews/submit`
    - `useUpdateExpertSessionProgress()` - Update expert session watch progress ✅
      - **API:** `POST /api/app/job-readiness/expert-sessions/{sessionId}/watch-progress`
    - [x] `useSubmitAssessment()` - Submit assessment answers ✅
      - **API:** `POST /api/app/job-readiness/assessments/{moduleId}/submit`
    - [x] `useStartPromotionExam()` - Start promotion exam ✅
      - **API:** `POST /api/app/job-readiness/promotion-exam/start`
    - [x] `useSubmitPromotionExam()` - Submit promotion exam answers ✅
      - **API:** `POST /api/app/job-readiness/promotion-exam/submit`
  - [x] Configure appropriate cache times and query key strategies for efficient invalidation. ✅
- [x] **Styling and UI Kit:**
  - [x] Define a unique visual theme for Job Readiness (colors, typography, iconography) while maintaining overall platform consistency. ✅
  - [x] Develop or reuse UI components for stars, progress bars, module cards, etc.
    - Component: `components/ui/StarRating.tsx` ✅ (Completed)
    - Component: Module cards integrated into `components/job-readiness/ModuleNavigation.tsx` ✅

## 2. Job Readiness Dashboard Page ✅ COMPLETED

- [x] **Page Route:** `app/(app)/app/job-readiness/page.tsx` ✅
- [x] **Main Dashboard UI:**
  - [x] Display overall progress:
    - Component: `components/job-readiness/OverallProgressDisplay.tsx` ✅ (Completed)
      - Prominent visual display of the 5-star progress system (5 actual stars that fill up). ✅
      - Display current star color (Bronze, Silver, Gold) based on tier. ✅
      - Dynamic progress messages and next steps. ✅
  - [x] Display current/next module:
    - Component: `components/job-readiness/ModuleNavigation.tsx` ✅ (Completed with module grouping)
      - ✅ **UPDATED**: Now shows grouped modules (Assessments, Courses, Expert Sessions, Projects, Interviews)
      - ✅ Shows aggregate progress for each group (X/Y modules completed)
      - ✅ Links to group listing pages that show individual modules
      - Clearly indicate locked and unlocked modules. Locked modules are visible but not interactive, with messages about prerequisites. ✅
      - Link to the active module. ✅
  - [x] Fetch initial Job Readiness product details and student progress.
    - API: `GET /api/app/job-readiness/products` ✅ (Implemented via useJobReadinessModuleGroups hook)
- [x] **Module Locking/Unlocking Logic:**
  - [x] Implement client-side logic to reflect module lock/unlock status based on API response and student's star level. ✅
  - [x] Ensure UI updates dynamically as modules are unlocked. ✅ (TanStack Query handles real-time updates)

## 3. Module: Standard Assessments (Star 1) ✅ COMPLETED

- [x] **Page Routes:**
  - [x] `app/(app)/app/job-readiness/assessments/page.tsx` - Assessment listing page ✅
  - [x] `app/(app)/app/job-readiness/assessments/[moduleId]/page.tsx` - Individual assessment taking page ✅
  - [x] `app/(app)/app/job-readiness/assessments/[moduleId]/results/page.tsx` - Assessment results page ✅

- [x] **API Endpoints & Responses:**
  - [x] **GET** `/api/app/job-readiness/assessments?productId={productId}&assessmentType={type}` - List assessments ✅
    ```json
    {
      "assessments": [
        {
          "id": "946abf65-5852-4685-b225-c491c8fce2e8",
          "name": "Initial Assessment",
          "type": "Assessment",
          "configuration": { "passThreshold": 60, "timeLimitMinutes": 60, "assessmentType": "initial_tier" },
          "sequence": 1,
          "is_unlocked": true,
          "is_completed": true,
          "is_tier_determining": true,
          "questions_count": 10,
          "last_score": 100,
          "tier_achieved": "GOLD"
        }
      ],
      "tier_criteria": {
        "bronze": { "min_score": 0, "max_score": 60 },
        "silver": { "min_score": 61, "max_score": 80 },
        "gold": { "min_score": 81, "max_score": 100 }
      },
      "current_tier": "GOLD",
      "current_star_level": "FOUR"
    }
    ```
  - [x] **GET** `/api/app/job-readiness/assessments/[moduleId]/details` - Assessment details with questions ✅
  - [x] **POST** `/api/app/job-readiness/assessments/[moduleId]/submit` - Submit assessment ✅

- [x] **Component Files:**
  - [x] `components/job-readiness/AssessmentList.tsx` - Display available assessments ✅
  - [x] `components/job-readiness/AssessmentCard.tsx` - Individual assessment card ✅
  - [x] `components/job-readiness/TierDisplay.tsx` - Show tier criteria and current tier ✅
  - [x] `components/job-readiness/AssessmentInterface.tsx` - Assessment taking interface ✅
  - [x] `components/job-readiness/AssessmentResults.tsx` - Results display with tier feedback ✅

- [x] **UI Integration:**
  - [x] Leverage existing assessment UI components and flow. ✅
    - Files: `app/(app)/app/assessment/[id]/take/page.tsx`, `components/assessment/*`
  - [x] This module is unlocked by default for students enrolled in a Job Readiness product. ✅
  - [x] Handle assessment submission. ✅
  - [x] **NEW**: Multiple assessment modules grouped under "Assessments" in dashboard ✅
  - [x] **NEW**: Assessment type filtering (initial_tier, skill_specific, promotion) ✅

- [x] **Post-Completion Flow:**
  - [x] After completion of all required assessments, the backend determines the initial tier (Bronze, Silver, Gold). ✅
  - [x] Frontend should update the star color and award the 1st star visually. ✅
  - [x] Unlock the "Courses" module in the Job Readiness dashboard. ✅

## 4. Module Grouping System ✅ COMPLETED

- [x] **Overview:**
  - [x] Job Readiness products now support multiple assessment and course modules ✅
  - [x] Frontend groups modules by type instead of showing individual modules on dashboard ✅
  - [x] Students see "Assessments" and "Courses" groups with aggregate progress ✅

- [x] **Implementation:**
  - [x] `hooks/useJobReadinessModuleGroups.ts` - Groups modules by type with progress aggregation ✅
  - [x] `components/job-readiness/ModuleNavigation.tsx` - Updated to use module groups ✅
  - [x] Enhanced assessment endpoint with `assessmentType` filtering ✅

- [x] **User Experience:**
  - [x] Dashboard shows module groups (Assessments, Courses, etc.) ✅
  - [x] Each group shows completion count (e.g., "2/5 assessments completed") ✅
  - [x] Clicking a group navigates to listing page showing individual modules ✅
  - [x] Assessment listing page shows all assessment modules for the product ✅

- [x] **Database Setup:**
  - [x] Multiple assessment modules added to Job Readiness products ✅
  - [x] Multiple course modules added to Job Readiness products ✅
  - [x] Module configuration includes assessment types and course settings ✅

## 5. Module: Courses with AI-Generated Quizzes (Star 2) 🚧 PLANNED

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/courses/page.tsx` - Course listing page (created but needs CourseList component)
  - `app/(app)/app/job-readiness/courses/[moduleId]/page.tsx` - Course content viewer
  - `app/(app)/app/job-readiness/courses/[moduleId]/lessons/[lessonId]/page.tsx` - Individual lesson viewer

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/courses?productId={productId}` - List courses ✅ (API ready)
  - **GET** `/api/app/job-readiness/courses/[moduleId]/content` - Course content with lessons ✅ (API ready)
  - **POST** `/api/app/job-readiness/courses/[moduleId]/save-progress` - Save progress ✅ (API ready)

- [ ] **Component Files to Create:**
  - `components/job-readiness/CourseList.tsx` - Display available courses
  - `components/job-readiness/CourseCard.tsx` - Individual course card with progress
  - `components/job-readiness/CoursePlayer.tsx` - Video player with progress tracking
  - `components/job-readiness/LessonList.tsx` - List of lessons in a course
  - `components/job-readiness/LessonViewer.tsx` - Individual lesson viewer
  - `components/job-readiness/AiQuiz.tsx` - AI-generated quiz component
  - `components/job-readiness/QuizResults.tsx` - Quiz results display
  - `components/job-readiness/VideoProgress.tsx` - Video progress tracker

- [ ] **Course Listing UI:**
  - Display available "Course" type modules for the student within the current Job Readiness product.
  - Show progress for each course module (similar to assessment cards)

- [ ] **Course Content UI (Video Player & Lessons):**
  - Leverage existing course video player UI.
  - Display list of lessons (title, video URL, sequence).
  - Track video watch progress.

- [ ] **AI-Generated Quiz UI:**
  - For each lesson with `enable_ai_quiz = true`:
    - Fetch quiz questions (no answers) from the content API.
    - Display quiz questions and options.
    - Clearly indicate AI generation and tier-appropriateness (Bronze/Silver/Gold).
  - Handle quiz submission.
  - Display quiz results (score, passed/failed, optional correct answers for review).
  - Update lesson progress locally and sync with backend.

- [ ] **Post-Completion Flow:**
  - [ ] On completion of all required course modules (including passing quizzes), award the 2nd star.
  - [ ] Unlock the "Expert Sessions" module.
  - [ ] If eligible, present the Promotion Exam option.

## 6. Module: Expert Sessions (Star 3) 🚧 PLANNED

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/expert-sessions/page.tsx` - Expert sessions listing page
  - `app/(app)/app/job-readiness/expert-sessions/[sessionId]/page.tsx` - Individual session viewer

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/expert-sessions?productId={productId}` - List expert sessions ✅ (API ready)
  - **POST** `/api/app/job-readiness/expert-sessions/[sessionId]/watch-progress` - Update watch progress ✅ (API ready)

- [ ] **Component Files:**
  - `components/job-readiness/ExpertSessionList.tsx` - Display list of expert sessions
  - `components/job-readiness/ExpertSessionCard.tsx` - Individual session card with progress
  - `components/job-readiness/ExpertSessionPlayer.tsx` - Video player with progress tracking
  - `components/job-readiness/SessionProgress.tsx` - Progress indicator for sessions
  - `components/job-readiness/OverallSessionProgress.tsx` - Overall progress (X of 5 completed)

- [ ] **Expert Sessions Listing UI:**
  - Display list of all available Expert Session videos.
    - Include title, description, video duration (if available).
    - Show student's progress for each session (e.g., "Watched 50%", "Completed").
  - Display overall progress: "X of 5 sessions completed".

- [ ] **Expert Session Video Player UI:**
  - Standard video player controls.
  - Track watch progress (time watched).
  - Send progress updates to the backend periodically and on significant events (e.g., pause, end).

- [ ] **Post-Completion Flow:**
  - [ ] Backend automatically marks session as complete when 95% watch threshold is reached.
  - [ ] Frontend updates UI to reflect completion.
  - [ ] On completion of 5 distinct sessions, award the 3rd star.
  - [ ] Unlock the "Projects" module.
  - [ ] If eligible, present the Promotion Exam option.

## 7. Module: AI-Generated Real-World Projects (Star 4) 🚧 PLANNED

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/projects/page.tsx` - Project generation and submission page
  - `app/(app)/app/job-readiness/projects/feedback/page.tsx` - Project feedback and results page

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/projects/generate?productId={productId}` - Generate or get existing project ✅ (API ready)
  - **POST** `/api/app/job-readiness/projects/submit` - Submit project work ✅ (API ready)

- [ ] **Component Files to Create:**
  - `components/job-readiness/ProjectDisplay.tsx` - Display generated project details
  - `components/job-readiness/ProjectSubmissionForm.tsx` - Submission form (adaptive to background)
  - `components/job-readiness/ProjectFeedback.tsx` - Display AI feedback and results
  - `components/job-readiness/ProjectTasks.tsx` - Display project tasks and deliverables
  - `components/job-readiness/SubmissionTypeSelector.tsx` - Switch between text/URL submission
  - `components/job-readiness/RetryProject.tsx` - Retry mechanism for failed projects

- [ ] **Project Display UI:**
  - Fetch and display the AI-generated project description based on student's background and tier.
  - Emphasize that project details might change on refresh if not yet started/submitted.

- [ ] **Project Submission UI:**
  - Input mechanism adapting to student background:
    - Computer Science: Form field to submit GitHub repository URL.
    - Other backgrounds: Rich text editor for submitting text-based case study answers.

- [ ] **Feedback and Iteration:**
  - Display AI grading results/feedback from the API response.
  - UI to allow retries if the project is failed (based on backend rules).

- [ ] **Post-Completion Flow:**
  - [ ] On passing the project, award the 4th star.
  - [ ] Unlock the "Simulated Interview" module.
  - [ ] If eligible, present the Promotion Exam option.

## 8. Module: AI-Powered Simulated Interview (Star 5) 🚧 PLANNED

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/interviews/page.tsx` - Interview setup and recording page
  - `app/(app)/app/job-readiness/interviews/feedback/[submissionId]/page.tsx` - Interview feedback page

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/interviews/questions` - Get interview questions ✅ (API ready)
  - **POST** `/api/app/job-readiness/interviews/submit` - Submit interview responses ✅ (API ready)

- [ ] **Component Files:**
  - `components/job-readiness/InterviewSetup.tsx` - Setup instructions and start button
  - `components/job-readiness/InterviewRecorder.tsx` - Main recording interface
  - `components/job-readiness/InterviewQuestions.tsx` - Display questions during recording
  - `components/job-readiness/WebcamRecorder.tsx` - Webcam recording functionality
  - `components/job-readiness/RecordingTimer.tsx` - 5-minute countdown timer
  - `components/job-readiness/InterviewFeedback.tsx` - Display AI analysis and feedback
  - `components/job-readiness/VideoUpload.tsx` - Handle video blob upload
  - `components/job-readiness/PermissionsCheck.tsx` - Camera/microphone permission handling

- [ ] **Interview Setup UI:**
  - Instructions for the interview process.
  - Button to initiate the simulated interview.

- [ ] **Interview Recorder Component:**
  - **Display Interview Questions:**
    - Fetch questions tailored to student's background and tier.
    - Display one question at a time, or all questions if preferred for the flow.
  - **Webcam Access and Recording:**
    - Request microphone and camera permissions.
    - Use `MediaRecorder` API for video/audio capture (WebM format).
    - Visual feedback of recording status.
  - **Recording Timer:**
    - Implement a 5-minute countdown timer.
    - Display remaining time.
    - Auto-finalize and submit on timer end.
  - **Manual Submission:**
    - Allow student to click "Submit" before timer ends.
  - **Video Processing (Client-side):**
    - Best-effort client-side check for video duration (max 5 mins).
    - Attempt compression if feasible, or aim for <20MB recording settings.
  - **Upload to API:**
    - Send WebM video blob to the backend.

- [ ] **Feedback UI:**
  - Display AI analysis feedback (pass/fail, detailed comments).
  - UI to allow retries if failed (subject to backend rules).

- [ ] **Post-Completion Flow:**
  - [ ] On passing the interview, award the 5th star.
  - [ ] Job Readiness product considered complete. Display a congratulatory message.

## 9. Optional: Promotion Exam 🚧 PLANNED

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/promotion-exam/page.tsx` - Eligibility check and exam start
  - `app/(app)/app/job-readiness/promotion-exam/take/page.tsx` - Exam taking interface
  - `app/(app)/app/job-readiness/promotion-exam/results/page.tsx` - Exam results and feedback

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/promotion-exam/eligibility` - Check exam eligibility ✅ (API ready)
  - **POST** `/api/app/job-readiness/promotion-exam/start` - Start exam session ✅ (API ready)
  - **POST** `/api/app/job-readiness/promotion-exam/submit` - Submit exam answers ✅ (API ready)

- [ ] **Component Files:**
  - `components/job-readiness/PromotionExamPrompt.tsx` - Eligibility notification and start prompt
  - `components/job-readiness/ExamEligibilityCheck.tsx` - Check and display eligibility status
  - `components/job-readiness/PromotionExamInterface.tsx` - Exam taking interface
  - `components/job-readiness/ExamTimer.tsx` - Countdown timer for exam
  - `components/job-readiness/ExamNavigation.tsx` - Question navigation controls
  - `components/job-readiness/ExamResults.tsx` - Display exam results and tier promotion
  - `components/job-readiness/TierPromotion.tsx` - Visual tier promotion celebration

- [ ] **Promotion Exam Modal/Notification:**
  - Triggered after achieving Star 2, Star 3 (and potentially Star 4 if applicable and not yet at Gold tier).
  - Check eligibility via API first.
  - Clearly state it's a one-time attempt (per star-level opportunity) to upgrade tier (e.g., Bronze to Silver, Silver to Gold).
  - Buttons: "Start Exam" or "Skip". Skipping does not hinder progression to the next content module.

- [ ] **Exam Interface UI:**
  - Fetch and display 25 AI-generated exam questions.
  - Standard exam controls (navigation, answer selection).

- [ ] **Submission and Feedback:**
  - Handle exam submission.
  - Display immediate feedback (pass/fail).
  - If promoted, visually update star color/tier on the Job Readiness dashboard and global state.

## 10. General UI Elements & Considerations

- [x] **Error Handling:**
  - [x] Consistent error messages for API failures, locked modules, etc. ✅
  - [x] Retry mechanisms where appropriate. ✅
- [x] **Loading States:**
  - [x] Skeletons or loaders for data fetching. ✅
- [x] **Instructions & Tooltips:**
  - [x] Clear instructions for all AI-powered components and complex interactions. ✅
- [x] **Responsiveness:**
  - [x] Ensure all new components and pages are responsive for mobile and desktop. ✅
- [x] **Accessibility (a11y):**
  - [x] Adhere to accessibility best practices (semantic HTML, ARIA attributes, keyboard navigation). ✅
- [x] **State Synchronization (TanStack Query):**
  - [x] Use TanStack Query's invalidation and refetching mechanisms to ensure data consistency. ✅
  - [x] Invalidate relevant queries after significant actions (module completion, promotion exam, tier upgrades). ✅
  - [x] Implement optimistic updates where appropriate for better UX. ✅
  - [x] Use query keys strategically for efficient cache management and selective invalidation. ✅

## 11. TanStack Query Implementation Details ✅ COMPLETED

- [x] **Query Keys Strategy:**
  - [x] Define consistent query key patterns:
    - `['job-readiness', 'products', productId]` for product data ✅
    - `['job-readiness', 'progress', studentId]` for progress data ✅
    - `['job-readiness', 'module-groups']` for grouped module data ✅
    - `['job-readiness', 'courses', moduleId]` for course content ✅
    - `['job-readiness', 'expert-sessions', productId]` for expert sessions ✅
    - `['job-readiness', 'interviews', 'questions']` for interview questions ✅
- [x] **Cache Configuration:**
  - [x] Set appropriate `staleTime` and `cacheTime` for different data types:
    - Progress data: Shorter stale time (1-2 minutes) for real-time updates ✅
    - Course content: Longer stale time (10-15 minutes) for static content ✅
    - Expert sessions: Medium stale time (5 minutes) for semi-static content ✅
- [x] **Query Invalidation Patterns:**
  - [x] Invalidate progress queries after module completion ✅
  - [x] Invalidate course queries after quiz submission ✅
  - [x] Invalidate expert session queries after watch progress updates ✅
  - [x] Use selective invalidation with specific query keys to avoid unnecessary refetches ✅
- [x] **Optimistic Updates:**
  - [x] Implement optimistic updates for progress tracking (video progress, quiz attempts) ✅
  - [x] Implement rollback mechanisms for failed mutations ✅
- [x] **Error Handling:**
  - [x] Create consistent error handling patterns for all Job Readiness queries ✅
  - [x] Implement retry logic for transient failures ✅
  - [x] Show appropriate error states in UI components ✅

This plan provides a structured approach to developing the Job Readiness student frontend. The assessment module and module grouping system are now complete, providing a solid foundation for implementing the remaining modules (courses, expert sessions, projects, interviews). 
- [ ] **Error Handling:**
  - Consistent error messages for API failures, locked modules, etc.
  - Retry mechanisms where appropriate.
- [ ] **Loading States:**
  - Skeletons or loaders for data fetching.
- [ ] **Instructions & Tooltips:**
  - Clear instructions for all AI-powered components and complex interactions.
- [ ] **Responsiveness:**
  - Ensure all new components and pages are responsive for mobile and desktop.
- [ ] **Accessibility (a11y):**
  - Adhere to accessibility best practices (semantic HTML, ARIA attributes, keyboard navigation).
- [ ] **State Synchronization (TanStack Query):**
  - Use TanStack Query's invalidation and refetching mechanisms to ensure data consistency.
  - Invalidate relevant queries after significant actions (module completion, promotion exam, tier upgrades).
  - Implement optimistic updates where appropriate for better UX.
  - Use query keys strategically for efficient cache management and selective invalidation.

## 10. TanStack Query Implementation Details

- [ ] **Query Keys Strategy:**
  - [ ] Define consistent query key patterns:
    - `['job-readiness', 'products', productId]` for product data
    - `['job-readiness', 'progress', studentId]` for progress data
    - `['job-readiness', 'courses', moduleId]` for course content
    - `['job-readiness', 'expert-sessions', productId]` for expert sessions
    - `['job-readiness', 'interviews', 'questions']` for interview questions
- [ ] **Cache Configuration:**
  - [ ] Set appropriate `staleTime` and `cacheTime` for different data types:
    - Progress data: Shorter stale time (1-2 minutes) for real-time updates
    - Course content: Longer stale time (10-15 minutes) for static content
    - Expert sessions: Medium stale time (5 minutes) for semi-static content
- [ ] **Query Invalidation Patterns:**
  - [ ] Invalidate progress queries after module completion
  - [ ] Invalidate course queries after quiz submission
  - [ ] Invalidate expert session queries after watch progress updates
  - [ ] Use selective invalidation with specific query keys to avoid unnecessary refetches
- [ ] **Optimistic Updates:**
  - [ ] Implement optimistic updates for progress tracking (video progress, quiz attempts)
  - [ ] Implement rollback mechanisms for failed mutations
- [ ] **Error Handling:**
  - [ ] Create consistent error handling patterns for all Job Readiness queries
  - [ ] Implement retry logic for transient failures
  - [ ] Show appropriate error states in UI components

This plan provides a structured approach to developing the Job Readiness student frontend. Each section should be broken down further into smaller tasks during development sprints. 