# Project Backlog

This file tracks identified issues, bugs, and future tasks for the Upskilling Platform.

## Bugs / Issues

- [ ] **Client Dropdown Empty in User Creation**
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

## Future Tasks

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