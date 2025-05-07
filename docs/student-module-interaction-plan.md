# Student Module Interaction Plan

## 1. Overview

This document provides a detailed plan for integrating the frontend Student UI with the backend APIs required for students to fetch content for, interact with, and complete Course and Assessment modules.

This plan assumes:
- The Student Dashboard (`/app/dashboard`) is populated using the `GET /api/app/progress` endpoint, which provides a list of assigned products and their modules with summary progress.
- Backend APIs for students to *update* course progress (`PATCH /api/app/progress/course/[moduleId]`) and *submit* assessments (`POST /api/app/assessments/[moduleId]/submit`) are implemented and tested (as per `docs/api-testing-plan-progress-tracking.md`).
- This plan focuses on the **student-facing APIs needed to retrieve the actual content/details of modules** to enable interaction, and then connecting to the existing progress/submission APIs.

**Dependencies:**
- `docs/prd.md`: For feature requirements.
- `docs/implementation-plan.md`: For overall project structure.
- `docs/backend-feature-implementation-plan.md`: For backend API design context.
- `docs/api-testing-plan-progress-tracking.md`: For status of existing progress/submission APIs.

**Required Permissions:**
For the student-facing APIs to function correctly, the following Row Level Security (RLS) policies must be configured in Supabase:

1. Allow students to view client product assignments for their client:
```sql
CREATE POLICY "Students: View assignments for their client" ON client_product_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.id = auth.uid() 
    AND students.client_id = client_product_assignments.client_id
  )
);
```

2. Allow students to view products assigned to their client:
```sql
CREATE POLICY "Students: View products assigned to their client" ON products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN client_product_assignments cpa ON s.client_id = cpa.client_id
    WHERE s.id = auth.uid() AND cpa.product_id = products.id
  )
);
```

3. Ensure modules are readable by students (this policy should already exist):
```sql
CREATE POLICY "Allow authenticated users to read modules" ON modules
FOR SELECT
TO authenticated
USING (true);
```

## 2. Core Principle: Student-Facing Content APIs & Server Actions for Mutations

To interact with a course or assessment, a student needs to fetch its detailed content. The main `GET /api/app/progress` endpoint provides a summary. Dedicated API endpoints are needed for fetching the full content of a specific module. For data mutations (saving progress, submitting answers), Next.js Server Actions will be used to simplify client-server interaction and leverage the framework's capabilities.

**Backend Pre-requisite (implemented and tested):**
- ✅ **Course Content API:** Endpoint `GET /api/app/courses/[moduleId]/content` returns course details, lessons, and student progress.
    - Course module details (name, description).
    - A structured list of lessons in sequence:
        - Lesson ID, title/name, description, sequence.
        - Video URL (e.g., from Supabase storage).
        - **For lessons with quizzes (in-lesson quizzes):**
            - `quiz_questions`: An array of quiz question objects, each including:
                - `id`: Question ID.
                - `text`: Question text.
                - `type`: Question type (e.g., 'MCQ', 'MSQ').
                - `options`: An array of option objects (e.g., `{ id: string, text: string }`).
            - (Correct answers are NOT sent to the client for in-lesson quizzes; evaluation might occur on progress update or course completion).
    - **Student's current detailed progress within *this specific course***:
        - `last_viewed_lesson_sequence`: The sequence of the last viewed lesson.
        - `video_playback_position`: The position in the video for the last viewed lesson.
        - `fully_watched_video_ids`: An array of lesson video IDs that the student has watched to completion.
        - `lesson_quiz_attempts`: (Potentially, if scores are stored per attempt) An object/array storing results of in-lesson quiz attempts, including score and pass/fail status.
- ✅ **Assessment Content API:** Endpoint `GET /api/app/assessments/[moduleId]/details` returns assessment details, questions, and in-progress attempts (Note: The 5-question/4-to-pass rule does not apply to these full assessments, only in-lesson quizzes).

**Server Actions for Mutations:**
- ✅ **Update Course Progress Server Action:** Implemented as `updateCourseProgressAction` in `app/actions/progress.ts`. Handles updates to a student's course module progress (replaces `PATCH /api/app/progress/course/[moduleId]`).
    - When handling `lesson_quiz_submission`, this action will also be responsible for grading the quiz (assuming 5 questions, 4/5 correct to pass), storing the score and pass/fail status within `progress_details.lesson_quiz_attempts`, and returning this outcome in its response. If a quiz is passed, this action should also update `last_completed_lesson_id`.
