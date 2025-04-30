# Progress Tracking API Testing Plan

This document outlines the steps and checks for testing the Progress Tracking API endpoints.

**Testing Prerequisites:**

*   [x] **Database Schema Setup:**
    *   [x] `profiles`, `clients`, `products`, `modules` tables exist.
    *   [x] `student_module_progress` table exists (replaces `course_progress` from docs).
    *   [x] `assessment_questions`, `assessment_module_questions`, `assessment_progress` tables created.
    *   [ ] `course_lessons` table not found/created (may not be needed).
*   [x] **RLS Setup (Initial):**
    *   [x] RLS enabled on `student_module_progress` and `assessment_progress`.
    *   [x] Policies added for Student self-access (SELECT/INSERT/UPDATE/DELETE) on both progress tables.
    *   [x] Policy added for Client Staff SELECT access on both progress tables (based on `client_id` in `profiles`).
    *   [ ] RLS for `assessment_questions`, `assessment_module_questions` TBD.
    *   [ ] Policies for Admin/Viewer roles TBD.
*   [ ] **Set up Test Data:** Ensure you have test users with 'Student', 'Client Staff', and 'Viewer' roles in your Supabase project.
*   [ ] **Create Sample Content:** Have sample clients, products, modules (including at least one 'Assessment' type module), and corresponding questions.
*   [x] **Establish Relationships:**
    *   [x] Assign Client Staff to a specific client.
    *   [x] Enroll Students in specific products/modules belonging to that client. (Via client assignment)
    *   [x] Ensure at least one student is *not* part of the Client Staff's client for testing access control. (Confirmed: student ID 0d11a7d1-820f-42c6-a9fd-4976c84a20e2)
*   [x] **Authentication Method:** Prepare a method to make authenticated API requests (e.g., Postman with auth tokens, `curl` commands, or a test script) for each role. Obtain valid tokens/cookies for a Student, a Client Staff member, and a Viewer. (Method: Supabase Dashboard/Direct Testing)
*   [x] **Identify IDs:** Note down relevant UUIDs for testing:
    *   `studentId`: `10600a08-666a-441d-931a-f94e3bf3281e` (Primary test student, client: `413babb5-94a1-4a3e-bd1e-dbd77e8bca63`)
    *   `otherStudentId`: `0d11a7d1-820f-42c6-a9fd-4976c84a20e2` (Student in different client)
    *   `clientStaffId`: `78c45406-5214-446d-b646-5c1209657ea4` (Client: `413babb5-94a1-4a3e-bd1e-dbd77e8bca63`)
    *   `adminId` (Viewer): `a9982dbb-a12e-40bd-9743-3a1820af0448`
    *   `clientId`: `413babb5-94a1-4a3e-bd1e-dbd77e8bca63` (Test University)
    *   `productId`: `aa886f78-4018-4e59-bb83-5ca608838000` (Introduction to Testing)
    *   `moduleId`: `bff932c3-e82d-41e5-a61b-dd1a0bf4ffdd` (Lesson 1: Basics - course type)
    *   `assessmentModuleId`: `9c6d51f3-60fd-4c51-a9a9-fb703c19db42` (Quiz 1 - Assessment type)
    *   `questionId`: `3d2f94f0-0a9b-4da3-8e62-58aef90928d0` (Linked to assessment module)
    *   `lessonId`: (Not applicable currently)

**Testing Checklist:**

**1. Student Role (`/api/app/...`)**

*   [ ] **`PATCH /api/app/progress/course/[moduleId]` (Update Module Progress):**
    *   [ ] Send a PATCH request as a **Student** to update a module's status to 'in-progress'. Verify a 200 OK response and correct data.
    *   [ ] Send another PATCH request for the same module to update status to 'completed' and set `progress_percentage` to 100. Verify 200 OK.
    *   [ ] Attempt to PATCH progress for a module the student is *not* enrolled in. Verify a 403 Forbidden or relevant error.
    *   [ ] Send invalid data (e.g., wrong status enum, percentage > 100). Verify a 400 Bad Request.
*   [ ] **`POST /api/app/assessments/[moduleId]/submit` (Submit Assessment):**
    *   [ ] Send a POST request as a **Student** to submit valid answers for an `assessmentModuleId`. Verify a 201 Created response with score/passed status.
    *   [ ] Attempt to submit the *same* assessment again. Verify expected behavior (e.g., 409 Conflict or specific error if resubmission isn't allowed).
    *   [ ] Attempt to submit to a non-assessment `moduleId`. Verify a relevant error (e.g., 400 Bad Request).
    *   [ ] Attempt to submit for an assessment the student is *not* enrolled in. Verify a 403 Forbidden or relevant error.
    *   [ ] Send invalid data in the body. Verify a 400 Bad Request.
*   [ ] **`GET /api/app/progress` (Get Own Progress):**
    *   [ ] Send a GET request as a **Student**. Verify a 200 OK response.
    *   [ ] Check if the response accurately reflects the progress updates and assessment submissions made in the previous steps.
    *   [ ] Ensure only the student's own progress is returned.

**2. Client Staff Role (`/api/client-staff/progress`)**

*   [ ] **`GET /api/client-staff/progress` (Get Client's Student Progress):**
    *   [ ] Send a GET request as **Client Staff** with no query parameters. Verify a 200 OK response containing progress data *only* for students associated with the staff's client.
    *   [ ] Send a GET request filtered by a valid `studentId` (belonging to the staff's client). Verify 200 OK and correct filtered data.
    *   [ ] Send a GET request filtered by a `studentId` *not* belonging to the staff's client. Verify 200 OK with empty results or a 403 Forbidden (depending on implementation).
    *   [ ] Send a GET request filtered by a valid `productId`. Verify 200 OK and correct filtered data.
    *   [ ] Send a GET request filtered by a valid `moduleId`. Verify 200 OK and correct filtered data.
    *   [ ] Send a GET request with combined valid filters (e.g., `studentId` and `moduleId`). Verify 200 OK and correct filtered data.
    *   [ ] Send a GET request with invalid filter values (e.g., non-UUID). Verify 400 Bad Request.
    *   [ ] Attempt the GET request as a **Student**. Verify 403 Forbidden.

**3. Viewer Role (`/api/viewer/reports`)**

*   [ ] **`GET /api/viewer/reports` (Get Aggregated Reports):**
    *   [ ] Send a GET request as **Viewer** with no query parameters. Verify 200 OK and aggregated data (structure depends on the `get_aggregated_progress_report` function).
    *   [ ] Send a GET request filtered by a valid `clientId`. Verify 200 OK and correctly filtered aggregated data.
    *   [ ] Send a GET request filtered by a valid `productId`. Verify 200 OK and correctly filtered aggregated data.
    *   [ ] Send a GET request with invalid filter values. Verify 400 Bad Request.
    *   [ ] Attempt the GET request as a **Student**. Verify 403 Forbidden.
    *   [ ] Attempt the GET request as **Client Staff**. Verify 403 Forbidden (unless permissions allow). 