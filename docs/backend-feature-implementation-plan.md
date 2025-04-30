# Detailed Backend Feature Implementation Plan

This document provides a step-by-step guide for implementing the feature-specific backend API routes for the Upskilling Platform, following the structure defined in `implementation-plan.md` and adhering to the best practices outlined in `optimized-nextjs-typescript-best-practices-modern-ui-ux.mdc`.

**Core Principles:**

*   **API Routes:** Utilize Next.js App Router Route Handlers (`app/api/.../route.ts`).
*   **TypeScript:** Strict typing for all code, including request/response bodies and Supabase interactions.
*   **Supabase:** Leverage `supabase-js` for database operations and Supabase Auth for user management and RLS enforcement. **Note:** Schema and RLS policies are managed via the Supabase Dashboard as per `implementation-plan.md`, but API logic must respect these constraints.
*   **Validation:** Use Zod for robust request schema validation.
*   **Error Handling:** Implement consistent error handling and return appropriate HTTP status codes.
*   **Security:** Ensure role-based access control within API logic, complementing RLS.

---

## 1. User Management API (`/api/admin/users`)

*Target Role: Admin*

*   [x] **Define Zod Schemas (`lib/schemas/user.ts`):**
    *   [x] `CreateUserSchema`: Validates request body for creating new users (email, password, role, client\_id if applicable).
    *   [x] `UpdateUserSchema`: Validates request body for updating user details (role, client\_id if applicable).
    *   [x] `UserIdSchema`: Validates user ID parameter in route segments.
*   [x] **List Users (`GET /api/admin/users`):**
    *   [x] Create `app/api/admin/users/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Fetch users from `profiles` table, potentially joining with `clients` if needed. Include filters (search, role, client).
    *   [x] Return user list (respecting RLS).
*   [x] **Create User (`POST /api/admin/users`):**
    *   [x] Implement `POST` handler in `app/api/admin/users/route.ts`.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate request body using `CreateUserSchema`.
    *   [x] Use `supabase.auth.admin.createUser` to create the user in Supabase Auth.
    *   [x] Create a corresponding entry in the `profiles` table, linking to the `auth.users` ID and setting the role/client\_id. Consider transaction or careful sequencing.
    *   [x] Return the newly created profile data.
*   [x] **Get User Details (`GET /api/admin/users/[userId]`):**
    *   [x] Create `app/api/admin/users/[userId]/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `userId` parameter.
    *   [x] Fetch specific user profile from `profiles` table.
    *   [x] Return user profile data.
*   [x] **Update User (`PUT /api/admin/users/[userId]`):**
    *   [x] Implement `PUT` handler in `app/api/admin/users/[userId]/route.ts`.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `userId` parameter.
    *   [x] Validate request body using `UpdateUserSchema`.
    *   [x] Update the user's record in the `profiles` table (role, client\_id).
    *   [x] **Note:** Avoid updating email/password here; direct users to auth flows or use `supabase.auth.admin` methods cautiously if essential.
    *   [x] Return the updated profile data.
*   [x] **Delete User (`DELETE /api/admin/users/[userId]`):**
    *   [x] Implement `DELETE` handler in `app/api/admin/users/[userId]/route.ts`.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `userId` parameter.
    *   [x] Delete the user's record from the `profiles` table.
    *   [x] Use `supabase.auth.admin.deleteUser` to delete the user from Supabase Auth. Consider transaction or careful sequencing.
    *   [x] Return success status.

---

## 2. Client Management API (`/api/admin/clients`, `/api/staff/clients`)

*Target Roles: Admin, Staff*

*   [x] **Define Zod Schemas (`lib/schemas/client.ts`):**
    *   [x] `ClientSchema`: Validates client data fields (name, contact info, etc.).
    *   [x] `ClientIdSchema`: Validates client ID parameter.
