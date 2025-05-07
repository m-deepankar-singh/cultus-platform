# Student UI Backend Integration Plan

## Overview
This plan details the tasks required to integrate the backend APIs with the Student UI (Main App at `platform.com/app`), enabling core student functionalities as defined in the PRD (`docs/prd.md`), and referencing the existing `docs/implementation-plan.md` and `docs/backend-feature-implementation-plan.md`.

## 1. Student Authentication UI Integration
- [X] **Login Page (`/app/login`) Integration**
  - [X] Connect the student login form (React Server Component with Client Component for form handling) to the `POST /api/app/auth/login` endpoint.
    - Use `lib/schemas/auth.ts` (`AppLoginSchema`) for client-side validation if implemented, otherwise ensure server validation is robust.
  - [X] **Handle Successful Login:**
    - [X] The Supabase SSR helper should manage session cookies automatically upon successful response from `/api/app/auth/login`.
    - [X] Redirect the student to their dashboard (`/app/dashboard` or a relevant landing page within the app).
  - [X] **Handle Login Errors from `/api/app/auth/login`:**
    - [X] Display a generic "Invalid credentials or user not authorized" message for security. Specific error messages like "User not enrolled or inactive" (as detailed in `backend-feature-implementation-plan.md` for `/api/app/auth/login` logic) should be handled server-side, with the API returning a consistent error format for the frontend.
  - [ ] **Password Reset Functionality:**
    - [ ] Ensure the "Forgot Password" link on the login page initiates the Supabase Auth password reset flow.
    - [ ] Implement any necessary UI pages for password reset (e.g., enter email, check email, new password form if not handled by Supabase default UI).

## 2. Student Dashboard Integration
- [X] **Dashboard Page (`/app/dashboard`) Data Fetching & Display**
  - [X] **Fetch Data:**
    - [X] On page load (using RSC), call the `GET /api/app/progress` endpoint (or query db directly) to get assigned products, modules, and progress.
  - [X] **UI States:**
    - [X] Implement loading state (handled by RSC/Suspense).
    - [X] Implement an error state with a user-friendly message.
    - [X] Implement an empty state if the student has no assigned products/modules.
    - [X] Added GSAP animations for states and card appearance.
  - [X] **Display Data:**
    - [X] Render fetched products using Card components.
    - [X] Allow each product card to be expanded/collapsed to show its nested modules (Courses/Assessments) with animations.
    - [X] For each product card, display overall status and progress.
    - [X] For each module in the expanded view, display Name, Type, Status, Progress %, and a CTA link.
    - [X] Link product cards to `/app/product-details/[productId]` page.
  - [ ] **Responsiveness:** Ensure the dashboard is fully responsive as per PRD requirements. (Next Step)

## 3. Course Module UI Integration
- [X] **Course Player Page (e.g., `/app/course/[moduleId]`) Integration**
  - [X] **Fetch Course Content & Initial Progress:**
    - [X] When a student navigates to a specific course module, retrieve detailed course structure (linear sequence of lessons, video URLs, embedded quiz details) and the student's current progress (last viewed point, completed lessons/quizzes).
    - [X] This data should ideally be part of the payload from `GET /api/app/progress` (if it includes module-specific details upon expansion) or fetched from a dedicated student-facing endpoint like `GET /api/app/modules/[moduleId]/details` if necessary.
  - [X] **Display Course Content:**
    - [X] Implement UI for sequential navigation through lessons.
    - [X] Integrate an MP4 video player for lessons containing video URLs (from Supabase Storage).
    - [X] For lessons with quizzes (MCQs from course question bank):
        - [X] Display quiz questions and options.
        - [X] Allow students to select answers.
        - [X] Provide feedback/score for the quiz if designed (this might involve a separate API call if quizzes are submitted individually or be part of the overall course progress update).
  - [X] **Track and Update Progress:**
    - [X] As the student interacts with course elements (e.g., completes a video, submits a quiz):
        - [X] Call `PATCH /api/app/progress/course/[moduleId]` with the updated progress. The payload should conform to `CourseProgressUpdateSchema` (e.g., lesson ID, completion status, potentially new overall percentage calculated on frontend or returned by backend).
        - [X] Handle API response: update UI to reflect changes (e.g., mark lesson as complete, update progress bar).
        - [X] Implement client-side logic to determine when a video is considered "watched" or a lesson "completed" before sending the PATCH request.
  - [X] **Resume Functionality:**
    - [X] Use the fetched initial progress data to automatically navigate the student to their last viewed or next pending lesson in the sequence.
  - [X] **Error Handling:** Manage API errors during progress updates, providing appropriate feedback.

