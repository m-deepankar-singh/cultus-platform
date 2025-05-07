# Quiz System Enhancement Plan: Manual & AI-Generated Quizzes

## 1. Overview & Goals

This document outlines the plan to enhance the existing lesson quiz system within the learning platform. The primary goal is to provide flexibility by allowing administrators to create lessons with either manually defined quiz questions or AI-generated quiz questions. For each lesson, the quiz will exclusively be of one type (manual or AI-generated), not a mixture.

This enhancement aims to maintain a consistent and engaging student experience, incorporating existing rules such as unlocking quizzes only after video completion, allowing only a single attempt per quiz, and enforcing a 2-minute time limit for all in-lesson quiz attempts.

### Key Goals:
1.  **Administrator Flexibility:** Enable admins to choose the quiz generation method (manual or AI) at the individual lesson level.
2.  **Consistent Student Experience:** Ensure students face a uniform quiz interaction model (video lock, one attempt, 2-minute timer, clear indication of quiz type and status) regardless of how the questions are generated.
3.  **Accurate Tracking:** Reliably track the type of quiz associated with each lesson attempt and the student's completion status in the database.
4.  **Modular Design:** Design the system so that the AI question generation service can be integrated point-wise (point-wise/as a specific component), without its internal implementation details being a prerequisite for the rest of the system's development.

### Non-Goals (for this specific plan):
*   The detailed implementation of the AI question generation service itself. This plan will focus on the integration touchpoints.
*   Advanced AI quiz features like adaptive questioning or highly detailed, nuanced grading beyond what the AI service might provide or simple score recording.
*   Saving partial progress for in-lesson quizzes (as per previous decisions, these are single, timed attempts).

## 2. Database Design & Schema Changes

To support the dual quiz types and track progress effectively, the following database modifications are required:

### 2.1. `lessons` Table Modification
*   **Task:** Add a new column to the `lessons` table to specify the quiz type.
    *   [ ] Add `quiz_type` column:
        *   Type: `VARCHAR(20)` (or a more constrained `ENUM` if your DB supports it well with migrations: `('manual', 'ai_generated')`).
        *   Constraint: `CHECK (quiz_type IN ('manual', 'ai_generated', NULL))`.
        *   Default: `NULL` (or `'manual'` if most quizzes are expected to be manual initially).
    *   [ ] The existing `quiz_questions` JSONB field on the `lessons` table will continue to store the array of question objects if `quiz_type` is `'manual'`. If `'ai_generated'` or `NULL`, this field should be `NULL` or empty.
    *   [ ] Consider implications for existing lessons if this column is added (e.g., backfill strategy if needed, though `NULL` initially is acceptable).

### 2.2. `student_module_progress` Table (`progress_details` JSONB field)
*   **Task:** Update the JSONB structure within `progress_details` to accurately track video completions, quiz completions, and quiz results, distinguishing by quiz type.
    *   [ ] **`fully_watched_video_ids: string[]`**: (Already planned) An array of `lesson.id`s for videos the student has watched to completion.
    *   [ ] **`completed_lesson_quiz_ids: string[]`**: An array of `lesson.id`s for which the student has completed the associated quiz (one attempt only).
    *   [ ] **`lesson_quiz_results: { [lessonId: string]: { quiz_type: 'manual' | 'ai_generated', score: number, submitted_at: string, answers_submitted?: Record<string, any> } }`**:
        *   An object where keys are `lesson.id`.
        *   Each entry stores:
            *   `quiz_type`: The type of quiz attempted (`'manual'` or `'ai_generated'`).
            *   `score`: The score achieved by the student (e.g., percentage or raw score).
            *   `submitted_at`: Timestamp of quiz submission.
            *   `answers_submitted` (optional): The answers the student submitted. This might be useful for admin review, especially for manual quizzes. For AI quizzes, this depends on whether the AI service provides a reviewable format or if it's deemed necessary.

## 3. Backend Development

Backend changes will primarily involve updating APIs for lesson management and student content delivery, as well as the Server Action for handling quiz submissions.

### 3.1. Admin API - Lesson Management (e.g., `/api/admin/modules/[moduleId]/lessons/[lessonId?]`)
*   **Task:** Modify lesson CRUD (Create, Read, Update, Delete) endpoints.
    *   [ ] **Create Lesson Endpoint (e.g., `POST .../lessons`):**
        *   Accept `quiz_type` in the request payload.
        *   If `quiz_type` is `'manual'`, also accept and validate `quiz_questions` data (array of question objects).
        *   Store `quiz_type` and `quiz_questions` (if manual) in the new `lessons` table columns.
    *   [ ] **Update Lesson Endpoint (e.g., `PUT .../lessons/[lessonId]`):**
        *   Allow modification of `quiz_type`.
        *   If `quiz_type` is being changed to `'manual'`, allow providing new `quiz_questions`.
        *   If `quiz_type` is being changed from `'manual'` to `'ai_generated'` or `NULL`, the backend should ensure the `quiz_questions` field for that lesson is cleared (set to `NULL` or empty array).
        *   If `quiz_type` is `'ai_generated'`, any `quiz_questions` data sent in the payload should be ignored for storage in the `lessons.quiz_questions` field.
    *   [ ] Ensure existing RLS policies for lesson management by admins are sufficient or update as needed.