*   [x] **List Clients (`GET /api/admin/clients`, `GET /api/staff/clients`):**
    *   [x] Create `app/api/admin/clients/route.ts` and `app/api/staff/clients/route.ts`.
    *   [x] Implement `GET` handlers.
    *   [x] Verify user session and role (Admin or Staff).
    *   [x] **Staff:** Fetch clients associated with the staff member (requires checking `profiles` or an intermediary table).
    *   [x] **Admin:** Fetch all clients. Include filters (search).
    *   [x] Return client list (respecting RLS).
*   [x] **Create Client (`POST /api/admin/clients`):**
    *   [x] Implement `POST` handler in `app/api/admin/clients/route.ts`.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate request body using `ClientSchema`.
    *   [x] Insert new record into `clients` table.
    *   [x] Return the newly created client data.
*   [x] **Get Client Details (`GET /api/admin/clients/[clientId]`, `GET /api/staff/clients/[clientId]`):**
    *   [x] Create `app/api/admin/clients/[clientId]/route.ts` and `app/api/staff/clients/[clientId]/route.ts`.
    *   [x] Implement `GET` handlers.
    *   [x] Verify user session and role (Admin or Staff).
    *   [x] Validate `clientId` parameter.
    *   [x] Fetch specific client details from `clients` table.
    *   [x] **Staff:** Add check to ensure fetched client is accessible to the staff member.
    *   [x] Return client data.
*   [x] **Update Client (`PUT /api/admin/clients/[clientId]`, `PUT /api/staff/clients/[clientId]`):**
    *   [x] Implement `PUT` handlers in respective `[clientId]` route files.
    *   [x] Verify user session and role (Admin or Staff).
    *   [x] Validate `clientId` parameter.
    *   [x] Validate request body using `ClientSchema`.
    *   [x] **Staff:** Add check to ensure staff can update this specific client.
    *   [x] Update record in `clients` table.
    *   [x] Return the updated client data.
*   [x] **Delete Client (`DELETE /api/admin/clients/[clientId]`):**
    *   [x] Implement `DELETE` handler in `app/api/admin/clients/[clientId]/route.ts`.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `clientId` parameter.
    *   [x] Delete record from `clients` table (consider cascading deletes or handling related data like assignments/users).
    *   [x] Return success status.

---

## 3. Product Management API (`/api/admin/products`)

*Target Role: Admin*

*   [x] **Define Zod Schemas (`lib/schemas/product.ts`):**
    *   [x] `ProductSchema`: Validates product data fields (name, description, etc.).
    *   [x] `ProductIdSchema`: Validates product ID parameter.
*   [x] **List Products (`GET /api/admin/products`):**
    *   [x] Create `app/api/admin/products/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Fetch all products from `products` table. Include filters.
    *   [x] Return product list.
*   [x] **Create Product (`POST /api/admin/products`):**
    *   [x] Implement `POST` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate request body using `ProductSchema`.
    *   [x] Insert new record into `products` table.
    *   [x] Return the newly created product data.
*   [x] **Get Product Details (`GET /api/admin/products/[productId]`):**
    *   [x] Create `app/api/admin/products/[productId]/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `productId` parameter.
    *   [x] Fetch specific product details from `products` table, potentially joining `modules`.
    *   [x] Return product data.
*   [x] **Update Product (`PUT /api/admin/products/[productId]`):**
    *   [x] Implement `PUT` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `productId` parameter.
    *   [x] Validate request body using `ProductSchema`.
    *   [x] Update record in `products` table.
    *   [x] Return the updated product data.
*   [x] **Delete Product (`DELETE /api/admin/products/[productId]`):**
    *   [x] Implement `DELETE` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `productId` parameter.
    *   [x] Delete record from `products` table (handle related modules, assignments).
    *   [x] Return success status.

---

## 4. Question Bank API (`/api/admin/question-banks`)

*Target Role: Admin*

*   [x] **Define Zod Schemas (`lib/schemas/question.ts`):**
    *   [x] `QuestionSchema`: Validates question data (text, type, options, answer, tags, bank type - course/assessment).
    *   [x] `QuestionIdSchema`: Validates question ID parameter.
