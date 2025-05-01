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
    *   `assessmentModuleId`: `82f2a68d-0a24-4a95-99a5-0a232077fcfd` (Quiz 1 - Assessment type)
    *   `questionId`: `3d2f94f0-0a9b-4da3-8e62-58aef90928d0` (Linked to assessment module)
    *   `lessonId`: (Not applicable currently)

**Testing Checklist:**

**1. Student Role (`/api/app/...`)**

*   [x] **`PATCH /api/app/progress/course/[moduleId]` (Update Module Progress):**
    *   [x] Send a PATCH request as a **Student** to update a module's status to 'in-progress'. Verify a 200 OK response and correct data. (Tested: 2025-04-30)
    *   [x] Send another PATCH request for the same module to update status to 'completed' and set `progress_percentage` to 100. Verify 200 OK. (Tested: 2025-05-01)
    *   [x] Attempt to PATCH progress for a module the student is *not* enrolled in. Verify a 403 Forbidden or relevant error. (Tested: 2025-05-01)
    *   [x] Send invalid data (e.g., wrong status enum, percentage > 100). Verify a 400 Bad Request. (Tested: 2025-05-01)
*   [x] **`POST /api/app/assessments/[moduleId]/submit` (Submit Assessment):**
    *   [x] Send a POST request as a **Student** to submit valid answers for an `assessmentModuleId`. Verify a 201 Created response with score/passed status. (Tested: 2025-05-01)
    *   [x] Attempt to submit the *same* assessment again. Verify expected behavior (e.g., 409 Conflict or specific error if resubmission isn't allowed). (Tested: 2025-05-01)
    *   [x] Attempt to submit to a non-assessment `moduleId`. Verify a relevant error (e.g., 400 Bad Request). (Tested: 2025-05-01)
    *   [x] Attempt to submit for an assessment the student is *not* enrolled in. Verify a 403 Forbidden or relevant error. (Tested: 2025-05-01)
    *   [x] Send invalid data in the body. Verify a 400 Bad Request. (Tested: 2025-05-01)
*   [x] **`GET /api/app/progress` (Get Own Progress):**
    *   [x] Send a GET request as a **Student**. Verify a 200 OK response. (Tested: 2025-05-01)
    *   [x] Check if the response accurately reflects the progress updates and assessment submissions made in the previous steps. (Verified: 2025-05-01)
    *   [x] Ensure only the student's own progress is returned. (Verified: 2025-05-01)

**2. Client Staff Role (`/api/client-staff/progress`)**

*   [ ] **`GET /api/client-staff/progress` (Get Client's Student Progress):**
    *   [x] Send a GET request as **Client Staff** with no query parameters. Verify a 200 OK response containing progress data *only* for students associated with the staff's client. (Tested: 2025-05-02)
    *   [x] Send a GET request filtered by a valid `studentId` (belonging to the staff's client). Verify 200 OK and correct filtered data. (Verified: 2025-05-02)
    *   [x] Send a GET request filtered by a `studentId` *not* belonging to the staff's client. Verify 404 Not Found. (Verified via code review: 2025-05-02)
    *   [x] Send a GET request filtered by a valid `productId`. Verify 200 OK and correct filtered data. (Verified: 2025-05-02)
    *   [x] Send a GET request filtered by a valid `moduleId`. Verify 200 OK and correct filtered data. (Verified: 2025-05-02)
    *   [x] Send a GET request with combined valid filters (e.g., `studentId` and `moduleId`). Verify 200 OK and correct filtered data. (Verified: 2025-05-02)
    *   [x] Send a GET request with invalid filter values (e.g., non-UUID). Verify 400 Bad Request. (Verified: 2025-05-02)
    *   [x] Attempt the GET request as a **Student**. Verify 403 Forbidden. (Verified: 2025-05-02)
    *   [x] Attempt the GET request as **Admin** without `clientId`. Verify 400 Bad Request. (Verified: 2025-05-02)

**3. Viewer Role (`/api/viewer/reports`)**

*   [x] **`GET /api/viewer/reports` (Get Aggregated Reports):**
    *   [x] Send a GET request as **Viewer** with no query parameters. Verify 200 OK and aggregated data (structure depends on the `get_aggregated_progress_report` function). (Tested: 2025-05-03)
    *   [x] Send a GET request filtered by a valid `clientId`. Verify 200 OK and correctly filtered aggregated data. (Verified: 2025-05-03)
    *   [x] Send a GET request filtered by a valid `productId`. Verify 200 OK and correctly filtered aggregated data. (Verified: 2025-05-03)
    *   [x] Send a GET request with invalid filter values. Verify 400 Bad Request. (Verified: 2025-05-03)
    *   [x] Attempt the GET request as a **Student**. Verify 403 Forbidden. (Verified: 2025-05-03)
    *   [x] Attempt the GET request as **Client Staff**. Verify 403 Forbidden. (Verified: 2025-05-03)

**Authentication / Authorization:**

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

**4. Admin Role Testing

This section covers endpoints primarily used by the 'Admin' role for managing core application data.

*   [ ] **Prerequisites:**
    *   [ ] Ensure an Admin user exists with valid credentials/token.
    *   [ ] Ensure RLS policies for Admin access are applied to relevant tables (`users`, `clients`, `products`, `modules`, `course_questions`, `assessment_questions`, etc.) granting full CRUD access.

*   [ ] **User Management (`/api/admin/users`)**
    *   [x] `GET /api/admin/users`:
        *   [x] Send GET as **Admin**. Verify 200 OK and a list of user profiles.
        *   [x] Send GET with `search` query param. Verify filtered results.
        *   [x] Send GET with `role` query param. Verify filtered results.
        *   [x] Send GET with `clientId` query param. Verify filtered results.
        *   [x] Send GET as **Student** or **Client Staff**. Verify 403 Forbidden with "Forbidden - Admin access required" message.
    *   [x] `POST /api/admin/users`:
        *   [x] Send POST as **Admin** with valid data (new email, password, role, name, client_id if applicable). Verify 201 Created and correct profile data returned. Verify user appears in user list.
        *   [x] Send POST with missing required fields (email, password, name, role). Verify 400 Bad Request.
        *   [x] Send POST with invalid email/password format. Verify 400 Bad Request.
        *   [x] Send POST with existing email. Verify 409 Conflict (or relevant error from Supabase Auth).
        *   [x] Send POST with role 'Client Staff' but missing `client_id`. Verify 400 Bad Request (based on schema refinement).
        *   [x] Send POST as **Student** or **Client Staff**. Verify 403 Forbidden.
    *   [x] `GET /api/admin/users/[userId]`:
        *   [x] Send GET as **Admin** with a valid `userId`. Verify 200 OK and correct user profile details.
        *   [x] Send GET with an invalid UUID format for `userId`. Verify 400 Bad Request.
        *   [x] Send GET with a non-existent `userId`. Verify 404 Not Found.
        *   [x] Send GET as **Student** or **Client Staff**. Verify 403 Forbidden.
    *   [x] `PUT /api/admin/users/[userId]`:
        *   [x] Send PUT as **Admin** with valid data (e.g., update `role`, `full_name`, `client_id`). Verify 200 OK and updated profile data. Verify changes reflect in user list/details.
        *   [x] Send PUT with invalid data (e.g., invalid `role` enum). Verify 400 Bad Request.
        *   [x] Send PUT with empty body. Verify 400 Bad Request.
        *   [x] Send PUT for non-existent `userId`. Verify 404 Not Found.
        *   [x] Send PUT as **Student** or **Client Staff**. Verify 403 Forbidden.
    *   [x] `DELETE /api/admin/users/[userId]`:
        *   [x] Send DELETE as **Admin** for an existing `userId`. Verify 204 No Content. Verify user is removed from list and cannot be fetched. Verify Auth user is deleted.
        *   [x] Send DELETE for a non-existent `userId`. Verify 404 Not Found (or 204 if deletion is idempotent).
        *   [x] Send DELETE as **Student** or **Client Staff**. Verify 403 Forbidden.

*   [x] **Client Management (`/api/admin/clients`)**
    *   [x] `GET /api/admin/clients`:
        *   [x] Send GET as **Admin**. Verify 200 OK and list of clients.
        *   [x] Send GET with `search` query param. Verify filtered results.
        *   [x] Send GET with `isActive` query param. Verify filtered results.
        *   [x] Send GET as **Student**. Verify 403 Forbidden. (Client Staff covered separately if `/api/staff/clients` exists).
    *   [x] `POST /api/admin/clients`:
        *   [x] Send POST as **Admin** with valid data (`name`). Verify 201 Created and correct client data.
        *   [x] Send POST with missing `name`. Verify 400 Bad Request.
        *   [x] Send POST as **Student**. Verify 403 Forbidden.
    *   [x] `GET /api/admin/clients/[clientId]`:
        *   [x] Send GET as **Admin** with a valid `clientId`. Verify 200 OK and correct client details.
        *   [x] Send GET with an invalid UUID format for `clientId`. Verify 400 Bad Request.
        *   [x] Send GET with a non-existent `clientId`. Verify 404 Not Found.
        *   [x] Send GET as **Student**. Verify 403 Forbidden.
    *   [x] `PUT /api/admin/clients/[clientId]`:
        *   [x] Send PUT as **Admin** with valid data (update `name`, `contact_email`, `is_active`). Verify 200 OK and updated client data.
        *   [x] Send PUT with invalid data (e.g., invalid email). Verify 400 Bad Request.
        *   [x] Send PUT for non-existent `clientId`. Verify 404 Not Found.
        *   [x] Send PUT as **Student**. Verify 403 Forbidden.
    *   [x] `DELETE /api/admin/clients/[clientId]`:
        *   [x] Send DELETE as **Admin** for an existing `clientId`. Verify 204 No Content. Verify client removed.
        *   [x] Send DELETE for a non-existent `clientId`. Verify 404 Not Found (or 204).
        *   [x] **Dependency Check:** Test deleting a client with assigned users/products (behavior depends on DB constraints/logic - should likely fail or cascade).
        *   [x] Send DELETE as **Student**. Verify 403 Forbidden.

*   [x] **Product Management (`/api/admin/products`)**
    *   [x] `GET /api/admin/products`:
        *   [x] Send GET as **Admin**. Verify 200 OK and list of products.
        *   [x] Send GET with `search` query param. Verify filtered results.
        *   [x] Send GET with `isActive` query param. Verify filtered results.
        *   [x] Send GET as **Student** or **Client Staff**. Verify 403 Forbidden.
    *   [x] `POST /api/admin/products`:
        *   [x] Send POST as **Admin** with valid data (`name`). Verify 201 Created and correct product data.
        *   [x] Send POST with missing `name`. Verify 400 Bad Request.
        *   [x] Send POST as **Student** or **Client Staff**. Verify 403 Forbidden.
    *   [x] `GET /api/admin/products/[productId]`:
        *   [x] Send GET as **Admin** with a valid `productId`. Verify 200 OK and correct product details (including modules if implemented).
        *   [x] Send GET with an invalid UUID format for `productId`. Verify 400 Bad Request.
        *   [x] Send GET with a non-existent `productId`. Verify 404 Not Found.
        *   [x] Send GET as **Student** or **Client Staff**. Verify 403 Forbidden.
    *   [x] `PUT /api/admin/products/[productId]`:
        *   [x] Send PUT as **Admin** with valid data (update `name`, `description`, `is_active`). Verify 200 OK and updated product data.
        *   [x] Send PUT for non-existent `productId`. Verify 404 Not Found.
        *   [x] Send PUT as **Student** or **Client Staff**. Verify 403 Forbidden.
    *   [x] `DELETE /api/admin/products/[productId]`:
        *   [x] Send DELETE as **Admin** for an existing `productId`. Verify 204 No Content. Verify product removed.
        *   [x] Send DELETE for a non-existent `productId`. Verify 404 Not Found (or 204).
        *   [x] **Dependency Check:** Test deleting a product with assigned modules/clients.
        *   [x] Send DELETE as **Student** or **Client Staff**. Verify 403 Forbidden.

*   [x] **Module Management (`/api/admin/products/[productId]/modules`, `/api/admin/modules/[moduleId]`)**
    *   [x] `GET /api/admin/products/[productId]/modules`:
        *   [x] Send GET as **Admin**. Verify 200 OK and list of modules for that product.
        *   [x] Send GET for non-existent `productId`. Verify 404 Not Found.
        *   [x] Send GET as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `POST /api/admin/products/[productId]/modules`:
        *   [x] Send POST as **Admin** with valid data (`name`, `type`). Verify 201 Created.
        *   [x] Send POST with invalid `type`. Verify 400 Bad Request.
        *   [x] Send POST for non-existent `productId`. Verify 404/400 error.
        *   [x] Send POST as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `GET /api/admin/modules/[moduleId]`:
        *   [x] Send GET as **Admin**. Verify 200 OK and module details (including lessons/questions as appropriate).
        *   [x] Send GET for non-existent `moduleId`. Verify 404 Not Found.
        *   [x] Send GET as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `PUT /api/admin/modules/[moduleId]`:
        *   [x] Send PUT as **Admin** with valid data (update `name`, `type`, `configuration`). Verify 200 OK.
        *   [x] Send PUT for non-existent `moduleId`. Verify 404 Not Found.
        *   [x] Send PUT as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `DELETE /api/admin/modules/[moduleId]`:
        *   [x] Send DELETE as **Admin**. Verify 204 No Content.
        *   [x] Send DELETE for non-existent `moduleId`. Verify 404 Not Found.
        *   [x] **Dependency Check:** Test deleting module with lessons/questions/progress data.
        *   [x] Send DELETE as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] **Lesson/Assessment Question Linkage (Sub-routes)**: Test relevant endpoints for adding/removing lessons (`/lessons`) or linking assessment questions (`/questions`) to modules.

*   [x] **Admin Access via Other Roles' Endpoints**
    *   [x] Verify Admin can successfully use `GET /api/client-staff/progress` (requires `clientId` param).
    *   [x] Verify Admin can successfully use `GET /api/viewer/reports` (works with or without `clientId`).

## 5. Assessment Functionality Testing

This section covers APIs related to creating, managing, and tracking assessments.

*   [x] **Prerequisites:**
    *   [x] Ensure `assessment_questions` and `assessment_module_questions` tables exist and have appropriate RLS (Admin: full access; potentially Client Staff: read access for modules in their client?).
    *   [x] Ensure `assessment_progress` table exists with RLS (Student: self CRUD; Client Staff: SELECT for own client; Admin/Viewer: SELECT all).
    *   [x] Ensure sample assessment questions and at least one 'Assessment' type module exist.

*   [x] **Question Bank Management (`/api/admin/question-banks`)**
    *   [x] `GET /api/admin/question-banks?type=assessment`:
        *   [x] Send GET as **Admin**. Verify 200 OK and list of assessment questions.
        *   [x] Send GET without `type=assessment`. Verify 400 Bad Request.
        *   [x] Send GET with filters (`search`, `tag`). Verify results.
        *   [x] Send GET as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `POST /api/admin/question-banks`:
        *   [x] Send POST as **Admin** with valid data (`bank_type='assessment'`, `question_text`, `question_type`, `options`, `correct_answer(s)`). Verify 201 Created.
        *   [x] Send POST with `bank_type='course'`. Verify it creates in `course_questions` (separate test).
        *   [x] Send POST without `bank_type`. Verify 400 Bad Request.
        *   [x] Send POST with invalid question structure (e.g., MCQ missing `correct_answer`). Verify 400 Bad Request.
        *   [x] Send POST as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `GET /api/admin/question-banks/[questionId]?type=assessment`:
        *   [x] Send GET as **Admin** with valid assessment `questionId`. Verify 200 OK.
        *   [x] Send GET without `type=assessment`. Verify 400 Bad Request.
        *   [x] Send GET for non-assessment `questionId`. Verify 404 Not Found (or 400).
        *   [x] Send GET as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `PUT /api/admin/question-banks/[questionId]?type=assessment`:
        *   [x] Send PUT as **Admin** with valid update data. Verify 200 OK.
        *   [x] Send PUT without `type=assessment`. Verify 400 Bad Request.
        *   [x] Send PUT as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `DELETE /api/admin/question-banks/[questionId]?type=assessment`:
        *   [x] Send DELETE as **Admin**. Verify 204 No Content.
        *   [x] Send DELETE without `type=assessment`. Verify 400 Bad Request.
        *   [x] **Dependency Check:** Test deleting question linked to an assessment module.
        *   [x] Send DELETE as **Student/Client Staff**. Verify 403 Forbidden.

*   [x] **Linking Questions to Assessment Modules (`/api/admin/modules/[moduleId]/questions`)** (Assuming this route exists based on Module Management Plan)
    *   [x] `GET /api/admin/modules/[moduleId]/questions`:
        *   [x] Send GET as **Admin** for an 'Assessment' type module. Verify 200 OK and list of linked question IDs/details.
        *   [x] Send GET for a 'Course' type module. Verify 400 Bad Request (or empty list).
        *   [x] Send GET as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `POST /api/admin/modules/[moduleId]/questions`:
        *   [x] Send POST as **Admin** with valid `{ "question_id": "..." }` for an 'Assessment' type module. Verify 201 Created (or 200 OK). Verify link exists in `assessment_module_questions`.
        *   [x] Send POST for a 'Course' type module. Verify 400 Bad Request.
        *   [x] Send POST with non-existent `question_id`. Verify 400/404.
        *   [x] Send POST as **Student/Client Staff**. Verify 403 Forbidden.
    *   [x] `DELETE /api/admin/modules/[moduleId]/questions/[questionId]`:
        *   [x] Send DELETE as **Admin** for an existing link on an 'Assessment' type module. Verify 204 No Content. Verify link removed.
        *   [x] Send DELETE for a 'Course' type module. Verify 400 Bad Request.
        *   [x] Send DELETE for non-existent link. Verify 404 Not Found.
        *   [x] Send DELETE as **Student/Client Staff**. Verify 403 Forbidden.

*   [x] **Student Assessment Submission (`POST /api/app/assessments/[moduleId]/submit`)**
    *   [x] (Existing tests cover basic submission - verify they still pass)
    *   [x] Verify score calculation is correct based on linked questions and answers.
    *   [x] Verify `assessment_progress` table is populated correctly (score, passed, answers JSON).
    *   [x] Fixed issues with answer format handling (code now supports both direct values and object format)
    *   [x] Fixed enrollment verification to properly check client-product assignments

*   [x] **Retrieving Assessment Results**
    *   [x] `GET /api/app/progress` (Student): Verify assessment modules show correct score/passed status. (Verified: 2025-05-03)
    *   [x] `GET /api/client-staff/progress` (Client Staff): Verify assessment results for students in their client are included and correct. Verify RLS prevents access to other clients' assessment results. (Verified: 2025-05-03)
    *   [x] `GET /api/viewer/reports` (Viewer/Admin): Verify aggregated report function (`get_aggregated_progress_report`) includes `average_score` calculation correctly for assessment modules. Verify RLS allows access as expected. (Verified: 2025-05-03)

*   [x] **RLS for Assessment Tables**
    *   [x] Explicitly test `assessment_questions` RLS for Admin (pass) and other roles (fail). (Verified: 2025-05-03)
    *   [x] Explicitly test `assessment_module_questions` RLS. (Verified: 2025-05-03)
    *   [x] Explicitly test `assessment_progress` RLS for Student (self), Client Staff (own client), Admin/Viewer (all). (Verified: 2025-05-03)

## 6. RLS Policy Implementation and Testing Summary

This section summarizes the RLS policies implemented and their verification status.

### RLS Policy Implementation

*   [x] **Students Table:**
    *   [x] Created policy "Allow Admin read access on students" allowing Admin role to select all student records. (2025-05-03)
    *   [x] Verified that API endpoints properly enforce permission boundaries based on role and client association.

*   [x] **Module Progress Tables:**
    *   [x] RLS for `student_module_progress` properly restricts access:
        - Students can only access their own progress records
        - Client Staff can only access progress for students in their client
        - Admin/Viewer roles can access all progress data
    *   [x] RLS for `assessment_progress` follows the same permission model

*   [x] **Assessment Content Tables:**
    *   [x] RLS for `assessment_questions` restricts write access to Admin role
    *   [x] RLS for `assessment_module_questions` enforces appropriate access control

### Troubleshooting Notes

*   [x] **Viewer Reports API (`/api/viewer/reports`):**
    *   [x] Fixed issue with the RLS policy on students table that prevented Admin/Viewer roles from accessing student data
    *   [x] Updated SQL function `get_aggregated_progress_report` to properly handle case sensitivity in module types
    *   [x] Implemented more robust error handling and debug logging in the API endpoint

*   [x] **Student Progress API (`/api/app/progress`):**
    *   [x] Fixed issue with assessment answer handling to support both direct value and object format
    *   [x] Enhanced enrollment verification to properly check client-product assignments 