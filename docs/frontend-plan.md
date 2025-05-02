# Upskilling Platform - Frontend Implementation Plan

## Overview

This document provides a detailed step-by-step plan for implementing the frontend of the Upskilling Platform, covering both the Admin Panel (`/admin`) and the Main App (`/app`). It is based on the main `implementation-plan.md`, the `prd.md`, and `frontend-guidelines.md`.

**References:**
*   `docs/implementation-plan.md`: Overall project plan.
*   `docs/prd.md`: Product Requirements Document.
*   `docs/frontend-guidelines.md`: Frontend technical guidelines.

**Key Technologies & Principles:**
*   Next.js (App Router) with TypeScript
*   React (Server Components prioritized)
*   Tailwind CSS & Shadcn UI
*   Zod for validation
*   Supabase for Auth client-side interactions
*   Mobile-First Responsive Design

---

## Phase 1: Frontend Foundation (Ref: `implementation-plan.md` Section 4)

*   **1.1. Base Layouts & Routing Setup**
    *   [X] Confirm Next.js App Router structure with route groups (e.g., `app/(dashboard)` for admin/staff/viewer/client-staff, `app/(app)` for student).
    *   [X] Create/Refine `app/layout.tsx` with global providers (`ThemeProvider`, `SidebarProvider`).
    *   [X] Create distinct layout files for Admin Panel (`app/(dashboard)/layout.tsx`) and Main App (`app/(app)/layout.tsx`) if needed, handling shared vs specific UI elements.
    *   [X] Implement basic routing structure based on PRD roles and sections. (Created `app/(app)/dashboard/page.tsx`)
*   **1.2. Styling & UI Library Integration**
    *   [X] Confirm Tailwind CSS configuration (`tailwind.config.js`, `globals.css`).
    *   [X] Confirm Shadcn UI setup and `components/ui` directory population.
    *   [X] Establish base typography, color palette, and spacing in Tailwind config based on design specs (if available) or default theme. (Using default theme via CSS vars)