*   [x] **List Questions (`GET /api/admin/question-banks`):**
    *   [x] Create `app/api/admin/question-banks/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Accept query parameter for bank type (`type=course` or `type=assessment`).
    *   [x] Fetch questions from `course_questions` or `assessment_questions` table based on type. Include filters (tags, search).
    *   [x] Return question list.
*   [x] **Create Question (`POST /api/admin/question-banks`):**
    *   [x] Implement `POST` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate request body using `QuestionSchema`.
    *   [x] Insert new record into the appropriate table (`course_questions` or `assessment_questions`) based on `bank type` in the request.
    *   [x] Return the newly created question data.
*   [x] **Get Question Details (`GET /api/admin/question-banks/[questionId]`):**
    *   [x] Create `app/api/admin/question-banks/[questionId]/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Accept query parameter for bank type (`type=course` or `type=assessment`).
    *   [x] Validate `questionId` parameter.
    *   [x] Fetch specific question details from the appropriate table.
    *   [x] Return question data.
*   [x] **Update Question (`PUT /api/admin/question-banks/[questionId]`):**
    *   [x] Implement `PUT` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Accept query parameter for bank type.
    *   [x] Validate `questionId` parameter.
    *   [x] Validate request body using `QuestionSchema`.
    *   [x] Update record in the appropriate table.
    *   [x] Return the updated question data.
*   [x] **Delete Question (`DELETE /api/admin/question-banks/[questionId]`):**
    *   [x] Implement `DELETE` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Accept query parameter for bank type.
    *   [x] Validate `questionId` parameter.
    *   [x] Delete record from the appropriate table (handle links from modules).
    *   [x] Return success status.

---

## 5. Module Management API (`/api/admin/products/:pid/modules`, `/api/admin/modules/:mid`)

*Target Role: Admin*

*   [x] **Define Zod Schemas (`lib/schemas/module.ts`):**
    *   [x] `ModuleSchema`: Validates module data (name, type, product\_id, configuration JSONB).
    *   [x] `CourseLessonSchema`: Validates lesson data (module\_id, sequence, video\_url, quiz\_id).
    *   [x] `AssessmentModuleQuestionSchema`: Validates linking data (module\_id, question\_id).
    *   [x] `ModuleIdSchema`: Validates module ID parameter.
*   [x] **List Modules for Product (`GET /api/admin/products/[productId]/modules`):**
    *   [x] Create `app/api/admin/products/[productId]/modules/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `productId` parameter.
    *   [x] Fetch modules linked to the given `productId` from `modules` table.
    *   [x] Return module list.
*   [x] **Create Module (`POST /api/admin/products/[productId]/modules`):**
    *   [x] Implement `POST` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `productId` parameter.
    *   [x] Validate request body using `ModuleSchema` (ensure `product_id` matches route).
    *   [x] Insert new record into `modules` table.
    *   [x] Return the newly created module data.
*   [x] **Get Module Details (`GET /api/admin/modules/[moduleId]`):**
    *   [x] Create `app/api/admin/modules/[moduleId]/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `moduleId` parameter.
    *   [x] Fetch module details from `modules` table.
    *   [x] If 'Course', fetch related `course_lessons`.
    *   [x] If 'Assessment', fetch related `assessment_module_questions` (joining with `assessment_questions`).
    *   [x] Return combined module data.
*   [x] **Update Module (`PUT /api/admin/modules/[moduleId]`):**
    *   [x] Implement `PUT` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `moduleId` parameter.
    *   [x] Validate request body using `ModuleSchema` (partial updates allowed).
    *   [x] Update record in `modules` table.
    *   [x] Handle updates to course lessons or assessment questions (separate endpoints or complex logic here).
    *   [x] Return the updated module data.
*   [x] **Delete Module (`DELETE /api/admin/modules/[moduleId]`):**
    *   [x] Implement `DELETE` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Validate `moduleId` parameter.
    *   [x] Delete record from `modules` table (handle related lessons/questions).
    *   [x] Return success status.
