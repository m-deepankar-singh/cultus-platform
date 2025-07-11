# Project Backlog

This file tracks identified issues, bugs, and future tasks for the Upskilling Platform.

## Bugs / Issues

- [x] **Client Dropdown Empty in User Creation**
    - **Feature:** User Management (Admin Panel)
    - **Problem:** When creating a new user and selecting the "Client Staff" role in the `AddUserDialog`, the subsequent "Client" dropdown appears but is empty. It does not populate with the list of clients.
    - **Context:** The client list *is* being fetched correctly in the `UsersPage` server component and passed down through props (`UsersHeader` -> `AddUserDialog` -> `UserForm`). The `(clients || []).map` guard prevents runtime errors but doesn't resolve the missing data.
    - **Expected:** The "Client" dropdown should list all available clients fetched from the database.
    - **Possible Causes:** Prop drilling issue across Server/Client component boundaries, timing issue where the client component renders the conditional field before props are fully available/updated, state synchronization issue.
    - **Relevant Files:**
        - `app/(dashboard)/admin/users/page.tsx`
        - `components/users/users-header.tsx`
        - `components/users/add-user-dialog.tsx`
        - `components/users/user-form.tsx`
    - **Resolution:** Added client-side fetching of clients in the `AddUserDialog` component to ensure the dropdown has the most up-to-date data. Created a new `/api/admin/clients` endpoint to facilitate this. Also added filtering for null/empty client IDs in the dropdown rendering.

- [x] **Learner Updates Not Persisting in Database**
    - **Feature:** Learner Management (Admin Panel)
    - **Problem:** Updates to learner information via the admin PATCH endpoint sometimes don't persist in the database despite the API returning success responses with updated data.
    - **Context:** The API endpoint is correctly receiving requests, validating input, and executing update operations with the service client to bypass RLS policies. Detailed logging shows the update being executed and returning success, but changes don't always appear in the database or UI.
    - **Expected:** All validated updates should be persisted in the database and reflected in subsequent fetches.
    - **Root Cause:** Email updates in Supabase Auth by default require verification via links sent to both old and new email addresses before the change is finalized, causing a mismatch between API response data and actual database state.
    - **Relevant Files:**
        - `app/api/admin/learners/[studentId]/route.ts` (PATCH method)
        - `components/learners/edit-learner-dialog.tsx`
        - `lib/supabase/server.ts` (service client creation)
    - **Resolution:** Instead of implementing complex synchronization between the students table and auth.users tables, email updates have been disabled in the UI and API to prevent inconsistencies. The edit form now shows email as disabled with an explanatory message, and the API returns an error if email changes are attempted.

## Future Tasks

- [ ] **Job Readiness Submissions Review Feature (HIGH PRIORITY)**
    - **Feature:** Job Readiness Admin Panel - Submissions Management
    - **Description:** Complete submission review workflow for admins to review student project and interview submissions
    - **API Issues to Fix:**
        - Fix Next.js 15 async params issue in `/api/admin/job-readiness/interviews/[submissionId]/manual-review/route.ts`
        - Create missing GET endpoint for listing submissions: `/api/admin/job-readiness/submissions`
        - Add filtering and pagination to submissions API
    - **Frontend Components to Create:**
        - `lib/api/job-readiness/submissions.ts` - API client functions for submissions
        - `components/job-readiness/admin/jr-submissions-table.tsx` - Table for listing submissions
        - `components/job-readiness/admin/jr-interview-review-modal.tsx` - Modal for manual interview review
        - `components/job-readiness/admin/jr-submission-details.tsx` - Component to view submission details
    - **UI Features:**
        - List all project and interview submissions with filtering
        - Search by student name, submission type, status
        - Filter by product, date range, submission status
        - Manual review workflow for interview submissions
        - View submission details (project content, interview recordings)
        - Approve/reject submissions with admin feedback
        - Export submissions data
    - **Database Tables:**
        - `job_readiness_ai_interview_submissions` - Interview submission data
        - `job_readiness_ai_project_submissions` - Project submission data
    - **Relevant Files:**
        - `app/(dashboard)/admin/job-readiness/submissions/page.tsx` - Main submissions page (placeholder exists)
        - `app/api/admin/job-readiness/interviews/[submissionId]/manual-review/route.ts` - Manual review API (needs async fix)
        - `app/api/admin/job-readiness/submissions/route.ts` - New endpoint for listing submissions

- [ ] Implement User Edit Form/Modal (Step 2.1)
- [ ] Implement User Deactivate/Activate functionality (Step 2.1)
- [ ] Implement Client-side filtering for Users Table (Step 2.1)
- [ ] **Verify Student Product Assignment & Module Progress**
    - **Feature:** Learner Management (Progress Tracking)
    - **Description:** Verify proper linking between students and their assigned products/modules
    - **Tasks:**
        - Confirm student_product_assignments table contains correct relations
        - Check module progress is correctly linked to modules via module_id
        - Ensure module progress displays actual module names instead of IDs
        - Test with multiple students and various product/module combinations
    - **Relevant Files:**
        - `app/(dashboard)/learners/[studentId]/page.tsx`
        - Database tables: `student_product_assignments`, `student_module_progress`, `modules`
- [ ] **Implement Bulk Student Import Feature**
    - **Feature:** Client Management (Student Enrollment)
    - **Description:** Add ability to import multiple students at once via CSV upload
    - **Tasks:**
        - Create UI for file upload in the students management section
        - Implement CSV parsing logic
        - Add validation for imported data
        - Provide feedback on import success/failures
    - **Relevant Files:**
        - `components/clients/manage-students.tsx`
        - `components/clients/bulk-import-modal.tsx` (to be created)
        - `app/api/staff/clients/[clientId]/students/bulk-import` (to be created)

## Completed Tasks (Example)

- [x] Setup basic project structure
- [x] Implement Admin and App Login UI (Steps 1.3.1, 1.3.2)
- [x] Implement Password Reset Flow (Step 1.3.3)
- [x] Implement User Creation Server Action & Form (part of Step 2.1) 