- ✅ **Save Partial Assessment Progress Server Action:** Implemented as `saveAssessmentProgressAction` in `app/actions/assessment.ts`. Replaces the previous API Route `PATCH /api/app/assessments/[moduleId]/save-progress`. Allows saving current answers/timer state without submitting.
- ✅ **Submit Assessment Server Action:** Implemented as `submitAssessmentAction` in `app/actions/assessment.ts`. Replaces the previous API Route `POST /api/app/assessments/[moduleId]/submit`. Handles final submission, grading, and result recording.

**Required RLS Policies for Content APIs & Server Actions:**
In addition to the policies for the progress overview API, these endpoints will require additional policies:

1.  ✅ For course content access (lessons):
```sql
CREATE POLICY "Students: Access course content" ON lessons 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM modules m
    JOIN client_product_assignments cpa ON m.product_id = cpa.product_id
    JOIN students s ON cpa.client_id = s.client_id
    WHERE m.id = lessons.module_id AND s.id = auth.uid()
  )
);
```
2.  ✅ For assessment question access:
```sql
-- For assessment_questions table
CREATE POLICY "Student: SELECT assessment questions" 
ON assessment_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = auth.uid()
    AND students.is_active = true
  )
);

-- For assessment_module_questions table
CREATE POLICY "Student: SELECT assessment module questions" 
ON assessment_module_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = auth.uid()
    AND students.is_active = true
  )
);
```

3.  ✅ For saving and updating assessment progress:
```sql
-- For selection
CREATE POLICY "Student: SELECT own assessment progress" ON assessment_progress
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- For insertion
CREATE POLICY "Student: INSERT own assessment progress" ON assessment_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- For updates
CREATE POLICY "Student: UPDATE own assessment progress" ON assessment_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);
```

**Database Schema Requirements:**
For assessment progress tracking to work properly, ensure the `assessment_progress` table has these columns:

```sql
ALTER TABLE assessment_progress 
  ADD COLUMN IF NOT EXISTS saved_answers JSONB,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS remaining_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS timer_paused BOOLEAN DEFAULT FALSE,
  ALTER COLUMN submitted_at DROP NOT NULL;
```
(✅ Status: Columns added and verified)

For in-lesson quiz tracking (scores per attempt, if needed beyond simple completion):
```sql
-- Example: student_module_progress.progress_details (JSONB) could include a structure like:
-- "lesson_quiz_attempts": {
--   "lessonId1": [{ "score": 80, "submitted_at": "timestamp", "answers": { ... } }],
--   "lessonId2": [{ "score": 100, "submitted_at": "timestamp", "answers": { ... } }]
-- }
```
(This is a conceptual schema addition, actual implementation might vary. Focus for now is on video completion and quiz unlock.)

---

## 3. Course Module Interaction (Student UI)

This section details the frontend integration for a student engaging with a specific Course Module, emphasizing progress saving and resumption.

### 3.1. Fetching and Displaying Course Content

-   [✅] **Navigate to Course Player Page (e.g., `app/(app)/app/course/[id]/page.tsx`)**
    -   [✅] When a student clicks on a course module from their dashboard, navigate to its dedicated page, passing the `moduleId`.
-   [✅] **API Call: Fetch Course Module Content & Progress**
    -   [✅] On page load, make a `GET` request to the student-facing `GET /api/app/courses/[moduleId]/content`.
    -   [✅] **Request Handling:**
        -   [✅] Implement loading state (e.g., skeleton UI for course layout).
        -   [✅] Implement error state (e.g., "Could not load course content. Please try again.") if the API call fails.
-   [✅] **Parse API Response and Store Data**
    -   [✅] Store the fetched course structure (lessons, video URLs, quiz details) and the student's detailed current progress (e.g., `last_viewed_lesson_sequence`, video position, `fully_watched_video_ids`, `lesson_quiz_attempts`) in client-side state.
