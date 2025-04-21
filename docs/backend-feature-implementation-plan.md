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

*   [ ] **Define Zod Schemas (`lib/schemas/user.ts`):**
    *   [ ] `CreateUserSchema`: Validates request body for creating new users (email, password, role, client\_id if applicable).
    *   [ ] `UpdateUserSchema`: Validates request body for updating user details (role, client\_id if applicable).
    *   [ ] `UserIdSchema`: Validates user ID parameter in route segments.
*   [ ] **List Users (`GET /api/admin/users`):**
    *   [ ] Create `app/api/admin/users/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Fetch users from `profiles` table, potentially joining with `clients` if needed. Include filters (search, role, client).
    *   [ ] Return user list (respecting RLS).
*   [ ] **Create User (`POST /api/admin/users`):**
    *   [ ] Implement `POST` handler in `app/api/admin/users/route.ts`.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate request body using `CreateUserSchema`.
    *   [ ] Use `supabase.auth.admin.createUser` to create the user in Supabase Auth.
    *   [ ] Create a corresponding entry in the `profiles` table, linking to the `auth.users` ID and setting the role/client\_id. Consider transaction or careful sequencing.
    *   [ ] Return the newly created profile data.
*   [ ] **Get User Details (`GET /api/admin/users/[userId]`):**
    *   [ ] Create `app/api/admin/users/[userId]/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `userId` parameter.
    *   [ ] Fetch specific user profile from `profiles` table.
    *   [ ] Return user profile data.
*   [ ] **Update User (`PUT /api/admin/users/[userId]`):**
    *   [ ] Implement `PUT` handler in `app/api/admin/users/[userId]/route.ts`.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `userId` parameter.
    *   [ ] Validate request body using `UpdateUserSchema`.
    *   [ ] Update the user's record in the `profiles` table (role, client\_id).
    *   [ ] **Note:** Avoid updating email/password here; direct users to auth flows or use `supabase.auth.admin` methods cautiously if essential.
    *   [ ] Return the updated profile data.
*   [ ] **Delete User (`DELETE /api/admin/users/[userId]`):**
    *   [ ] Implement `DELETE` handler in `app/api/admin/users/[userId]/route.ts`.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `userId` parameter.
    *   [ ] Delete the user's record from the `profiles` table.
    *   [ ] Use `supabase.auth.admin.deleteUser` to delete the user from Supabase Auth. Consider transaction or careful sequencing.
    *   [ ] Return success status.

---

## 2. Client Management API (`/api/admin/clients`, `/api/staff/clients`)

*Target Roles: Admin, Staff*

*   [ ] **Define Zod Schemas (`lib/schemas/client.ts`):**
    *   [ ] `ClientSchema`: Validates client data fields (name, contact info, etc.).
    *   [ ] `ClientIdSchema`: Validates client ID parameter.
*   [ ] **List Clients (`GET /api/admin/clients`, `GET /api/staff/clients`):**
    *   [ ] Create `app/api/admin/clients/route.ts` and `app/api/staff/clients/route.ts`.
    *   [ ] Implement `GET` handlers.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] **Staff:** Fetch clients associated with the staff member (requires checking `profiles` or an intermediary table).
    *   [ ] **Admin:** Fetch all clients. Include filters (search).
    *   [ ] Return client list (respecting RLS).
*   [ ] **Create Client (`POST /api/admin/clients`):**
    *   [ ] Implement `POST` handler in `app/api/admin/clients/route.ts`.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate request body using `ClientSchema`.
    *   [ ] Insert new record into `clients` table.
    *   [ ] Return the newly created client data.