*   **1.3. Authentication UI (Client Components)**
    *   **1.3.1. Admin Login Page (`app/(dashboard)/login/page.tsx`)**
        *   [X] Create the page file `app/(dashboard)/login/page.tsx`.
        *   [X] Build Admin Login Form component (`components/auth/admin-login-form.tsx`). Use `'use client'`.
            *   [X] Import necessary Shadcn UI components (`Input`, `Button`, `Form`, `Label`).
            *   [X] Define Zod schema for admin login (email, password).
            *   [X] Integrate `react-hook-form` with the Zod schema.
            *   [X] Layout the form fields using Shadcn `Form` components.
            *   [X] Add a submit button with a loading state indicator (e.g., spinner).
        *   [X] Implement form submission logic within `admin-login-form.tsx`.
            *   [X] Get Supabase client instance.
            *   [X] Call `supabase.auth.signInWithPassword` in the `onSubmit` handler.
            *   [X] Manage loading state during the API call.
            *   [X] Handle success: Redirect to `/dashboard` (using `useRouter`).
            *   [X] Handle errors: Display error messages (e.g., using `toast` or inline).
        *   [X] Use the `AdminLoginForm` component within the `app/(dashboard)/login/page.tsx`.
        *   [X] Ensure basic responsiveness of the login page.
    *   **1.3.2. Main App Login Page (`app/(app)/login/page.tsx`)**
        *   [X] Create the page file `app/(app)/login/page.tsx`.
        *   [X] Build App Login Form component (`components/auth/app-login-form.tsx`). Use `'use client'`.
            *   [X] Import necessary Shadcn UI components.
            *   [X] Define Zod schema for app login (email, password).
            *   [X] Integrate `react-hook-form` with the Zod schema.
            *   [X] Layout the form fields.
            *   [X] Add a submit button with a loading state.
        *   [X] Implement form submission logic within `app-login-form.tsx`.
            *   [X] Use `fetch` or a client-side request library to call the backend API route (`/api/app/auth/login`).
            *   [X] Send email and password in the request body.
            *   [X] Manage loading state.
            *   [X] Handle success: Redirect to `/app/dashboard`.
            *   [X] Handle errors: Display specific API error messages (invalid credentials, inactive, not enrolled).
        *   [X] Use the `AppLoginForm` component within the `app/(app)/login/page.tsx`.
        *   [X] Ensure basic responsiveness.
    *   **1.3.3. Password Reset Flow UI**
        *   [X] Create "Forgot Password" Page/Section (`app/(auth)/forgot-password/page.tsx`).
            *   [X] Build a simple form component (`components/auth/forgot-password-form.tsx`). Use `'use client'`.
            *   [X] Include an email input field and submit button.
            *   [X] Define Zod schema for email validation.
            *   [X] Integrate `react-hook-form`.
            *   [X] Implement submission logic: Call Supabase `resetPasswordForEmail`.
            *   [X] Display feedback message (e.g., "Password reset email sent").
        *   [X] Create "Update Password" Page (`app/(auth)/update-password/page.tsx`). (This page is typically navigated to via a link sent to the user's email).
            *   [X] Build an update password form component (`components/auth/update-password-form.tsx`). Use `'use client'`.
            *   [X] Include fields for new password and password confirmation.
            *   [X] Define Zod schema for password validation (including confirmation match).
            *   [X] Integrate `react-hook-form`.
            *   [X] Implement submission logic: Call Supabase `updateUser`. (Note: This requires the user to be implicitly authenticated via the reset token in the URL, handled by Supabase Auth helpers/listeners).
            *   [X] Handle success: Display success message and redirect to the appropriate login page.
            *   [X] Handle errors: Display error messages.
*   **1.4. State Management Setup (Client-side)**
    *   [X] Evaluate need for client-side state management beyond local state (`useState`). (Decided TanStack Query needed)
    *   [X] If complex server state caching/mutation is needed in client components, set up TanStack Query provider (`components/providers/query-provider.tsx`).
    *   [ ] If simple global client state is needed (e.g., sidebar toggle), consider Zustand (use sparingly). Document store structure (`store/`). (Deferred - Existing Context sufficient for now)
*   **1.5. Navigation Components**
    *   [X] Refine Admin Panel Sidebar (`components/dashboard-sidebar.tsx`) - Ensure navigation links adapt based on user role fetched server-side. Use RSC. (Verified structure, needs real role data)
    *   [X] Refine Admin Panel Header (`components/dashboard-header.tsx`) - Include user profile/logout functionality. Use Client Components for interactive parts. (Verified structure)
    *   [X] Create Main App Header/Navigation Component (`components/app/app-header.tsx`).
        *   [X] Display basic navigation (e.g., Dashboard link).
        *   [X] Include user profile/logout functionality. Use Client Components for interactive parts.
        *   [X] Ensure responsiveness. (Assumed via Shadcn)

---

## Phase 2: Admin Panel Features (Ref: `implementation-plan.md` Section 5 - Admin)

*   **2.1. User Management UI (`app/(dashboard)/admin/users`)**
    *   [X] Refine User List View (`components/users/users-table.tsx` or similar) - Display users, roles, status. Use RSC for data fetching. Add filtering/sorting (can be client-side interaction). (Refactored to RSC, fetches data, client filtering deferred)
    *   [X] Create User Creation Form/Modal (`components/users/user-form.tsx`). Use `'use client'`. (Integrated via AddUserDialog)
        *   [X] Include fields for name, email, role (Admin, Staff, Viewer, Client Staff), client association (if Client Staff).
        *   [X] Implement validation (Zod).
        *   [X] Integrate with `/api/admin/users` POST endpoint. Handle loading/error states. *(Consider using Next.js Server Action here)* (Implemented createUser Server Action)
    *   [X] Create User Edit Form/Modal (reuse/extend `user-form.tsx`).
        *   [X] Populate form with existing user data.
        *   [X] Integrate with `/api/admin/users/[userId]` PUT/PATCH endpoint. *(Consider using Next.js Server Action here)* (Implemented updateUser Server Action)
    *   [X] Implement Deactivate/Activate functionality (Button triggering API call).
    *   [ ] Ensure responsiveness and accessibility.
*   **2.2. Client Management UI (`app/(dashboard)/clients`)**
    *   [X] Refine Client List View (`components/clients/clients-table.tsx`). Use RSC.
    *   [X] Create Client Creation/Edit Form/Modal (`components/clients/client-form.tsx`). Use `'use client'`.
        *   [X] Include fields for name, contact info.
        *   [X] Integrate with `/api/admin/clients` (POST/PUT/PATCH). *(Using Next.js Server Actions)*
    *   [X] Implement Client Detail View (`app/(dashboard)/clients/[clientId]/page.tsx`). Use RSC.
        *   [X] Display client details.
        *   [X] Section for Assigned Products (`components/clients/assigned-products.tsx`).
            *   [X] Display list of assigned products.
            *   [X] Implement UI for assigning/unassigning existing products.
                *   [X] Add "Assign Product" button.
                *   [X] Build modal component (`components/clients/assign-product-modal.tsx`).
                *   [X] Fetch available products within modal.
                *   [X] Allow selection of products to assign.
                *   [X] Call `/api/staff/clients/[clientId]/products` (or Server Action) on submit.
                *   [X] Implement "Unassign" button next to each assigned product, triggering API call.
        *   [X] Section for Managing Students (`components/clients/manage-students.tsx`).
            *   [X] Display list of enrolled students for this client (use a table component).
            *   [X] Implement UI for enrolling new students (manual form).
                *   [X] Add "Enroll Student" button.
                *   [X] Build modal/form (`components/clients/enroll-student-form.tsx`) with name/email fields.
                *   [X] Call `/api/staff/clients/[clientId]/students` (or Server Action) on submit.
            *   [X] Implement UI for removing/deactivating student enrollment.
                *   [X] Add "Remove/Deactivate" button next to each student.
                *   [X] Call `/api/staff/clients/[clientId]/students` (DELETE or PATCH) (or Server Action).
    *   [ ] Ensure responsiveness and accessibility.
*   **2.3. Product Management UI (`app/(dashboard)/products`)**
    *   [X] Refine Product List View (`components/products/products-table.tsx`). Use RSC.
    *   [X] Create Product Creation/Edit Form/Modal (`components/products/product-form.tsx`). Use `'use client'`.
        *   [X] Include fields for name, description.
        *   [X] Integrate with `/api/admin/products` (POST/PUT/PATCH). *(Consider using Next.js Server Action here)*
    *   [X] Implement Product Detail View (`app/(dashboard)/products/[productId]/page.tsx`). Use RSC.
        *   [X] Display product details.
        *   [X] Section for Managing Modules (`components/modules/module-manager.tsx`). (See 2.6)
            *   [X] Fetch and display list of modules associated with the product.
            *   [X] Implement "Add Module" button/flow.
            *   [X] Implement Edit/Delete actions for existing modules.
    *   [ ] Ensure responsiveness and accessibility.
*   **2.4. Learners Management UI (`app/(dashboard)/learners`)**
    *   [X] Confirm Learners Page Route (`app/(dashboard)/learners/page.tsx`). Use RSC.
    *   [X] Confirm Learners Header Component (`components/learners/learners-header.tsx`). Likely RSC.
    *   [X] Refine Learners List View (`components/learners/learners-table.tsx`). Use RSC, fetch data via `/api/admin/learners` or `/api/staff/learners`. Add filtering.
    *   [X] Implement Learner Detail View (separate page `app/(dashboard)/learners/[studentId]`). Use RSC.
        *   [X] Fetch and display learner profile information (name, email, client).
        *   [X] Fetch and display learner progress.
            *   [X] Call progress API endpoint(s) for the specific learner.
            *   [X] Structure display by Product > Module.
            *   [X] Show Course % and Assessment score/status.
    *   [ ] Ensure responsiveness and accessibility.
*   **2.5. Question Bank UI (`app/(dashboard)/question-banks`)**
    *   [X] Refine Question List View (`components/question-banks/question-list.tsx`). Use RSC.
        *   [X] Implement switcher/tabs to view Course vs. Assessment bank questions.
        *   [X] Display question text, type, potentially tags.
    *   [X] Create Question Creation/Edit Form/Modal (`components/question-banks/question-form.tsx`). Use `'use client'`.
        *   [X] Fields for question text, type (MCQ/MSQ - context-dependent), options, correct answer(s), bank association (Course/Assessment), tags.
        *   [X] Implement dynamic form UI based on question type (MCQ vs MSQ options/answers).
        *   [X] Implement validation (Zod).
        *   [X] Integrate with `/api/admin/question-banks` (POST/PUT/PATCH). *(Consider using Next.js Server Action here)*
    *   [X] Implement Delete functionality.
    *   [X] Ensure responsiveness and accessibility.
*   **2.6. Module Assignment UI (within Product Detail View)**
    *   [X] Implement Module Manager Component (`components/modules/module-manager.tsx`) displayed on `app/(dashboard)/products/[productId]/page.tsx`. Use RSC for initial list.
        *   [X] Update component to only display modules *currently assigned* to the product.
    *   [X] Implement "Assign Existing Module" functionality. Use `'use client'`.
        *   [X] Add "Assign Module" button.
        *   [X] Create Modal (`components/products/assign-module-modal.tsx`).
            *   [X] Fetch list of *all* available modules (or filter unassigned) from `/api/admin/modules`.
            *   [X] Provide UI (e.g., searchable list/table) to select one or more modules.
            *   [X] On submit, call API to associate selected module(s) with the product (e.g., `PUT /api/admin/modules/[moduleId]` to update `product_id`, or a dedicated endpoint like `POST /api/admin/products/[productId]/modules/[moduleId]`).
    *   [X] Implement "Unassign" functionality for each assigned module.
        *   [X] Add "Unassign" button/action next to each module in the list.
        *   [X] On click, trigger API call to disassociate the module (e.g., `PUT /api/admin/modules/[moduleId]` setting `product_id` to `null`, or `DELETE /api/admin/products/[productId]/modules/[moduleId]`).
    *   [X] Ensure responsiveness and accessibility for the module assignment list.
*   **2.7. Dedicated Module Management UI**
    *   **2.7.1. Module Listing Page (`app/(dashboard)/modules/page.tsx`)**
        *   [X] Create Module List Page using RSC.
            *   [X] Implement fetch logic to get all modules
            *   [X] Display modules in a table/list with columns for name, type, product assignment
            *   [X] Add basic filtering by module type (Course/Assessment)
            *   [X] Add "Create New Module" button
            *   [X] Implement responsive design for the table
    
    *   **2.7.2. Basic Module Creation Flow**
        *   [X] Create/refine Module Form component (`components/modules/standalone-module-form.tsx`)
            *   [X] Allow selection of module type (Course/Assessment)
            *   [X] Include fields for name and description
            *   [X] Add validation with Zod schema
        *   [X] Implement creation page or modal from the module list
            *   [X] Create basic form for new module with name, type, description
            *   [X] Add type-specific configurations (time limit for Assessment, etc.)
            *   [X] Implement form submission to create module
            *   [X] Add success handling and redirection to detail page
    
    *   **2.7.3. Module Detail View**
        *   [X] Create basic detail view (`app/(dashboard)/modules/[moduleId]/page.tsx`)
            *   [X] Fetch and display module basic info
            *   [X] Show module type, name, description
            *   [X] Display current product assignment if any
            *   [X] Add edit/delete functionality for core module properties
            *   [X] Create tabs or sections for the different module components
    
    *   **2.7.4. Course Module Editor - Part 1 (Lesson Management)**
        *   [X] Create Lesson Manager component (`components/modules/lesson-manager.tsx`)
            *   [X] Display ordered list of lessons
            *   [X] Implement "Add Lesson" button and form
            *   [X] Add "Remove Lesson" and "Edit Lesson" controls
            *   [X] Support reordering lessons (drag and drop or up/down buttons)
            *   [X] Implement save/update functionality for lesson ordering
    
    *   **2.7.5. Course Module Editor - Part 2 (Video Management)**
        *   [X] Create Video Upload component (`components/modules/video-uploader.tsx`)
            *   [X] Build component with `input type="file"`
            *   [X] Add file selection and validation for video types
            *   [X] Implement upload progress indicator
            *   [X] Integrate with storage API (`/api/admin/storage/upload`)
            *   [X] Create video preview with playback controls
            *   [X] Add replace/remove functionality
            *   [X] Integrate into lesson form component
    
    *   **2.7.6. Course Module Editor - Part 3 (Quiz Management)**
        *   [X] Create Quiz Selection component (`components/modules/quiz-selector.tsx`)
            *   [X] Add "Add/Edit Quiz" button
            *   [X] Create selection modal for Course question bank
            *   [X] Fetch questions from question bank API with type filter
            *   [X] Implement multi-select for questions
            *   [X] Display selected quiz questions
            *   [X] Save selected questions to lesson data
    
    *   **2.7.7. Assessment Module Editor**
        *   [X] Create Assessment Question Manager component
            *   [X] Add "Select Questions" button
            *   [X] Create question selection modal for Assessment bank
            *   [X] Display selected questions in ordered list
            *   [X] Implement reordering functionality
            *   [X] Add remove question option
            *   [X] Save question selection and order
    
    *   **2.7.8. Module Data Validation and Integration**
        *   [X] Implement validation logic for modules
            *   [X] For Course modules: ensure every lesson has both video and quiz (if enabled)
            *   [X] For Assessment modules: ensure minimum number of questions
        *   [ ] Create comprehensive save functionality
            *   [ ] Save all module components in proper sequence
            *   [ ] Handle partial saves and error recovery
            *   [ ] Add validation before submission
        *   [ ] Test end-to-end module creation and editing flows

*   **2.8. Progress Monitoring UI (`app/(dashboard)/dashboard`, `app/(dashboard)/analytics`)**
    *   [ ] Implement Viewer Dashboard (`app/(dashboard)/dashboard/page.tsx` or specific route). Use RSC.
        *   [ ] Display aggregated data visualizations (charts, stats) fetched from relevant API.
    *   [ ] Implement Client Staff Dashboard/Reports View. Use RSC.
        *   [ ] Display progress data (tables, charts) filtered for their client, fetched from `/api/client-staff/progress`.
    *   [ ] Create reusable Progress Display Components (`components/analytics/progress-display.tsx` or similar).
        *   [ ] Component to show course percentage.
        *   [ ] Component to show assessment status/score.
    *   [ ] Implement "Export to Excel" Button (`components/common/export-button.tsx`). Use `'use client'`.
        *   [ ] Place button on relevant Admin, Staff, Client Staff progress views.
        *   [ ] On click, trigger fetch request to the appropriate export API endpoint (`/api/[role]/progress/export`).
        *   [ ] Ensure response headers trigger file download (`Content-Disposition`).
        *   [ ] Handle potential errors during export generation/download.
    *   [ ] Ensure responsiveness and accessibility.
*   **2.9. Notification UI (Admin Panel)**
    *   [X] Refine Notification Display Component (`components/common/notification-center.tsx`). Use `'use client'`.
    *   [ ] Integrate component with notification fetching API (`/api/client-staff/notifications`).
        *   [ ] Implement polling or investigate Supabase Realtime for push updates.
    *   [ ] Display notifications clearly (e.g., in header dropdown with count badge).
    *   [ ] Implement mark-as-read functionality (API call on click/view).

---

## Phase 3: Main App (Student) Features (Ref: `implementation-plan.md` Section 5 - App)

*   **3.1. Student Dashboard UI (`app/(app)/dashboard/page.tsx`)**
    *   [ ] Implement main dashboard page using RSC.
        *   [ ] Fetch assigned products, nested modules, and initial progress state for the logged-in student.
    *   [ ] Create Product List Component (`components/app/product-list.tsx`).
        *   [ ] Map over fetched products.
        *   [ ] Use Shadcn UI `Accordion` for Product items.
        *   [ ] Nest Module Item Components within each Accordion item.
    *   [ ] Create Module Item Component (`components/app/module-item.tsx`).
        *   [ ] Receive module data and progress as props.
        *   [ ] Display title, type.
        *   [ ] Use helper function/component to render progress (Not Started, %, Completed, Score).
        *   [ ] Render `Link` component from `next/link` pointing to the correct module page (`/app/courses/[moduleId]` or `/app/assessments/[moduleId]`).
        *   [ ] Ensure responsiveness and accessibility.
*   **3.2. Course Player UI (`app/(app)/courses/[moduleId]/page.tsx`)**
    *   [ ] Implement Course Player Page (Top-level component).
        *   [ ] Fetch course structure (lessons, videos, quizzes) via RSC based on `moduleId`.
        *   [ ] Fetch initial student progress/resume point for this course.
    *   [ ] Create Course Container Component (`components/app/course-container.tsx`). Use `'use client'`.
        *   [ ] Manage overall course state (current lesson index, completed status of lessons).
        *   [ ] Render Video Player, Navigation, and Quiz components based on current state.
        *   [ ] Implement progress saving logic (calling API on lesson completion).
        *   [ ] Implement resume logic (setting initial state based on fetched progress).
    *   [ ] Create Video Player Component (`components/app/video-player.tsx`). Use `'use client'`.
        *   [ ] Integrate HTML5 `<video>` player or library.
        *   [ ] Load video URL passed via props.
        *   [ ] Add event listeners (`onEnded`, potentially `onTimeUpdate` for finer tracking if needed) to report completion to parent container.
    *   [ ] Create Course Navigation Component (`components/app/course-navigation.tsx`). Use `'use client'`.
        *   [ ] Display list/sidebar of lessons/quizzes.
        *   [ ] Highlight current item based on state from parent container.
        *   [ ] Implement interactive elements (Next/Prev buttons, direct navigation click).
        *   [ ] Disable navigation to future items based on completion status (state from parent).
        *   [ ] Signal navigation changes to parent container.
    *   [ ] Create Quiz Display Component (`components/app/quiz-display.tsx`). Use `'use client'`.
        *   [ ] Receive quiz question data via props.
        *   [ ] Render question and MCQ options.
        *   [ ] Handle user selection state.
        *   [ ] Implement submission logic.
        *   [ ] Provide feedback (correct/incorrect).
        *   [ ] Report completion status to parent container.
    *   [ ] Ensure responsiveness and accessibility.
*   **3.3. Assessment UI (`app/(app)/assessments/[moduleId]/page.tsx`)**
    *   [ ] Implement Assessment Page (Top-level component).
        *   [ ] Fetch assessment details (title, instructions, time limit) via RSC.
        *   [ ] Conditionally render Instructions or Runner component.
    *   [ ] Create Assessment Instructions Component (`components/app/assessment-instructions.tsx`).
        *   [ ] Display fetched instructions/details.
        *   [ ] Include "Start Assessment" button triggering state change to show Runner.
    *   [ ] Create Assessment Runner Component (`components/app/assessment-runner.tsx`). Use `'use client'`.
        *   [ ] Fetch assessment questions on component mount (or triggered by "Start").
        *   [ ] Implement Timer logic.
            *   [ ] Use `setInterval` / `setTimeout`.
            *   [ ] Update displayed time remaining.
            *   [ ] Trigger auto-submit on expiry.
        *   [ ] Manage Assessment State.
            *   [ ] Store fetched questions.
            *   [ ] Track current question index.
            *   [ ] Store user answers (`{ questionId: answer }`).
            *   [ ] Track submission status (loading, submitted, error).
        *   [ ] Display Question Component (`components/app/assessment-question.tsx`).
            *   [ ] Render current question based on index.
            *   [ ] Handle MCQ/MSQ answer selection, updating state in Runner.
        *   [ ] Implement Navigation (Next/Previous buttons, if allowed), updating current index.
        *   [ ] Implement Submission Logic.
            *   [ ] Manual submit button calls API (`/api/app/assessments/[moduleId]/submit`) with stored answers.
            *   [ ] Auto-submit (on timer expiry) calls the same API.
            *   [ ] Handle loading/error states.
            *   [ ] On success, transition to show Results component.
    *   [ ] Create Assessment Results Component (`components/app/assessment-results.tsx`).
        *   [ ] Display score/status received from API response or fetched separately.
        *   [ ] Provide link back to dashboard.
    *   [ ] Ensure responsiveness and accessibility.

---

## Phase 4: Integration, Testing & Polish (Ref: `implementation-plan.md` Sections 6, 7, 8)

*   **4.1. API Integration & Data Flow**
    *   [ ] **Continuous:** Ensure all frontend forms and actions correctly call backend APIs.
    *   [ ] **Continuous:** Verify data flows correctly (UI -> API -> DB -> API -> UI).
    *   [ ] **Testing:** Test Authentication Flow thoroughly:
        *   [ ] Admin/Staff/Viewer/Client Staff login/logout via `/admin`.
        *   [ ] Student login/logout via `/app`.
        *   [ ] **Crucially: Test that only actively enrolled students can log into `/app`.**
        *   [ ] Test password reset flow.
        *   [ ] Test role-based access restrictions within the Admin Panel.
        *   [ ] Test session expiry handling.
*   **4.2. State Management Verification**
    *   [ ] Review usage of client-side state (local, context, global) for appropriateness and efficiency.
    *   [ ] Ensure server state caching (React Query, Next.js fetch cache) is working as expected.
*   **4.3. Error Handling & Loading States**
    *   [X] **Standard:** Implement consistent loading indicators (skeletons, spinners) for all data fetching.
    *   [X] **Standard:** Implement consistent error handling (toast notifications, inline messages) for API calls and form submissions.
    *   [ ] Implement React Error Boundaries for critical UI sections.
*   **4.4. Frontend Testing**
    *   [ ] Write Unit Tests (Jest/RTL) for:
        *   [ ] Complex utility functions (`lib/utils`, e.g., date formatting, progress calculation helpers).
        *   [ ] Client components with significant isolated logic (e.g., Timer component, form validation logic hooks).
    *   [ ] Write Integration Tests (RTL) for:
        *   [ ] Forms (input, validation, submission mock).
        *   [ ] Components using Context/Global state (e.g., Notification Center).
        *   [ ] Container components rendering children based on state (e.g., Course Container, Assessment Runner).
    *   [ ] Implement E2E Tests (Playwright/Cypress) for critical user flows:
        *   [ ] Admin Login -> Create Client -> Create Product -> Add Course Module -> Add Assessment Module.
        *   [ ] Staff Login -> Assign Product to Client -> Enroll Student.
        *   [ ] Student Login -> View Dashboard -> Complete Course Module (navigate, watch video, pass quiz) -> Complete Assessment Module (start, answer, submit) -> View Results/Progress.
        *   [ ] Client Staff Login -> View Progress for their client/student.
        *   [ ] Viewer Login -> View Aggregated Dashboard.
        *   [ ] Password Reset Flow.
    *   [ ] Perform Manual Cross-Browser/Device Testing (Chrome, Firefox, Safari; Desktop, Tablet, Mobile).
*   **4.5. Documentation**
    *   [ ] Add/Review JSDoc comments for all components, props, hooks, and complex functions.
    *   [ ] Update project README with clear frontend setup and run instructions.
    *   [ ] Draft basic User Guides:
        *   [ ] Admin Guide (Creating users, clients, products, modules).
        *   [ ] Staff Guide (Assigning products, enrolling students).
        *   [ ] Client Staff Guide (Viewing progress, notifications).
        *   [ ] Student Guide (Login, dashboard navigation, taking courses/assessments).
*   **4.6. Final Review & Optimization**
    *   [ ] Review code against `frontend-guidelines.md`.
    *   [ ] Perform accessibility audit (axe DevTools, manual checks, verify `eslint-plugin-jsx-a11y` usage).
    *   [ ] Perform basic performance review (Lighthouse, bundle size check). Optimize where necessary.
    *   [ ] **Verify usage of `next/font` for font optimization.**
    *   [ ] **Verify usage of `next/image` for any images.**
    *   [ ] Ensure UI consistency and polish.

---

## Phase 5: Deployment Preparation (Ref: `implementation-plan.md` Section 9)

*   **5.1. Vercel Configuration**
    *   [ ] Ensure necessary frontend environment variables are set for Staging and Production on Vercel (e.g., Supabase URL/Anon Key, potentially API URLs if separate).
*   **5.2. CI/CD**
    *   [ ] Verify frontend build steps, linting, and testing commands run correctly in the Vercel CI/CD pipeline.
*   **5.3. Domain & Path Routing**
    *   [ ] Confirm Vercel configuration handles `platform.com/admin` and `platform.com/app` correctly, potentially using middleware or redirects if necessary based on Next.js structure.
*   **5.4. Final Testing on Staging**
    *   [ ] Perform thorough manual E2E testing of all frontend features on the staging environment before production deployment. 