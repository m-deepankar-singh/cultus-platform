# Main Application Flow (`platform.com/app`)

## 1. Overview

This document describes the user flows and interactions within the Main Application (Student App) of the Upskilling Platform, accessible at `platform.com/app`. It details the experience for the Student user role, based on the PRD and established technical guidelines.

## 2. Authentication & Entry

1.  **Access**: Students navigate to `platform.com/app`.
2.  **Login Form**: A login form is presented (rendered ideally via RSC, form handling via Client Component).
3.  **Credentials**: Student enters email and password (provisioned by Admin/Staff).
4.  **Submission**: On submit, the client-side code calls a backend API endpoint (e.g., `POST /api/app/auth/login`) OR directly Supabase Auth (`signInWithPassword`). **Using a backend endpoint is recommended to centralize the enrollment check.**
5.  **Backend Verification (if using API endpoint)**:
    *   Backend route receives credentials.
    *   Calls Supabase Auth `signInWithPassword`.
    *   **If successful, queries the `profiles` table using the authenticated user ID.**
    *   **Checks if a profile exists, has the 'student' role (or equivalent flag), is marked active, and is linked to a client.**
    *   If all checks pass, establishes the session (e.g., using Supabase SSR helpers) and returns success to the client.
    *   If Supabase auth fails OR the profile check fails, returns an appropriate error (e.g., 401 Unauthorized).
6.  **Session Creation (if client calls Supabase directly)**: On successful `signInWithPassword`, Supabase Auth establishes a session. **An immediate subsequent check (e.g., fetching user profile via API) is required to verify enrollment before granting access to the dashboard.**
7.  **Redirection**: Upon successful authentication **and enrollment verification**, the Student is redirected to their dashboard.
8.  **Error Handling**: If authentication fails (wrong password) **or the enrollment check fails**, a user-friendly error message (distinguishing the cases might be useful for support but not necessarily for the user) is displayed.
9.  **Password Reset**: A link/mechanism exists to trigger the Supabase Auth password recovery flow.

## 3. Student Dashboard (US-019)

1.  **Data Fetching**: Upon loading the dashboard page (likely Server Component), data for the logged-in student is fetched.
    *   Backend API (`GET /api/app/dashboard` or similar) retrieves the student's profile, associated client, assigned products (via client association), and progress for each module within those products.
    *   RLS policies ensure only data relevant to the logged-in student (`auth.uid()`) is returned.
2.  **Display**: The dashboard UI (React components) renders the fetched data.
3.  **Hierarchical Structure**: Products assigned to the student are listed.
    *   Each Product is expandable/collapsible (Client Component for interaction state) to show its nested Modules (Courses/Assessments).
4.  **Progress Indication**: Each Module clearly displays its current status and progress:
    *   **Courses**: "Not Started", "In Progress [X%]", "Completed". Percentage is based on completed lessons/quizzes.
    *   **Assessments**: "Not Started", "Completed - Score: Y%", "Completed - Failed".
5.  **Responsiveness**: Dashboard layout adapts cleanly to mobile and desktop screens.

## 4. Taking a Course (US-020, US-021)

1.  **Initiation**: Student clicks on a Course module listed on the dashboard.
2.  **Navigation**: User is navigated to the course player/viewer page (`/app/courses/[courseId]/[lessonId]` or similar route).
3.  **Loading**: Course structure and content for the starting/resumed lesson are fetched (`GET /api/app/courses/:id/structure`, `GET /api/app/courses/:id/lessons/:lid`).
4.  **Interface**: The course interface displays:
    *   **Video Player**: Embedded player (Client Component) for the lesson's MP4 video (URL fetched from course data, pointing to Supabase Storage). Playback controls are standard.
    *   **Navigation**: Controls (e.g., "Next", "Previous", potentially a sidebar) allow navigating the linear sequence defined by the Admin.
    *   **Quiz Integration**: If a lesson includes a quiz, it's displayed within the flow. Student answers MCQs, submits (Client Component interaction, potentially calling `POST /api/app/courses/:cid/quizzes/:qid/submit`).
5.  **Progress Tracking**: As the student progresses (e.g., completes video, passes quiz):
    *   Client-side logic triggers API calls (`PATCH /api/app/progress/course/:cid`) to update the student's progress in the database (e.g., update percentage, mark lesson complete).
    *   Backend API validates the progress update against the course structure.
6.  **Resume Functionality (US-021)**:
    *   When the student exits the course (navigates away), their last completed/viewed position is stored (ideally updated via the progress tracking API calls).
    *   When returning to the course later, the initial data fetch determines the correct starting point based on saved progress.
7.  **Error Handling**: Handles errors like failed video loads (display message, allow retry) or quiz submission issues.

## 5. Taking an Assessment (US-022, US-023)

1.  **Initiation**: Student clicks on an Assessment module on the dashboard.
2.  **Navigation**: User is navigated to the assessment taking page (`/app/assessments/[assessmentId]` or similar).
3.  **Loading**: Assessment details (questions, time limit, configuration) are fetched (`GET /api/app/assessments/:id`).
4.  **Instructions**: Display assessment instructions, including the time limit.
5.  **Start Assessment**: Student clicks a "Start" button.
6.  **Assessment Interface (Client Component heavy)**:
    *   **Timer**: A visible timer starts counting down from the configured limit.
    *   **Question Display**: Questions (MCQ/MSQ) are presented one or more at a time.
    *   **Answering**: Student selects answers (radio buttons for MCQ, checkboxes for MSQ).
    *   **State Management**: Client-side state holds current answers and timer status.
    *   **Navigation**: Controls to move between questions if applicable.
7.  **Submission**: Student clicks "Submit" before time runs out.
    *   Client gathers all answers.
    *   API call (`POST /api/app/assessments/:id/submit`) sends answers to the backend.
8.  **Timeout**: If the timer reaches zero:
    *   Client-side logic automatically triggers the submission process with answers selected so far.
    *   API call (`POST /api/app/assessments/:id/submit`) is made.
9.  **Backend Processing**: The API endpoint:
    *   Receives answers.
    *   Calculates the score based on correct answers (applying all-or-nothing for MSQ).
    *   Determines pass/fail status if applicable.
    *   Records the completion status, score, and potentially submission timestamp in the database (`assessment_progress` table).
    *   Returns the result (score/status) to the client.
10. **Display Results (US-023)**:
    *   The UI displays the score/status received from the API.
    *   Student is likely redirected back to the dashboard or a summary page.
    *   The dashboard view for this assessment updates automatically (or on next load) to reflect completion and score.
11. **Error Handling**: Handles network errors during submission, displaying appropriate messages.

## 6. General UI/UX Notes (Main App)

*   **Responsiveness**: All views fully functional and usable on mobile devices.
*   **Clarity**: Clear visual hierarchy, intuitive navigation.
*   **Feedback**: Loading states for data fetching, confirmation messages for actions (assessment submission), clear progress indicators.
*   **Accessibility**: Ensure interactive elements (buttons, form controls, video player) are accessible. 