-   [✅] **Render Course Player UI & Restore Progress** (Basic rendering exists, 3.1.1 focuses on major enhancements)
    -   [✅] Display the course module name/title.
    -   [✅] **Lesson Navigation:**
        -   [✅] Implement UI for sequential navigation.
        -   [✅] Automatically navigate to the `last_viewed_lesson_sequence` (or the first lesson if no progress).
        -   [✅] Visually indicate completed lessons, current lesson, and pending lessons based on fetched progress.
    -   [✅] **Video Display:**
        -   [✅] For the current lesson, if it's a video, embed an MP4 player and load the `video_url`.
        -   [✅] If progress data includes a video playback position, attempt to seek to that position.
        -   [✅] Handle video player events (play, pause, timeupdate, ended) for progress tracking.
    -   [✅] **Quiz Display (for lessons with quizzes):**
        -   [✅] Display quiz questions (MCQ) and options.
        -   [✅] Each in-lesson quiz will consist of 5 questions.
        -   [✅] Implement quiz locking/unlocking based on video completion (see 3.1.1).
        -   [✅] Implement a 2-minute timer for each in-lesson quiz attempt.
        -   [✅] User answers are tracked locally during the attempt.
        -   [✅] **No partial progress saving for in-lesson quizzes**: Answers are only submitted when the timer ends or the user manually submits.
        -   [✅] On submission (timer end or manual), collect final answers and call a Server Action to record the attempt (e.g., score, answers if needed for review by admins, timestamp). This action will grade the quiz (5 questions, requiring 4/5 correct answers to pass), record the attempt details (including score and pass/fail status) in `progress_details.lesson_quiz_attempts`, and return the score and pass/fail status to the client. See Section 2 for Server Action details.

### 3.1.1. Course Player UI/UX Enhancements
-   [✅] **Task: Implement Dark Mode Styling**
    -   Details: Review and update all components on the Course Player page for optimal appearance and usability in dark mode. Ensure proper color contrast for text, icons, and interactive elements. This includes the main layout, lesson navigation, video player area, and progress indicators.
-   [✅] **Task: Standardize Video Player Aspect Ratio**
    -   Details: Adjust the video player styling to consistently maintain a 16:9 aspect ratio, ensuring a professional and uniform look for all video content.
-   [✅] **Task: Implement Controlled Video Scrubbing**
    -   Details: Enhance the video watching experience by controlling the scrubbing (seek bar) functionality based on whether the student has watched the video before.
        -   [✅] Backend: Modify `student_module_progress.progress_details` to store a "first watch completed" status for each lesson video (could use `fully_watched_video_ids` from below or a dedicated flag like `lesson_first_watch_completed: Record<string, boolean>`).
        -   [✅] Backend: Update the `updateCourseProgressAction` Server Action to accept and save this "first watch completed" status when a video is fully watched for the first time.
        -   [✅] Frontend: Update `CoursePageData` and related types to include the "first watch completed" status for each lesson.
        -   [✅] Frontend: On lesson load, check if the current lesson's video has been fully watched before.
        -   [✅] Frontend: If it's the first watch:
            -   [✅] Disable the video progress bar/scrubbing capability. The student should be able to play/pause but not seek through the video.
            -   [✅] Consider hiding default video controls and providing minimal custom play/pause button if necessary, or overlaying the seek bar to prevent interaction.
        -   [✅] Frontend: If the video has been fully watched at least once:
            -   [✅] Enable the video progress bar/scrubbing, allowing the student to rewatch and navigate freely within the video.
        -   [✅] Frontend: When a video is watched to completion for the first time (`onEnded` event), call `updateCourseProgressAction` to save its "first watch completed" status.