*   [x] **Course Lesson Management (`POST`, `PUT`, `DELETE` on `/api/admin/modules/[moduleId]/lessons/[lessonId]`)**:
    *   [x] Define routes and handlers for CRUD operations on `course_lessons` linked to a specific course module.
    *   [x] Use `CourseLessonSchema` for validation.
*   [x] **Assessment Question Management (`POST`, `DELETE` on `/api/admin/modules/[moduleId]/assessment-questions`):**
    *   [x] Define routes and handlers for adding/removing questions from an assessment module via the `assessment_module_questions` link table.
    *   [x] Use `AssessmentModuleQuestionSchema` for validation.

---

## 6. Storage Integration (`/api/admin/storage/upload`)

*Target Role: Admin*

*   [x] **Define Zod Schemas (`lib/schemas/storage.ts`):**
    *   [x] `UploadFileSchema`: Validate file size, type, existence.
    *   [ ] `UploadMetadataSchema`: (Optional) Validate any additional metadata if needed.
*   [x] **Configure Supabase:**
    *   [x] Ensure `course-videos` bucket exists via Dashboard.
    *   [x] Ensure appropriate Storage RLS policies are set via Dashboard (e.g., Admins can upload).
*   [x] **Implement Upload Route (`POST /api/admin/storage/upload`):**
    *   [x] Create `app/api/admin/storage/upload/route.ts`.
    *   [x] Implement `POST` handler.
    *   [x] Verify user session and role (Admin).
    *   [x] Accept file data (e.g., using `request.formData()`).
    *   [x] Use `supabase.storage.from('course-videos').upload(...)` to upload the file.
    *   [x] Handle potential errors during upload.
    *   [x] Return the path or URL of the uploaded file upon success.

---

## 7. Product Assignment API (`/api/staff/clients/[clientId]/products`)

*Target Roles: Admin, Staff*

*   [x] **Define Zod Schemas (`lib/schemas/assignment.ts`):**
    *   [x] `ProductAssignmentSchema`: Validates `product_id` for assignment/unassignment.
*   [x] **List Assigned Products (`GET /api/staff/clients/[clientId]/products`):**
    *   [x] Create `app/api/staff/clients/[clientId]/products/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session and role (Admin or Staff).
    *   [x] Validate `clientId` parameter.
    *   [x] **Staff:** Verify staff has access to this client.
    *   [x] Fetch assigned products for the client from `client_product_assignments` table, joining with `products`.
    *   [x] Return assigned product list.
*   [x] **Assign Product (`POST /api/staff/clients/[clientId]/products`):**
    *   [x] Implement `POST` handler.
    *   [x] Verify user session and role (Admin or Staff).
    *   [x] Validate `clientId` parameter.
    *   [x] **Staff:** Verify staff has access to this client.
    *   [x] Validate request body using `ProductAssignmentSchema` (containing `product_id`).
    *   [x] Insert new record into `client_product_assignments` table (`client_id`, `product_id`). Handle potential duplicates.
    *   [x] Return success status or the new assignment record.
*   [x] **Unassign Product (`DELETE /api/staff/clients/[clientId]/products/[productId]`):**
    *   [x] Create `app/api/staff/clients/[clientId]/products/[productId]/route.ts`.
    *   [x] Implement `DELETE` handler.
    *   [x] Verify user session and role (Admin or Staff).
    *   [x] Validate `clientId` and `productId` parameters.
    *   [x] **Staff:** Verify staff has access to this client.
    *   [x] Delete record from `client_product_assignments` table matching `client_id` and `product_id`.
    *   [x] Return success status.

---

## 8. Student Enrollment API (`/api/staff/clients/[clientId]/students`)

*Target Roles: Admin, Staff*

*   [x] **Define Zod Schemas (`lib/schemas/enrollment.ts`):**
    *   [x] `EnrollStudentSchema`.
    *   [ ] `BulkEnrollStudentSchema`.
    *   [x] `StudentIdSchema` (ensure UUID format validation).
*   [x] **List Enrolled Students (`GET /api/staff/clients/[clientId]/students`):**
    *   [x] Create `app/api/staff/clients/[clientId]/students/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify session/role (Admin/Staff).
    *   [x] Validate `clientId`.
    *   [x] **Staff:** Verify access to client.
    *   [x] Fetch active students for the client from `profiles`.
    *   [x] Return student list.