*   [ ] **Get Client Details (`GET /api/admin/clients/[clientId]`, `GET /api/staff/clients/[clientId]`):**
    *   [ ] Create `app/api/admin/clients/[clientId]/route.ts` and `app/api/staff/clients/[clientId]/route.ts`.
    *   [ ] Implement `GET` handlers.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` parameter.
    *   [ ] Fetch specific client details from `clients` table.
    *   [ ] **Staff:** Add check to ensure fetched client is accessible to the staff member.
    *   [ ] Return client data.
*   [ ] **Update Client (`PUT /api/admin/clients/[clientId]`, `PUT /api/staff/clients/[clientId]`):**
    *   [ ] Implement `PUT` handlers in respective `[clientId]` route files.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` parameter.
    *   [ ] Validate request body using `ClientSchema`.
    *   [ ] **Staff:** Add check to ensure staff can update this specific client.
    *   [ ] Update record in `clients` table.
    *   [ ] Return the updated client data.
*   [ ] **Delete Client (`DELETE /api/admin/clients/[clientId]`):**
    *   [ ] Implement `DELETE` handler in `app/api/admin/clients/[clientId]/route.ts`.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `clientId` parameter.
    *   [ ] Delete record from `clients` table (consider cascading deletes or handling related data like assignments/users).
    *   [ ] Return success status.

---

## 3. Product Management API (`/api/admin/products`)

*Target Role: Admin*

*   [ ] **Define Zod Schemas (`lib/schemas/product.ts`):**
    *   [ ] `ProductSchema`: Validates product data fields (name, description, etc.).
    *   [ ] `ProductIdSchema`: Validates product ID parameter.
*   [ ] **List Products (`GET /api/admin/products`):**
    *   [ ] Create `app/api/admin/products/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Fetch all products from `products` table. Include filters.
    *   [ ] Return product list.
*   [ ] **Create Product (`POST /api/admin/products`):**
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate request body using `ProductSchema`.
    *   [ ] Insert new record into `products` table.
    *   [ ] Return the newly created product data.
*   [ ] **Get Product Details (`GET /api/admin/products/[productId]`):**
    *   [ ] Create `app/api/admin/products/[productId]/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `productId` parameter.
    *   [ ] Fetch specific product details from `products` table, potentially joining `modules`.
    *   [ ] Return product data.
*   [ ] **Update Product (`PUT /api/admin/products/[productId]`):**
    *   [ ] Implement `PUT` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `productId` parameter.
    *   [ ] Validate request body using `ProductSchema`.
    *   [ ] Update record in `products` table.
    *   [ ] Return the updated product data.
*   [ ] **Delete Product (`DELETE /api/admin/products/[productId]`):**
    *   [ ] Implement `DELETE` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `productId` parameter.
    *   [ ] Delete record from `products` table (handle related modules, assignments).
    *   [ ] Return success status.

---

## 4. Question Bank API (`/api/admin/question-banks`)

*Target Role: Admin*

*   [ ] **Define Zod Schemas (`lib/schemas/question.ts`):**
    *   [ ] `QuestionSchema`: Validates question data (text, type, options, answer, tags, bank type - course/assessment).
    *   [ ] `QuestionIdSchema`: Validates question ID parameter.
*   [ ] **List Questions (`GET /api/admin/question-banks`):**
    *   [ ] Create `app/api/admin/question-banks/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Accept query parameter for bank type (`type=course` or `type=assessment`).
    *   [ ] Fetch questions from `course_questions` or `assessment_questions` table based on type. Include filters (tags, search).
    *   [ ] Return question list.
*   [ ] **Create Question (`POST /api/admin/question-banks`):**
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate request body using `QuestionSchema`.
    *   [ ] Insert new record into the appropriate table (`course_questions` or `assessment_questions`) based on `bank type` in the request.
    *   [ ] Return the newly created question data.
*   [ ] **Get Question Details (`GET /api/admin/question-banks/[questionId]`):**
    *   [ ] Create `app/api/admin/question-banks/[questionId]/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Accept query parameter for bank type (`type=course` or `type=assessment`).
    *   [ ] Validate `questionId` parameter.
    *   [ ] Fetch specific question details from the appropriate table.
    *   [ ] Return question data.
*   [ ] **Update Question (`PUT /api/admin/question-banks/[questionId]`):**
    *   [ ] Implement `PUT` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Accept query parameter for bank type.
    *   [ ] Validate `questionId` parameter.
    *   [ ] Validate request body using `QuestionSchema`.
    *   [ ] Update record in the appropriate table.
    *   [ ] Return the updated question data.