-   [✅] **Task: Implement Quiz Locking Based on Video Completion & Timed Attempts**
    -   Details: Ensure that the quiz associated with a lesson only becomes accessible after the student has fully watched the lesson's video. Each attempt will be timed.
        -   [✅] **Backend (Video Completion Tracking - as previously defined):**
            -   [✅] Modify `student_module_progress.progress_details` in the database to store an array of lesson video IDs that the student has watched to completion (e.g., `fully_watched_video_ids: string[]`).
            -   [✅] Update the `updateCourseProgressAction` Server Action:
                -   Accept a `lessonVideoIdCompleted` parameter (or similar).
                -   When a video's `onEnded` event triggers this action, add the `lessonVideoIdCompleted` to the `fully_watched_video_ids` array in `progress_details` if not already present.
            -   [✅] Ensure the `GET /api/app/courses/[moduleId]/content` API endpoint returns the `fully_watched_video_ids` array as part of the student's progress object.
        -   [✅] **Frontend (Quiz Locking & Timer):**
            -   [✅] Update `CoursePageData` (and related TypeScript interfaces) to include `fully_watched_video_ids: string[]` within the `progress` object.
            -   [✅] In the Course Player page, when a lesson with a quiz is loaded:
                -   [✅] Check if the current `lesson.id` (or a specific `lesson.video_id` if different) is present in `coursePageData.progress.fully_watched_video_ids`.
                -   [✅] If the video ID is NOT present:
                    -   [✅] Display the quiz section as "locked" (e.g., visually greyed out, overlay with a lock icon).
                    -   [✅] Show a message like "Please complete the video to unlock the quiz."
                    -   [✅] Prevent any interaction with the quiz questions (e.g., disable radio buttons/checkboxes).
                -   [✅] If the video ID IS present:
                    -   [✅] Unlock the quiz section.
                    -   [✅] Display a "Start Quiz" button.
            -   [✅] **Starting a Quiz Attempt:**
                -   [✅] When "Start Quiz" is clicked:
                    -   [✅] Hide the "Start Quiz" button.
                    -   [✅] Make quiz questions interactive.
                    -   [✅] Start a 2-minute countdown timer displayed to the user.
            -   [✅] **During Quiz Attempt:**
                -   [✅] Track answers locally (e.g., in React state).
                -   [✅] **No calls to save partial quiz progress.**
                -   [✅] User can change answers as long as time remains.
                -   [✅] Provide a manual "Submit Quiz" button.
            -   [✅] **Quiz Submission (Timer End or Manual):**
                -   [✅] When the timer reaches 0 OR the user clicks "Submit Quiz":
                    -   [✅] Disable quiz inputs.
                    -   [✅] Collect the current set of answers.
                    -   [✅] Call a Server Action (e.g., `submitLessonQuizAction` or extend `updateCourseProgressAction`):
                        -   [✅] Payload: `moduleId`, `lessonId`, `answers`, `time_taken` (optional).
                        -   [✅] This action will record the attempt, **grade the quiz (5 questions, requiring 4/5 correct answers to pass)**, store results (score, pass/fail, answers, timestamp) in `progress_details.lesson_quiz_attempts`, and return the score and pass/fail status to the client. If passed, `last_completed_lesson_id` for the lesson is also set by the server action.
                        -   [✅] **Handle server response and provide feedback:**
                            -   [✅] If quiz is passed (e.g., score >= 4/5 returned by server):
                                -   [✅] Display a success message (e.g., 'Congratulations! You passed the quiz with X/5.').
                                -   [✅] Automatically navigate to the next lesson if available. If it's the last lesson, display a course completion message or guide to next steps.
                            -   [✅] If quiz is failed (e.g., score < 4/5 returned by server):
                                -   [✅] Display a message indicating failure and the score (e.g., 'You scored X/5. You need 4/5 to pass. Please try again.').
                                -   [✅] The quiz area should revert to a state allowing the student to click 'Start Quiz' again for a new attempt (timer resets, previous answers cleared).
                        -   [✅] The quiz area might then show a summary of the attempt or revert to a locked/completed state for that lesson (after summary dismissal). -> Behavior now depends on pass/fail: revert to "Start Quiz" on fail, or show completed/move on pass.
            -   [✅] **Video Completion Callback:**
                -   [✅] When the video player's `onEnded` event fires for a lesson video:
                    -   [✅] Call `updateCourseProgressAction` with the `lessonVideoIdCompleted` (which would be the current `lesson.id` or `lesson.video_id`).
                    -   [✅] Upon successful save, refresh the local `coursePageData.progress.fully_watched_video_ids` to include the newly completed video ID.
                    -   [✅] Re-evaluate the quiz lock state to unlock it (display "Start Quiz" button).

### 3.2. Tracking and Updating Course Progress