*   [x] **Enroll Student (Manual) (`POST /api/staff/clients/[clientId]/students`):**
    *   [x] Implement `POST` handler.
    *   [x] Verify session/role (Admin/Staff).
    *   [x] Validate `clientId`.
    *   [x] **Staff:** Verify access to client.
    *   [x] Validate request body using `EnrollStudentSchema`.
    *   [x] Check if user exists (`supabase.auth.admin`).
    *   [x] Create/Invite auth user if needed.
    *   [x] Create/Update `profiles` record, linking to `client_id` and setting `is_active=true`.
    *   [x] Return created/updated profile.
*   [ ] **Enroll Students (Bulk) (`POST /api/staff/clients/[clientId]/students/bulk`):**
    *   [ ] Create `app/api/staff/clients/[clientId]/students/bulk/route.ts`.
    *   [ ] Implement `POST` handler.
    *   [ ] Verify session/role (Admin/Staff).
    *   [ ] Validate `clientId`.
    *   [ ] **Staff:** Verify access to client.
    *   [ ] Validate request body using `BulkEnrollStudentSchema`.
    *   [ ] Loop through students, apply single enrollment logic with error aggregation.
    *   [ ] Return success/failure summary.
*   [x] **Unenroll Student (`DELETE /api/staff/clients/[clientId]/students?studentId=...`):**
    *   [x] Implement `DELETE` handler in `app/api/staff/clients/[clientId]/students/route.ts`.
    *   [x] Verify session/role (Admin/Staff).
    *   [x] Validate `clientId` route param.
    *   [x] Validate `studentId` query param (must be UUID).
    *   [x] **Staff:** Verify access to client.
    *   [x] Update `profiles` record: set `is_active=false`, `client_id=null` for the matching `studentId` and `clientId`.
    *   [x] Return 204 No Content or 404 Not Found.

---

## 9. Learner Management API (`/api/admin/learners`, `/api/staff/learners`)

*Target Roles: Admin, Staff*

*   [x] **Define Zod Schemas (`lib/schemas/learner.ts`):**
    *   [x] `LearnerListQuerySchema`: Filters for listing learners.
    *   [x] Reuse `UserIdSchema` for ID validation.
*   [x] **Implement Admin List Learners (`GET /api/admin/learners`):**
    *   [x] Create `app/api/admin/learners/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify Admin role.
    *   [x] Parse and validate query parameters (`LearnerListQuerySchema`).
    *   [x] Fetch `profiles` where `role='Student'`, applying filters.
    *   [x] Return learner list.
*   [x] **Implement Admin Get Learner Details (`GET /api/admin/learners/[studentId]`):**
    *   [x] Create `app/api/admin/learners/[studentId]/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify Admin role.
    *   [x] Validate `studentId` parameter (`UserIdSchema`).
    *   [x] Fetch specific learner `profile` where `role='Student'`. Handle not found.
    *   [x] Fetch related progress data (e.g., `student_course_progress`. *Note: Skipped assessment progress due to missing table*).
    *   [x] Return combined learner profile and progress summary.
*   [x] **Implement Staff List Learners (`GET /api/staff/learners`):**
    *   [x] Create `app/api/staff/learners/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify Admin or Staff role.
    *   [x] If Staff, get their `client_id` from profile and filter learners by it.
    *   [x] Parse and validate query parameters.
    *   [x] Fetch learners, applying filters and Staff client scope.
    *   [x] Return learner list.
*   [x] **Implement Staff Get Learner Details (`GET /api/staff/learners/[studentId]`):**
    *   [x] Create `app/api/staff/learners/[studentId]/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify Admin or Staff role.
    *   [x] Validate `studentId` parameter.
    *   [x] Fetch specific learner `profile`.
    *   [x] **Staff:** Verify the fetched student belongs to the staff member's `client_id`. Return 403 if not.
    *   [x] Fetch related progress data (*Note: Skipped assessment progress*).
    *   [x] Return combined learner profile and progress summary.