*   [ ] **Delete Question (`DELETE /api/admin/question-banks/[questionId]`):**
    *   [ ] Implement `DELETE` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Accept query parameter for bank type.
    *   [ ] Validate `questionId` parameter.
    *   [ ] Delete record from the appropriate table (handle links from modules).
    *   [ ] Return success status.

---

## 5. Module Management API (`/api/admin/products/:pid/modules`, `/api/admin/modules/:mid`)

*Target Role: Admin*

*   [ ] **Define Zod Schemas (`lib/schemas/module.ts`):**
    *   [ ] `ModuleSchema`: Validates module data (name, type, product\_id, configuration JSONB).
    *   [ ] `CourseLessonSchema`: Validates lesson data (module\_id, sequence, video\_url, quiz\_id).
    *   [ ] `AssessmentModuleQuestionSchema`: Validates linking data (module\_id, question\_id).
    *   [ ] `ModuleIdSchema`: Validates module ID parameter.
*   [ ] **List Modules for Product (`GET /api/admin/products/[productId]/modules`):**
    *   [ ] Create `app/api/admin/products/[productId]/modules/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `productId` parameter.
    *   [ ] Fetch modules linked to the given `productId` from `modules` table.
    *   [ ] Return module list.
*   [ ] **Create Module (`POST /api/admin/products/[productId]/modules`):**
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `productId` parameter.
    *   [ ] Validate request body using `ModuleSchema` (ensure `product_id` matches route).
    *   [ ] Insert new record into `modules` table.
    *   [ ] Return the newly created module data.
*   [ ] **Get Module Details (`GET /api/admin/modules/[moduleId]`):**
    *   [ ] Create `app/api/admin/modules/[moduleId]/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `moduleId` parameter.
    *   [ ] Fetch module details from `modules` table.
    *   [ ] If 'Course', fetch related `course_lessons`.
    *   [ ] If 'Assessment', fetch related `assessment_module_questions` (joining with `assessment_questions`).
    *   [ ] Return combined module data.
*   [ ] **Update Module (`PUT /api/admin/modules/[moduleId]`):**
    *   [ ] Implement `PUT` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `moduleId` parameter.
    *   [ ] Validate request body using `ModuleSchema` (partial updates allowed).
    *   [ ] Update record in `modules` table.
    *   [ ] Handle updates to course lessons or assessment questions (separate endpoints or complex logic here).
    *   [ ] Return the updated module data.
*   [ ] **Delete Module (`DELETE /api/admin/modules/[moduleId]`):**
    *   [ ] Implement `DELETE` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Validate `moduleId` parameter.
    *   [ ] Delete record from `modules` table (handle related lessons/questions).
    *   [ ] Return success status.