-   [✅] **Identify Lesson Completion Criteria & Interim Progress Points:** (Partially addressed: video `onEnded` for video lessons, `timeupdate` for video playback. Quiz submission needed for quiz-based completion).
    -   [✅] Define client-side logic for when a lesson is "completed" (e.g., video fully watched, **and** in-lesson quiz submitted/passed if applicable).
    -   [✅] Define triggers for saving interim progress (e.g., every X seconds of video playback, ~~on changing an answer in a lesson quiz~~, before navigating away from a lesson). (Video playback part exists. No saving on quiz answer change).
-   [✅] **Server Action Call: Update Course Progress** (Fully implemented with video progress)
    -   [✅] Construct the payload for the Server Action. This should conform to `CourseProgressUpdateSchema` or a similar validated type. It might include:
            -   `moduleId`.
            -   `current_lesson_id` or `current_lesson_sequence`.
            -   `video_playback_position` (if applicable).
            -   `lesson_quiz_submission`: (If submitting quiz via this action) An object containing `{ lessonId, answers, score (if graded on backend) }`.
            -   Updated `status` (e.g., "InProgress").
            -   Calculated `progress_percentage` (can be complex, may rely on backend to recalculate based on fine-grained progress).
            -   `lessonVideoIdCompleted` (when a video is fully watched).
        -   [✅] Invoke the `updateCourseProgress` Server Action with the payload.
    -   [✅] **Response Handling:** (Basic exists)
        -   [✅] On success (e.g., the Server Action returns successfully, potentially with updated progress data), update the local UI to reflect the saved progress (e.g., mark lesson as complete in navigation, update overall progress bar, unlock quiz/show quiz result).
        -   [✅] The Server Action might return the updated overall progress for the module, which can be used to refresh the UI.
        -   [✅] On failure (e.g., the Server Action throws an error or returns an error object), provide feedback to the student (e.g., "Could not save progress. Please check your connection.").
    -   [✅] Use this progress data (e.g., `last_viewed_lesson_sequence`, specific video position, `fully_watched_video_ids`, `lesson_quiz_attempts`) to automatically restore the student's state within the course.

### 3.3. Handling Course Completion

-   [✅] **Determine Course Completion:**
    -   [✅] When the `updateCourseProgress` Server Action indicates the course is fully completed (e.g., returns `status: "Completed"`, `progress_percentage: 100`), update the UI accordingly.
    -   [✅] Display a completion message or navigate to a summary/next steps page if applicable.
    -   [✅] Ensure the main dashboard (`GET /api/app/progress`) will reflect this completion status on next load.

---

## 4. Assessment Module Interaction (Student UI)

This section details the frontend integration for a student engaging with a specific Assessment Module, emphasizing progress saving and resumption. **Note: The 2-minute time limit and no-progress-saving rule apply *only* to in-lesson quizzes (Section 3), not these full assessment modules.**

### 4.1. Fetching and Displaying Assessment Details

-   [✅] **Navigate to Assessment Page (e.g., `app/(app)/app/assessment/[id]/page.tsx`)**
    -   [✅] When a student clicks on an assessment module from their dashboard, navigate to its dedicated page, passing the `moduleId`. (Page created, navigation from dashboard still pending).
-   [✅] **API Call: Fetch Assessment Module Details & In-Progress Attempt**
    -   [✅] On page load, make a `GET` request to the student-facing `GET /api/app/assessments/[moduleId]/details`.
    -   [✅] **Request Handling:**
        -   [✅] Implement loading state.
        -   [✅] Implement error state.
        -   [✅] If the API indicates the student cannot take/resume the assessment (e.g., already submitted max attempts and no retakes, overall deadline passed), display an appropriate message and prevent starting/resuming.
-   [✅] **Parse API Response and Store Data**
    -   [✅] Store the fetched assessment structure (name, instructions, time limit, questions) and any *in-progress attempt data* (saved answers, timer state) in client-side state.
-   [✅] **Render Assessment UI (Pre-Start / Resume)**
    -   [✅] Display assessment name and instructions.
    -   [✅] Clearly display the time limit.
    -   [✅] If an in-progress attempt exists:
        -   [✅] Display a "Resume Assessment" button.
        -   [✅] Optionally, show some indication of previous progress (e.g., "You have X questions answered").
    -   [✅] Else (no in-progress attempt):
        -   [✅] Provide a "Start Assessment" button.