### 3.2. Student API - Course Content (`GET /api/app/courses/[moduleId]/content`)
*   **Task:** Enhance the API that serves course content to students.
    *   [ ] Modify the response for each lesson object to include:
        *   The new `lesson.quiz_type` field.
        *   The `lesson.quiz_questions` field (containing manual questions) *only if* `lesson.quiz_type` is `'manual'`. Do not send these for AI quizzes.
    *   [ ] Continue to fetch and return relevant student progress from `student_module_progress.progress_details`, including:
        *   `fully_watched_video_ids`
        *   `completed_lesson_quiz_ids`
        *   `lesson_quiz_results`

### 3.3. Server Action - Quiz Submission (e.g., `updateCourseProgressAction` or a new `submitLessonQuizAction`)
*   **Task:** Update the Server Action that handles student progress, or create a dedicated one for quiz submissions.
    *   [ ] **Input Parameters:** The action should accept:
        *   `moduleId: string`
        *   `lessonId: string`
        *   `submittedAnswers: Record<string, any>` (student's answers, format may vary slightly for MCQ vs MSQ)
        *   `quiz_type_attempted: 'manual' | 'ai_generated'` (passed from client to confirm context)
        *   `time_taken_seconds?: number` (optional, if tracking time spent on quiz)
    *   [ ] **Core Logic:**
        *   Verify that the student is eligible to submit (e.g., video watched for this `lessonId`, quiz not already in `completed_lesson_quiz_ids`).
        *   **If `quiz_type_attempted` is `'manual'`:**
            *   Fetch the lesson's `quiz_questions` (which include correct answer information, carefully handled on the backend) from the `lessons` table.
            *   Grade the `submittedAnswers` against the correct answers. Calculate the `score`.
        *   **If `quiz_type_attempted` is `'ai_generated'`:**
            *   The actual grading logic might be simpler for V1 if the AI service itself doesn't provide an immediate score. We might:
                *   Assume a "completion" score or a pass/fail based on submission.
                *   Or, if the AI service interaction (not detailed here) returns a score or evaluatable data, use that.
                *   For this plan, the primary goal is to record the attempt and the answers. Detailed AI quiz grading is a future step. Let's assume a placeholder score or simple completion credit for now.
        *   Update `student_module_progress.progress_details` for the student:
            *   Add the current `lessonId` to the `completed_lesson_quiz_ids` array.
            *   Add an entry to `lesson_quiz_results` for this `lessonId`, storing `{ quiz_type: quiz_type_attempted, score, submitted_at: new Date().toISOString(), answers_submitted }`.
    *   [ ] **Video Completion:** This action (or the main `updateCourseProgressAction`) must also continue to handle updates to `fully_watched_video_ids` when a video is completed.
    *   [ ] Return a success status and potentially the updated progress data to the client.

## 4. Frontend Development - Admin Panel

Admins need a way to configure the quiz type for each lesson.

### 4.1. Lesson Create/Edit Form (within Module Management)
*   **Task:** Update the UI for creating and editing lessons.
    *   [ ] Add a UI element (e.g., Radio Buttons or a Dropdown menu) for `quiz_type` selection:
        *   Options: "No Quiz", "Manual Quiz", "AI-Generated Quiz".
    *   [ ] **Conditional UI based on `quiz_type` selection:**
        *   If "Manual Quiz" is selected:
            *   Display the existing UI components for adding, editing, and reordering quiz questions (MCQ, MSQ, etc.).
        *   If "AI-Generated Quiz" is selected:
            *   Hide the manual question editor.
            *   (Future) Potentially display minimal configuration options relevant to AI quiz generation (e.g., topic keywords, difficulty level presets, if the AI service supports these – for V1, just selecting "AI-Generated" might be enough).
        *   If "No Quiz" is selected:
            *   Hide all quiz-related input fields.
    *   [ ] Ensure the form state correctly manages `quiz_type` and `quiz_questions` based on admin selections.

### 4.2. API Integration
*   **Task:** Ensure the lesson form correctly sends data to the backend.
    *   [ ] When submitting the lesson form (create or update):
        *   Send the selected `quiz_type` to the backend.
        *   If `quiz_type` is `'manual'`, send the structured `quiz_questions` data.
        *   If `quiz_type` is `'ai_generated'` or `'none'`, `quiz_questions` should ideally be `null` or an empty array.

## 5. Frontend Development - Student Course Player

The student's experience with quizzes needs to be clear and consistent.

### 5.1. Data Handling & State Management (e.g., in `CoursePlayerPage.tsx`)
*   **Task:** Adapt client-side data structures and state.
    *   [ ] Update TypeScript interfaces (e.g., `Lesson`, `CoursePageData`, `StudentCourseProgress`) to include:
        *   `lesson.quiz_type: 'manual' | 'ai_generated' | null`
        *   `progress.completed_lesson_quiz_ids: string[]`
        *   `progress.lesson_quiz_results: { [lessonId: string]: { quiz_type: string, score: number, submitted_at: string, ... } }`
    *   [ ] Ensure this data is correctly fetched from `/api/app/courses/[moduleId]/content` and stored in the component's state.

### 5.2. Quiz Display & Interaction Logic
*   **Task:** Implement the UI logic for displaying and interacting with lesson quizzes.
    *   [ ] **Lesson Navigation Indicators:**
        *   Visually indicate in the lesson list if a lesson has a quiz.
        *   Visually distinguish if a quiz has been completed (e.g., checkmark, different styling).
    *   [ ] **Active Lesson Quiz Area:**
        *   **Initial State & Locking Logic (when lesson becomes active):**
            1.  Check if `currentLesson.quiz_type` is `null` or undefined. If so, no quiz UI is shown.
            2.  Else, check if `currentLesson.id` is in `progress.fully_watched_video_ids`.
                *   If **NOT** watched: Display "Quiz Locked. Please complete the lesson video to unlock the quiz." Quiz interface is non-interactive.
            3.  Else (video **IS** watched), check if `currentLesson.id` is in `progress.completed_lesson_quiz_ids`.
                *   If **YES** completed: Display "Quiz Completed." Show the score from `progress.lesson_quiz_results[currentLesson.id].score`. Do **not** show a "Start Quiz" button.
                *   If **NO** (video watched, quiz not yet completed): Display a "Start Quiz" button.
        *   **On "Start Quiz" Button Click:**
            1.  Hide the "Start Quiz" button.
            2.  Display the quiz interface (questions, options, timer).
            3.  **Loading Questions:**
                *   If `currentLesson.quiz_type` is `'manual'`:
                    *   Render questions directly from `currentLesson.quiz_questions` (which should have been fetched with the course content).
                *   If `currentLesson.quiz_type` is `'ai_generated'`:
                    *   Display a loading indicator (e.g., "Generating AI Quiz...").
                    *   Make an asynchronous call to the AI question generation service (this might be a new API route on your backend that proxies to the AI service, or a direct client-side call if appropriate).
                    *   Once questions are received, render them. Handle errors if AI service fails.
            4.  **Common Quiz Active State (after questions are loaded/generated):**
                *   Start and display a 2-minute countdown timer.
                *   Make quiz questions interactive (radio buttons for MCQ, checkboxes for MSQ).
                *   Track student's selected answers locally (e.g., in React component state). **No partial progress is saved to the backend during these 2 minutes.**
                *   Display a "Submit Quiz" button.
        *   **Quiz Submission (triggered by Timer End OR "Submit Quiz" Button Click):**
            1.  Disable all quiz inputs immediately to prevent further changes.
            2.  Stop the timer.
            3.  Collect the final set of selected answers from the local state.
            4.  Call the quiz submission Server Action (see 3.3) with `moduleId`, `lessonId`, `submittedAnswers`, and `quiz_type_attempted` (`currentLesson.quiz_type`).
            5.  **On Server Action Success:**
                *   Update local state: add `lessonId` to `progress.completed_lesson_quiz_ids`, store the returned result (score, etc.) in `progress.lesson_quiz_results`.
                *   Refresh the UI to show "Quiz Completed" and the score.
            6.  **On Server Action Failure:** Display an appropriate error message to the student (e.g., "Failed to submit quiz. Please try again.").
        *   **Video Completion (`onEnded` event of video player):**
            1.  Call the `updateCourseProgressAction` Server Action to record that the video for `currentLesson.id` is completed (i.e., add to `fully_watched_video_ids`).
            2.  On success, update local `progress.fully_watched_video_ids`.
            3.  Re-evaluate the quiz display state: if the quiz was locked, it should now become available (show "Start Quiz" button, assuming it wasn't already completed).

### 5.3. AI Service Integration (Frontend/Proxy API)
*   **Task:** Define and implement the communication layer for AI-generated questions.
    *   [ ] **Option A (Backend Proxy):** Create a new Next.js API route (e.g., `/api/app/ai/generate-quiz`) that the frontend calls. This route on the backend then securely calls the actual AI question generation service.
        *   Pros: Keeps AI service credentials/logic secure on the backend. Allows for caching or rate-limiting if needed.
        *   Cons: Extra hop.
    *   [ ] **Option B (Direct Client-Side SDK - less likely for secure services):** If the AI service provides a secure client-side SDK and it's appropriate.
        *   Pros: Potentially simpler frontend.
        *   Cons: Exposes more to the client.
    *   [ ] For this plan, assume Option A (Backend Proxy) is preferred for better security and control. The proxy API would need to:
        *   Accept parameters like `lessonId` (to perhaps fetch lesson topic/context) or other relevant info for the AI.
        *   Call the AI service.
        *   Transform the AI service's response into the standard quiz question format expected by the frontend.
        *   Return the questions or an error.

## 6. Testing Considerations

Thorough testing is crucial for this feature.

### 6.1. Backend Testing
*   [ ] **Unit/Integration Tests for APIs & Server Actions:**
    *   Test admin lesson creation/update with `quiz_type='manual'` and valid/invalid `quiz_questions`.
    *   Test admin lesson creation/update with `quiz_type='ai_generated'` (ensure `quiz_questions` are ignored/nulled).
    *   Test student course content API (`/api/app/courses/[moduleId]/content`):
        *   Verify `quiz_type` is returned.
        *   Verify `quiz_questions` are only returned for `'manual'` type.
        *   Verify correct student progress fields (`fully_watched_video_ids`, `completed_lesson_quiz_ids`, `lesson_quiz_results`) are returned.
    *   Test quiz submission Server Action:
        *   Correct grading logic for `'manual'` quizzes.
        *   Correct data recording in `progress_details` for both `'manual'` and `'ai_generated'` attempts (score, `completed_lesson_quiz_ids`, `lesson_quiz_results` structure).
        *   Rejection of submission if video not watched or quiz already completed.
    *   Test RLS policies related to lesson data and student progress.

### 6.2. Frontend Testing (Admin Panel)
*   [ ] **Component/Integration Tests:**
    *   Test lesson form UI: selecting `quiz_type` correctly shows/hides manual question editor.
    *   Verify correct data (`quiz_type`, `quiz_questions`) is prepared and sent to the backend API on form submission.

### 6.3. Frontend Testing (Student Course Player)
*   [ ] **Component/E2E Tests:**
    *   **Quiz Locking/Unlocking:**
        *   Quiz locked if video not watched.
        *   "Start Quiz" button appears after video completion (if quiz not already done).
        *   "Quiz Completed" and score displayed if quiz already done.
    *   **Manual Quiz Flow:**
        *   "Start Quiz" -> manual questions load correctly.
        *   2-minute timer starts and is visible.
        *   Answers can be selected.
        *   Submission (manual or timer end) calls server action.
        *   Results display correctly.
        *   Quiz cannot be retaken.
    *   **AI-Generated Quiz Flow:**
        *   "Start Quiz" -> loading indicator shown.
        *   AI questions load (mock AI service response for testing).
        *   2-minute timer starts and is visible.
        *   Answers can be selected.
        *   Submission calls server action.
        *   Results display correctly (even if simple completion/score).
        *   Quiz cannot be retaken.
    *   Error handling for API calls (fetching content, submitting quiz, AI service).

### 6.4. End-to-End Scenarios
*   [ ] Full administrator flow: Create a lesson, select "Manual Quiz," add questions.
*   [ ] Full student flow (Manual Quiz): Access course, watch video, quiz unlocks, take & submit manual quiz, view results.
*   [ ] Full administrator flow: Create a lesson, select "AI-Generated Quiz."
*   [ ] Full student flow (AI Quiz): Access course, watch video, quiz unlocks, start AI quiz (questions generated), take & submit AI quiz, view results.

## 7. Open Questions & Future Considerations

*   **AI Service Details:**
    *   Which specific AI service will be used for question generation?
    *   What are its API endpoints, authentication methods, and request/response formats?
    *   What parameters can be passed to influence question generation (e.g., lesson topic, difficulty, number of questions)?
    *   How are answers to AI-generated questions evaluated or scored? Does the AI service provide this, or will a simple completion/placeholder score be used initially?
*   **Admin Review of AI Quizzes:** Is there a need for admins to review or approve AI-generated questions before students see them? (Out of scope for V1 of this plan, assumes direct generation).
*   **Error Handling for AI Service:** Robust strategies if the AI service is down or returns errors.
*   **Cost Implications:** AI service usage may have associated costs.
*   **Advanced Quiz Features (Future):**
    *   Different question types for AI quizzes.
    *   Adaptive difficulty.
    *   Feedback on answers.
    *   Support for images or other media in AI-generated questions.
*   **Retake Policy:** Currently one attempt. Future enhancements might allow configurable retakes.
*   **Accessibility:** Ensuring AI-generated content is presented accessibly.

This plan provides a roadmap for implementing the enhanced quiz system. Each task can be further broken down during development sprints. 