*   [ ] **Course Lesson Management (`POST`, `PUT`, `DELETE` on `/api/admin/modules/[moduleId]/lessons/[lessonId]?)`:**
    *   [ ] Define routes and handlers for CRUD operations on `course_lessons` linked to a specific course module.
    *   [ ] Use `CourseLessonSchema` for validation.
*   [ ] **Assessment Question Management (`POST`, `DELETE` on `/api/admin/modules/[moduleId]/assessment-questions`):**
    *   [ ] Define routes and handlers for adding/removing questions from an assessment module via the `assessment_module_questions` link table.
    *   [ ] Use `AssessmentModuleQuestionSchema` for validation.

---

## 6. Storage Integration (`/api/admin/storage/upload`)

*Target Role: Admin*

*   [ ] **Configure Supabase Storage:**
    *   [ ] Ensure `course-videos` bucket exists via Dashboard.
    *   [ ] Ensure appropriate Storage RLS policies are set via Dashboard (e.g., Admins can upload).
*   [ ] **Implement Upload Route (`POST /api/admin/storage/upload`):**
    *   [ ] Create `app/api/admin/storage/upload/route.ts`.
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session and role (Admin).
    *   [ ] Accept file data (e.g., using `request.formData()`).
    *   [ ] Use `supabase.storage.from('course-videos').upload(...)` to upload the file.
    *   [ ] Handle potential errors during upload.
    *   [ ] Return the path or URL of the uploaded file upon success.

---

## 7. Product Assignment API (`/api/staff/clients/[clientId]/products`)

*Target Roles: Admin, Staff*

*   [ ] **Define Zod Schemas (`lib/schemas/assignment.ts`):**
    *   [ ] `ProductAssignmentSchema`: Validates `product_id` for assignment/unassignment.
*   [ ] **List Assigned Products (`GET /api/staff/clients/[clientId]/products`):**
    *   [ ] Create `app/api/staff/clients/[clientId]/products/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` parameter.
    *   [ ] **Staff:** Verify staff has access to this client.
    *   [ ] Fetch assigned products for the client from `client_product_assignments` table, joining with `products`.
    *   [ ] Return assigned product list.
*   [ ] **Assign Product (`POST /api/staff/clients/[clientId]/products`):**
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` parameter.
    *   [ ] **Staff:** Verify staff has access to this client.
    *   [ ] Validate request body using `ProductAssignmentSchema` (containing `product_id`).
    *   [ ] Insert new record into `client_product_assignments` table (`client_id`, `product_id`). Handle potential duplicates.
    *   [ ] Return success status or the new assignment record.
*   [ ] **Unassign Product (`DELETE /api/staff/clients/[clientId]/products/[productId]`):**
    *   [ ] Create `app/api/staff/clients/[clientId]/products/[productId]/route.ts`.
    *   [ ] Implement `DELETE` handler.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` and `productId` parameters.
    *   [ ] **Staff:** Verify staff has access to this client.
    *   [ ] Delete record from `client_product_assignments` table matching `client_id` and `product_id`.
    *   [ ] Return success status.

---

## 8. Student Enrollment API (`/api/staff/clients/[clientId]/students`)

*Target Roles: Admin, Staff*

*   [ ] **Define Zod Schemas (`lib/schemas/enrollment.ts`):**
    *   [ ] `EnrollStudentSchema`: Validates student email, potentially other details for creation.
    *   [ ] `BulkEnrollStudentSchema`: Validates list of student emails/data.
    *   [ ] `StudentIdSchema`: Validates student ID parameter (likely Supabase Auth user ID).
*   [ ] **List Enrolled Students (`GET /api/staff/clients/[clientId]/students`):**
    *   [ ] Create `app/api/staff/clients/[clientId]/students/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` parameter.
    *   [ ] **Staff:** Verify staff has access to this client.
    *   [ ] Fetch users from `profiles` table where `role` is 'student' and `client_id` matches the route parameter AND `is_active` (or similar enrollment status flag) is true.
    *   [ ] Return student list.
*   [ ] **Enroll Student (Manual) (`POST /api/staff/clients/[clientId]/students`):**
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` parameter.
    *   [ ] **Staff:** Verify staff has access to this client.
    *   [ ] Validate request body using `EnrollStudentSchema`.
    *   [ ] **Check if user exists:** Query `auth.users` by email.
    *   [ ] **If user exists:** Query `profiles` table. If profile exists, update `client_id` and `is_active` status. If profile doesn't exist, create one linked to the existing auth user.
    *   [ ] **If user doesn't exist:** Use `supabase.auth.admin.createUser` (or `inviteUserByEmail`). Create `profiles` record linked to the new auth user, `client_id`, and set `is_active`.
    *   [ ] Return success status or the created/updated profile.
*   [ ] **Enroll Students (Bulk) (`POST /api/staff/clients/[clientId]/students/bulk`):**
    *   [ ] Create `app/api/staff/clients/[clientId]/students/bulk/route.ts`.
    *   [ ] Implement `POST` handler.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` parameter.
    *   [ ] **Staff:** Verify staff has access to this client.
    *   [ ] Validate request body using `BulkEnrollStudentSchema`.
    *   [ ] Loop through the list of students:
        *   Perform the same logic as the manual enroll endpoint (check existence, create/update auth user, create/update profile).
    *   [ ] Consider background job processing for very large lists.
    *   [ ] Return summary of results (successes, failures).
*   [ ] **Unenroll Student (`DELETE /api/staff/clients/[clientId]/students/[studentId]`):**
    *   [ ] Create `app/api/staff/clients/[clientId]/students/[studentId]/route.ts`.
    *   [ ] Implement `DELETE` handler.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `clientId` and `studentId` parameters.
    *   [ ] **Staff:** Verify staff has access to this client.
    *   [ ] Update the student's record in the `profiles` table: set `is_active` to false (or remove `client_id` depending on chosen strategy). **Do not delete the auth user or profile record, just mark as inactive/unenrolled.**
    *   [ ] Return success status.

---

## 9. Learner Management API (`/api/admin/learners`, `/api/staff/learners`)

*Target Roles: Admin, Staff*

*Note: This API primarily reads filtered data from `profiles`.*

*   [ ] **List Learners (`GET /api/admin/learners`, `GET /api/staff/learners`):**
    *   [ ] Create `app/api/admin/learners/route.ts` and `app/api/staff/learners/route.ts`.
    *   [ ] Implement `GET` handlers.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] **Admin:** Fetch all profiles where `role` is 'student' (and potentially `is_active`). Include filters (client, search).
    *   [ ] **Staff:** Fetch all profiles where `role` is 'student' and `client_id` matches the clients accessible to the staff member. Include filters (client, search).
    *   [ ] Join with `clients` table if needed.
    *   [ ] Return learner list.