### 4.2. Taking the Assessment

-   [✅] **Start/Resume Assessment Action:**
    -   [✅] When "Start Assessment" or "Resume Assessment" is clicked:
        -   [✅] **Timer Initialization:**
            -   [✅] If resuming and timer state (e.g., remaining time or original start time) was fetched, initialize the countdown timer accordingly.
            -   [✅] If starting fresh, initialize and start the countdown timer based on the fetched `time_limit`.
        -   [✅] Display the questions. If resuming, pre-fill answers from the fetched in-progress attempt data.
-   [✅] **Answering Questions:**
    -   [✅] For each question:
        -   [✅] Display question text.
        -   [✅] Render answer inputs based on `question_type`.
        -   [✅] Store the student's selected answer(s) locally for each question ID, updating any previously saved/loaded answers.
    -   [✅] Implement navigation between questions if applicable.
-   [✅] **Saving Partial Progress (Auto-save / On Navigate):**
    -   [✅] Implement logic to periodically auto-save the student's current answers and timer state (e.g., every minute).
    -   [✅] OR/AND Implement logic to save progress when the student attempts to navigate away from the assessment page (e.g., using `beforeunload` event, or a specific "Save and Exit" button).
    -   [✅] **Server Action Call:** Use the `saveAssessmentProgress` Server Action.
        -   [✅] **Payload:** `moduleId`, current answers for all questions answered so far, and current timer state (e.g., remaining time).
        -   [✅] **Response Handling:** Handle success (silently for auto-save) or failure (e.g., notify user if a manual "Save and Exit" fails). The Server Action should return a success status and potentially the saved data.
-   [✅] **Timer Management:**
    -   [✅] If the timer expires before manual submission:
        -   [✅] Automatically trigger the submission process (see 4.3).
        -   [✅] Optionally disable further input.

### 4.3. Submitting the Assessment

-   [✅] **Manual Submission Action:**
    -   [✅] Provide a "Submit Assessment" button (this is for FINAL submission).
    -   [✅] On click, confirm with the student if they are sure (optional).
-   [✅] **Server Action Call: Submit Assessment Answers**
    -   [✅] Collect all student answers stored locally. The payload for the `submitAssessment` Server Action should be structured according to `AssessmentSubmissionSchema` (as per backend plans), likely `{ moduleId: string, answers: { question_id: string, answer: any }[] }`.
    -   [✅] Invoke the `submitAssessment` Server Action with the payload.
    -   [✅] **Request Handling:**
        -   [✅] Display a loading/submitting state.
        -   [✅] On success (e.g., the Server Action returns successfully), the action should return the assessment results (score, passed/failed status).
        -   [✅] On failure (e.g., Server Action throws an error or returns an error object for invalid data, not allowed to submit, or internal server error), display an appropriate error message.
-   [✅] **Display Assessment Results:**
    -   [✅] Parse the successful API response.
    -   [✅] Display the student's score and pass/fail status.
    -   [✅] Optionally, provide a link back to the dashboard or a summary page.
    -   [✅] Ensure the main dashboard (`GET /api/app/progress`) will reflect this submission and results on next load.

---

## 5. General UI/UX Considerations for Modules

-   [✅] **Loading States:** Implement clear loading indicators (spinners, skeleton UI) for all API calls (fetching content, submitting progress/answers). (Course player skeleton UI added)
-   [✅] **Error Handling:** Provide user-friendly error messages for API failures or validation issues.
-   [✅] **Responsiveness:** Ensure both course player and assessment interfaces are fully responsive and usable on mobile devices as per PRD requirements.
-   [✅] **Accessibility (WCAG):** Keep accessibility guidelines in mind during component development (keyboard navigation, ARIA attributes, color contrast).
-   [✅] **State Management:** Choose appropriate client-side state management solutions (React state, Context, Zustand, React Query/SWR for server state) to handle module data, student answers, and UI state.
-   [✅] **API Client/Wrapper:** Utilize a consistent method/wrapper for making API calls, handling headers (including auth token via Supabase SSR/client instance), and parsing responses. 