## 4. Assessment Module UI Integration
- [X] **Assessment Page (e.g., `/app/assessment/[moduleId]`) Integration**
  - [X] **Fetch Assessment Details:**
    - [X] On navigation to an assessment module, retrieve assessment details: questions (MCQs, MSQs), overall time limit, and scoring rules.
    - [X] This data should be available from `GET /api/app/progress` (if detailed enough) or a dedicated student-facing endpoint `GET /api/app/modules/[moduleId]/details`.
  - [X] **Assessment UI Implementation:**
    - [X] Display clear instructions, including the time limit.
    - [X] Implement and display a countdown timer.
    - [X] Present assessment questions (MCQ/MSQ format).
    - [X] Allow students to select answers (single choice for MCQ, multiple for MSQ).
    - [X] Provide navigation between questions if the assessment is not one-question-per-page.
  - [X] **Submission Logic:**
    - [X] On "Submit Assessment" click:
        - [X] Collect all answers.
        - [X] Call `POST /api/app/assessments/[moduleId]/submit` with a payload conforming to `AssessmentSubmissionSchema`.
    - [X] On timer expiry:
        - [X] Automatically collect any answers provided so far.
        - [X] Call `POST /api/app/assessments/[moduleId]/submit`.
  - [X] **Display Results:**
    - [X] After successful submission, display the results (score, pass/fail status) as returned by the API.
    - [X] Update the student's dashboard to reflect the assessment completion and score.
  - [X] **Error Handling:** Manage errors from the submission API (e.g., already submitted, not enrolled, network issues), providing clear feedback.

## 5. General Student App API Integration Considerations
- [ ] **API Client/Wrapper:**
  - [ ] Utilize a consistent method for making API calls from client components (e.g., a wrapper around `fetch` that handles headers, base URL, and potentially error parsing).
  - [ ] Ensure Supabase session token (JWT) is automatically included in requests to protected API routes. The Supabase SSR helpers should manage this for server-side fetches; client-side fetches will also have access to the session.
- [ ] **Server State Management (Client-Side):**
  - [ ] Employ a library like React Query (`TanStack Query`) or SWR for managing server state fetched by `GET` requests. This will handle caching, automatic refetching, loading states, and error states more robustly.
- [ ] **Loading and Error States:**
  - [ ] Implement global or per-component loading indicators (e.g., spinners, skeleton screens) for all asynchronous API interactions.
  - [ ] Standardize display of user-friendly error messages for API failures.
- [ ] **Client-Side Validation (Optional but Recommended):**
  - [ ] For any forms directly submitting to APIs (though most student interactions might be progress updates rather than complex forms), consider using Zod schemas for client-side validation to provide immediate feedback, complementing server-side validation.
- [ ] **Optimistic Updates (Optional):**
  - [ ] For frequent actions like marking a lesson complete, consider optimistic UI updates for a smoother experience, with proper rollback on API error.
- [ ] **End-to-End Testing of Integrated Flows:**
  - [ ] After integration, perform thorough end-to-end testing of all student user stories: login, viewing dashboard, starting/progressing/completing a course, starting/completing an assessment, and seeing updated progress. 