*   [ ] **Get Learner Details (`GET /api/admin/learners/[studentId]`, `GET /api/staff/learners/[studentId]`):**
    *   [ ] Create `app/api/admin/learners/[studentId]/route.ts` and `app/api/staff/learners/[studentId]/route.ts`.
    *   [ ] Implement `GET` handlers.
    *   [ ] Verify user session and role (Admin or Staff).
    *   [ ] Validate `studentId` parameter.
    *   [ ] Fetch the specific student profile from `profiles`.
    *   [ ] **Staff:** Verify the fetched student belongs to a client accessible by the staff member.
    *   [ ] Fetch related progress data (requires joining/querying progress tables - see section 10).
    *   [ ] Return combined learner profile and progress summary.

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
*   [ ] **Get Aggregated Reports (Viewer) (`GET /api/viewer/reports`):**
    *   [ ] Create `app/api/viewer/reports/route.ts`.
    *   [ ] Implement `GET` handler.
    *   [ ] Verify user session (Viewer role).
    *   [ ] Accept query parameters for filtering (client, product).
    *   [ ] Fetch progress data across relevant clients/products.
    *   [ ] Aggregate data (e.g., completion rates per product/client, average scores).
    *   [ ] Return aggregated report data.

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

*   [ ] **Define Zod Schema (`lib/schemas/auth.ts`):**
    *   [ ] `AppLoginSchema`: Validates email and password.
*   [ ] **Implement Login Route (`POST /api/app/auth/login`):**
    *   [ ] Create `app/api/app/auth/login/route.ts`.
    *   [ ] Implement `POST` handler.
    *   [ ] Validate request body using `AppLoginSchema`.
    *   [ ] Call `supabase.auth.signInWithPassword` with provided credentials.
    *   [ ] **On successful auth:**
        *   Get the user ID from the successful Supabase auth response.
        *   Query the `profiles` table using the user ID.
        *   **Check:**
            *   Does a profile exist?
            *   Is the profile `role` 'student'?
            *   Is the profile linked to a `client_id`?
            *   Is the profile marked as `is_active` (or equivalent enrollment status)?
        *   **If all checks pass:** Return success (e.g., status 200, maybe user profile info excluding sensitive data). The Supabase client on the frontend will handle the session cookie automatically via the SSR helper.
        *   **If any check fails:**
            *   Sign the user out immediately using `supabase.auth.signOut()` to clear the invalid session cookie.
            *   Return an appropriate error response (e.g., 403 Forbidden, "User not enrolled or inactive").
    *   [ ] **On failed auth (invalid credentials):** Return standard Supabase auth error (e.g., 400 Bad Request).

--- 