---

## 10. Progress Tracking API (`/api/app/progress/...`, `/api/client-staff/progress`, `/api/viewer/reports`)

*Target Roles: Student, Client Staff, Viewer*

*   [ ] **Define Zod Schemas (`lib/schemas/progress.ts`):**
    *   [ ] `CourseProgressUpdateSchema`: Validates data for updating course progress (e.g., lesson completion status, percentage).
    *   [ ] `AssessmentSubmissionSchema`: Validates assessment answers submitted by student.
*   [ ] **Update Course Progress (`PATCH /api/app/progress/course/[moduleId]`):**
    *   [ ] Create `app/api/app/progress/course/[moduleId]/route.ts`.
    *   [ ] Implement `PATCH` handler.
    *   [ ] Verify user session (Student role). Get `studentId` from session.
    *   [ ] Validate `moduleId` parameter.
    *   [ ] Validate request body using `CourseProgressUpdateSchema`.
    *   [ ] Verify student is enrolled in the product containing this module.
    *   [ ] Update or insert record in `course_progress` table for the (`studentId`, `moduleId`) pair. Update lesson status, overall percentage, etc.
    *   [ ] Return updated progress status.
*   [ ] **Submit Assessment (`POST /api/app/assessments/[moduleId]/submit`):**
    *   [ ] Create `app/api/app/assessments/[moduleId]/submit/route.ts`.
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session (Student role). Get `studentId` from session.
    *   [ ] Validate `moduleId` parameter.
    *   [ ] Validate request body using `AssessmentSubmissionSchema`.
    *   [ ] Verify student is enrolled and hasn't submitted this assessment before (or handle retakes).
    *   [ ] **Logic:**
        *   Fetch assessment questions for the module.
        *   Compare submitted answers with correct answers.
        *   Calculate score.
        *   Store results (answers, score, completion time) in `assessment_progress` table for the (`studentId`, `moduleId`) pair.
    *   [ ] Return assessment results (score, pass/fail).
*   [ ] **Get Student Progress (App) (`GET /api/app/progress`):**
    *   [ ] Create `app/api/app/progress/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session (Student role). Get `studentId` from session.
    *   [ ] Fetch all assigned products/modules for the student.
    *   [ ] Fetch corresponding `course_progress` and `assessment_progress` records for the student.
    *   [ ] Combine data to return a progress overview for the student's dashboard.
*   [ ] **Get Client Progress (Client Staff) (`GET /api/client-staff/progress`):**
    *   [ ] Create `app/api/client-staff/progress/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session (Client Staff role). Get `client_id`(s) associated with staff.
    *   [ ] Accept query parameters for filtering (student, product, module).
    *   [ ] Fetch progress data (`course_progress`, `assessment_progress`) for students belonging to the staff's client(s).
    *   [ ] Aggregate/format data suitable for reporting view.
    *   [ ] Return progress data.
*   [x] **Get Aggregated Reports (Viewer) (`GET /api/viewer/reports`):**
    *   [x] Create `app/api/viewer/reports/route.ts`.
    *   [x] Implement `GET` handler.
    *   [x] Verify user session (Viewer role).
    *   [x] Accept query parameters for filtering (client, product).
    *   [x] Fetch progress data across relevant clients/products.
    *   [x] Aggregate data (e.g., completion rates per product/client, average scores).
    *   [x] Return aggregated report data.

---

## 11. Notification Logic (Backend)

*Target Roles: Client Staff (consumer), System/Admin (producer)*

*   [ ] **Define Notification Trigger/Logic:**
    *   [ ] **Option 1 (DB Trigger):** Create a Supabase Database Function/Trigger on `modules` table (on update). Function checks if module changes warrant notification and inserts into `notifications` table, targeting relevant Client Staff based on client assignments.
    *   [ ] **Option 2 (API Logic):** Within the Module Management API (`PUT /api/admin/modules/[moduleId]`), after successfully updating a module, add logic to query relevant clients/staff and insert records into the `notifications` table.
*   [ ] **Get Notifications (`GET /api/client-staff/notifications`):**
    *   [ ] Create `app/api/client-staff/notifications/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session (Client Staff role). Get staff profile/ID.
    *   [ ] Fetch unread/recent notifications from `notifications` table where `recipient_staff_id` matches the current user.
    *   [ ] Return notification list.
*   [ ] **Mark Notification Read (`PATCH /api/client-staff/notifications/[notificationId]`):**
    *   [ ] Create `app/api/client-staff/notifications/[notificationId]/route.ts`.
    *   [ ] Implement `PATCH` handler.
    *   [ ] Verify user session (Client Staff role).
    *   [ ] Validate `notificationId` parameter.
    *   [ ] Update `is_read` flag in `notifications` table for the specific notification, ensuring it belongs to the current user.
    *   [ ] Return success status.

---

## 12. Excel Export API (`/api/[role]/progress/export`)

*Target Roles: Admin, Staff, Client Staff*

*   [ ] **Install Dependency:**
    *   [ ] `npm install exceljs`
    *   [ ] `npm install -D @types/exceljs`
*   [ ] **Create Generic Export Utility (`lib/utils/export.ts`):**
    *   [ ] Create a function that takes data (array of objects) and generates an Excel file buffer using `exceljs`.
*   [ ] **Implement Export Endpoints:**
    *   [ ] Create `app/api/admin/progress/export/route.ts`.
    *   [ ] Create `app/api/staff/progress/export/route.ts`.
    *   [ ] Create `app/api/client-staff/progress/export/route.ts`.
    *   [ ] Implement `GET` handlers in each.
    *   [ ] Verify user session and role appropriate for the endpoint.
    *   [ ] Fetch relevant progress data based on the role's scope (Admin: all, Staff: assigned clients, Client Staff: their specific client). Apply any query parameter filters passed from the frontend (e.g., specific product, date range).
    *   [ ] Format the fetched data into a suitable structure for the Excel sheet.
    *   [ ] Use the `export.ts` utility to generate the Excel file buffer.
    *   [ ] Return the buffer with correct `Content-Type` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) and `Content-Disposition` headers for download.

---

## 13. App Login API (`/api/app/auth/login`)

*Target Role: Student (attempting login)*

*   [x] **Define Zod Schema (`lib/schemas/auth.ts`):**
    *   [x] `AppLoginSchema`: Validates email and password.
*   [x] **Implement Login Route (`POST /api/app/auth/login`):**
    *   [x] Create `app/api/app/auth/login/route.ts`.
    *   [x] Implement `POST` handler.
    *   [x] Validate request body using `AppLoginSchema`.
    *   [x] Call `supabase.auth.signInWithPassword` with provided credentials.
    *   [x] **On successful auth:**
        *   [x] Get the user ID from the successful Supabase auth response.
        *   [x] Query the `profiles` table using the user ID.
        *   [x] **Check:**
            *   [x] Does a profile exist?
            *   [x] Is the profile `role` 'Student'?
            *   [x] Is the profile linked to a `client_id`?
            *   [x] Is the profile marked as `is_active` (or equivalent enrollment status)?
        *   [x] **If all checks pass:** Return success (e.g., status 200, maybe user profile info excluding sensitive data). The Supabase client on the frontend will handle the session cookie automatically via the SSR helper.
        *   [x] **If any check fails:**
            *   [x] Sign the user out immediately using `supabase.auth.signOut()` to clear the invalid session cookie.
            *   [x] Return an appropriate error response (e.g., 403 Forbidden, "User not enrolled or inactive").
    *   [x] **On failed auth (invalid credentials):** Return standard Supabase auth error (e.g., 400 Bad Request).

---