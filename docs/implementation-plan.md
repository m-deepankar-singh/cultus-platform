# Upskilling Platform Implementation Plan

## Overview

This document outlines the detailed implementation plan for building the modular Upskilling Platform for university clients. It covers the development roadmap for both the Admin Panel (`platform.com/admin`) and the Main App (`platform.com/app`), integrating requirements from the PRD and guidelines from the tech stack, frontend, backend, and application flow documents.

## 1. Project Setup (Foundation - aligns with PRD Phase 1 Start)

*   [X] **Repository Setup**
    *   [X] Initialize Git repository.
    *   [X] Establish branching strategy (e.g., Gitflow).
    *   [X] Configure basic repository settings (README, LICENSE, .gitignore, .cursorindexingignore).
*   [X] **Development Environment Configuration**
    *   [X] Initialize Next.js (App Router) project with TypeScript.
    *   [X] Configure ESLint and Prettier for code linting and formatting.
    *   [X] Define local environment variable setup (`.env.local.example`).
*   [X] **Supabase Project Setup**
    *   [X] Create a new Supabase project.
    *   [X] **Note:** Database schema, RLS, and other configurations will be managed directly via the Supabase Dashboard.
    *   [ ] ~~Configure Supabase locally using the Supabase CLI.~~
    *   [ ] ~~Log in to Supabase CLI (`supabase login`).~~
    *   [ ] ~~Link local repository to Supabase project (`supabase link`).~~
    *   [ ] ~~Pull existing database changes if any (`supabase db pull`).~~
*   [ ] **Vercel Integration**
    *   [ ] Connect Git repository to Vercel project.
    *   [ ] Configure basic Vercel settings (framework preset, root directory).
    *   [ ] Set up initial environment variables on Vercel (Supabase URL, Anon Key).
*   [X] **Dependency Installation**
    *   [X] Install core dependencies: `react`, `react-dom`, `next`, `typescript`.
    *   [X] Install Supabase libraries: `@supabase/supabase-js`, `@supabase/ssr`.
    *   [X] Install styling dependencies: `tailwindcss`, `postcss`, `autoprefixer`.
    *   [X] Install UI component dependencies: `shadcn-ui` (or `lucide-react`, `radix-ui`, `tailwind-variants`, etc.).
    *   [X] Install validation library: `zod`.
    *   [ ] Install testing libraries: `jest`, `@testing-library/react`, `@testing-library/jest-dom`.

## 2. Backend Foundation (Core - aligns with PRD Phase 1)

*   [X] **Database Schema - Core Tables (Managed via Supabase Dashboard)**
    *   [X] ~~Define initial migration (`0000_initial_schema.sql`) using Supabase CLI.~~
    *   [X] Create `clients` table.
    *   [X] Create `profiles` table (for Admin Panel users, linked to `auth.users`, includes `role`, `client_id` FK if applicable).
    *   [X] Create `students` table (for Main App users, linked to `auth.users`, includes `client_id` FK).
    *   [X] Create `products` table.
    *   [X] Create `modules` table (linked to products).
    *   [X] Create `roles` table (optional, for role definition).
    *   [X] ~~Apply initial migration locally (`supabase db push` or `supabase migration up`).~~
*   [X] **Supabase Authentication Setup**
    *   [X] Configure email/password provider in Supabase dashboard (incl. Password Reset).
    *   [X] Customize email templates (invite, confirmation, password reset) if needed.
    *   [X] Set up Supabase Auth helper (`@supabase/ssr`) for Next.js server-side auth (client, server, middleware utils).
    *   [X] Implement student login verification logic (API route).
*   [X] **Row-Level Security (RLS) - Foundation (Managed via Supabase Dashboard)**
    *   [X] Enable RLS on `profiles`, `clients`, `students`, `products`, `modules` tables.
    *   [X] Implement default-deny policies (implicit after enabling RLS).
    *   [X] Create basic policies for profiles (self read/update, admin all).
    *   [X] Create basic policies for students (self read/update, admin all, client staff read).
    *   [X] Create basic policies for clients (admin all, staff/client_staff read).
    *   [X] Create basic policies for products & modules (admin all).
    *   [X] Test basic RLS policies (anonymous, admin, student, client staff).
*   [X] **API Structure & Server-Side Utilities**
    *   [X] Set up basic API route structure under `app/api/` (`auth`, `admin`, `app`).
    *   [X] Implement server-side Supabase client creation utility (`lib/supabase/server.ts`).
    *   [X] Define utilities for fetching user session/profile/student data (`lib/supabase/utils.ts`).
*   [X] **Seed Initial Data (Optional - Managed via Supabase Dashboard)**
    *   [X] ~~Create seed script (`supabase/seed.sql`) for default roles, admin user, etc.~~
    *   [X] Add initial Admin user via Auth & create profile record.
    *   [X] Add default roles (optional).
    *   [X] Add test clients (optional).
    *   [X] Add test students via Auth & create student records (optional).

## 3. Feature-specific Backend (Modules & Features - aligns with PRD Phases 1, 2, 4)
*Note: All table schema definitions and RLS policies below are managed via the Supabase Dashboard.*

*   [ ] **User Management API (`/api/admin/users`)**
    *   [ ] Implement API routes for CRUD operations on users (Admin).
    *   [ ] Integrate with Supabase Auth `admin` methods for user creation/deletion.
    *   [ ] Implement logic for assigning roles and associating Client Staff with Clients.
    *   [ ] Define Zod schemas for request validation.
    *   [ ] Implement corresponding RLS policies on `profiles` for Staff, Viewer, Client Staff access (read-only, scoped).
*   [ ] **Client Management API (`/api/admin/clients`, `/api/staff/clients`)**
    *   [ ] Implement API routes for CRUD operations (Admin).
    *   [ ] Implement API routes for Staff (view all/scoped, update assigned).
    *   [ ] Define Zod schemas for request validation.
    *   [ ] Implement RLS policies for client data access based on roles.
*   [ ] **Product Management API (`/api/admin/products`)**
    *   [ ] Define `products` table schema.
    *   [ ] Implement API routes for CRUD operations (Admin only).
    *   [ ] Define Zod schemas for validation.
    *   [ ] Implement RLS policies.
*   [ ] **Question Bank API (`/api/admin/question-banks`)**
    *   [ ] Define `course_questions` and `assessment_questions` table schemas (incl. question text, type, options, correct answer, tags).
    *   [ ] Implement API routes for CRUD operations (Admin only).
    *   [ ] Define Zod schemas for validation.
    *   [ ] Implement RLS policies.
*   [ ] **Module Management API (`/api/admin/products/:pid/modules`, `/api/admin/modules/:mid`)**
    *   [ ] Define `modules` table schema (linked to products, type: Course/Assessment, configuration JSONB?).
    *   [ ] Define `course_lessons` table (linked to Course modules, sequence, video_url, quiz_id FK?).
    *   [ ] Define `assessment_module_questions` table (linking Assessment modules to questions).
    *   [ ] Implement API routes for adding/updating/deleting modules within products (Admin only).
    *   [ ] Implement API routes for managing course lesson structure (Admin only).
    *   [ ] Define Zod schemas for validation.
    *   [ ] Implement RLS policies.
*   [ ] **Storage Integration (`/api/admin/storage/upload`)**
    *   [ ] Configure Supabase Storage bucket (`course-videos`) via Dashboard.
    *   [ ] Set up Storage policies via Dashboard.
    *   [ ] Implement API route for handling video uploads from Admin UI.
*   [ ] **Product Assignment API (`/api/staff/clients/:cid/products`)**
    *   [ ] Define `client_product_assignments` table schema.
    *   [ ] Implement API routes for Staff/Admin to assign/unassign products to clients.
    *   [ ] Implement RLS policies.
*   [ ] **Student Enrollment API (`/api/staff/clients/:cid/students`)**
    *   [ ] Define `student_enrollments` table or handle via `profiles.client_id`. **Ensure `profiles` table has flags/status to indicate active enrollment.**
    *   [ ] Implement API routes for Staff/Admin to add/remove students for a client (manual & bulk). **These must update the enrollment status in `profiles`.**
    *   [ ] Integrate with Supabase Auth for creating student users.
    *   [ ] Implement RLS policies.
*   [ ] **Learner Management API (`/api/admin/learners`, `/api/staff/learners`)**
    *   [ ] Define necessary data relationships (likely reads from `profiles` filtered by role/client status).
    *   [ ] Implement API routes for fetching learner data (Admin, Staff - scoped).
    *   [ ] Implement RLS policies for accessing learner profiles.
*   [ ] **Progress Tracking API (`/api/app/progress/...`, `/api/client-staff/progress`, `/api/viewer/reports`)**
    *   [ ] Define `course_progress` table schema.
    *   [ ] Define `assessment_progress` table schema.
    *   [ ] Implement API routes for Student App to update progress (`PATCH /api/app/progress/course/:cid`, `POST /api/app/assessments/:id/submit`).
    *   [ ] Implement API routes for fetching progress data (scoped for Client Staff, aggregated for Viewer).
    *   [ ] Implement robust RLS policies for all progress tables based on roles.
*   [ ] **Notification Logic (Backend)**
    *   [ ] Define `notifications` table schema.
    *   [ ] Implement triggers or backend logic (e.g., after module update) to create notifications for relevant Client Staff.
    *   [ ] Implement API route for Client Staff to fetch notifications (`GET /api/client-staff/notifications`).
    *   [ ] Implement RLS policies for notifications.
*   [ ] **Excel Export API (`/api/[role]/progress/export`)**
    *   [ ] Implement API endpoint(s) for Admin, Staff, Client Staff roles.
    *   [ ] Add backend dependency for Excel generation (e.g., `exceljs`).
    *   [ ] Implement data fetching logic (filtered by role/client).
    *   [ ] Implement Excel file generation logic.
    *   [ ] Set correct response headers for download.
*   [ ] **App Login API (`/api/app/auth/login`)**
    *   [ ] Implement dedicated API route for student login.
    *   [ ] Route calls `supabase.auth.signInWithPassword`.
    *   [ ] On success, queries `profiles` table to verify user is an active, enrolled student linked to a client.
    *   [ ] Returns success/session only if both checks pass, otherwise returns appropriate error.

## 4. Frontend Foundation (Core - aligns with PRD Phase 1)

*   [X] **Base Layouts & Routing**
    *   [X] Set up Next.js App Router structure with route groups for `/admin` and `/app` (e.g., `app/(dashboard)`).
    *   [X] Create base layout components (`app/layout.tsx`) for Admin Panel and Main App.
    *   [X] Include global styles, providers (e.g., `ThemeProvider`, `SidebarProvider`).
*   [X] **Styling & UI Library Setup**
    *   [X] Configure Tailwind CSS (`tailwind.config.js`, `globals.css`).
    *   [X] Integrate Shadcn UI (or chosen library) components (`components/ui` exists).
*   [ ] **Authentication UI**
    *   [ ] Create Login page/component for `/admin` (RSC + Client Component form).
    *   [ ] Create Login page/component for `/app` (RSC + Client Component form).
    *   [ ] Implement Password Reset UI flow.
    *   [ ] Integrate Admin forms with Supabase Auth client methods.
    *   [ ] Integrate App login form with the dedicated `/api/app/auth/login` endpoint.
*   [ ] **State Management Setup (Client)**
    *   [ ] Configure React Query (`TanStack Query`) provider if chosen for server state management in client components.
    *   [ ] Set up Zustand store if chosen for global client state (use sparingly).
*   [X] **Navigation Components**
    *   [X] Create basic sidebar/header navigation components for Admin Panel (`dashboard-sidebar.tsx`, `dashboard-header.tsx` exist & modified).
    *   [ ] Create basic header/navigation for Main App.

## 5. Feature-specific Frontend (Modules & Features - aligns with PRD Phases 1, 3, 4)

*   [X] **Admin: User Management UI**
    *   [X] Implement user list view (table component) with filtering/sorting (`components/users` dir exists, table enhanced).
    *   [ ] Implement user creation/edit forms.
    *   [ ] Integrate forms with user management API.
*   [X] **Admin: Client Management UI**
    *   [X] Implement client list view (`components/clients` dir exists, table enhanced with badges).
    *   [ ] Implement client creation/edit forms.
    *   [ ] Implement UI for assigning products to clients.
    *   [ ] Implement UI for managing students within a client.
    *   [ ] Integrate forms/actions with client management and enrollment APIs.
*   [X] **Admin: Product Management UI**
    *   [X] Implement product list view (`components/products` dir exists, table enhanced).
    *   [ ] Implement product creation/edit forms.
    *   [ ] Integrate forms with product management API.
*   [X] **Admin: Learners Management UI**
    *   [X] Implement learners page route (`/learners`).
    *   [X] Implement learners header component (`LearnersHeader`).
    *   [X] Implement learners list view (table component) with filtering (`LearnersTable`).
    *   [ ] Implement UI for viewing learner details/progress.
    *   [ ] Integrate UI with learner data API.
*   [X] **Admin: Question Bank UI**
    *   [X] Implement question list view (switchable between banks) (`components/question-banks` dir exists).
    *   [ ] Implement question creation/edit forms.
    *   [ ] Implement UI for tagging/categorizing questions.
    *   [ ] Integrate forms with question bank API.
*   [X] **Admin: Module Management UI**
    *   [X] Implement UI within Product detail view to add/edit modules (`components/modules` dir exists).
    *   [ ] Implement form for Course module details (video upload).
    *   [ ] Implement form for Assessment module details (question selection).
    *   [ ] Integrate forms with module management API.
*   [X] **Admin: Progress Monitoring UI**
    *   [X] Implement dashboard/reporting UI for Viewer (aggregated data).
    *   [X] Implement dashboard/reporting UI for Client Staff (scoped data).
    *   [ ] Implement views displaying course % and assessment status/score (`components/dashboard`, `components/analytics` dirs exist).
    *   [ ] **Add "Export to Excel" button to relevant views (Admin, Staff, Client Staff).**
    *   [ ] **Connect button to trigger download from the appropriate API endpoint.**
*   [X] **Admin: Notification UI**
    *   [X] Implement notification display (e.g., dropdown, dedicated page) for Client Staff (`notification-center.tsx` exists).
    *   [ ] Integrate with notification fetching API.
*   [ ] **App: Student Dashboard UI**
    *   [ ] Implement hierarchical Product > Module list.
    *   [ ] Implement progress indicators (status text, percentages, scores).
    *   [ ] Implement expand/collapse functionality.
    *   [ ] Connect UI to dashboard data API.
*   [ ] **App: Course Player UI**
    *   [ ] Implement video player component.
    *   [ ] Implement sequential navigation controls.
    *   [ ] Implement quiz display and interaction UI.
    *   [ ] Connect UI to course structure/content and progress update APIs.
    *   [ ] Implement resume functionality logic.
*   [ ] **App: Assessment UI**
    *   [ ] Implement instruction display.
    *   [ ] Implement timer component.
    *   [ ] Implement question display (MCQ/MSQ).
    *   [ ] Implement answer selection logic.
    *   [ ] Implement submission logic (manual & auto-timeout).
    *   [ ] Implement results display.
    *   [ ] Connect UI to assessment detail and submission APIs.
*   [X] **Mobile Responsiveness**: Ensure all implemented UI components and pages are fully responsive.
*   [X] **Accessibility**: Review components and flows for accessibility (WCAG compliance).

## 6. Integration (Continuous throughout Feature Dev)

*   [ ] **API <> Frontend Connection**: Ensure all frontend actions correctly call corresponding API endpoints.
*   [ ] **Data Flow**: Verify data flows correctly from frontend interactions -> API -> Database -> API responses -> Frontend display.
*   [ ] **Authentication Flow**: Test login, logout, session expiry, and role-based access across frontend and backend. **Specifically test that only enrolled students can log into `/app`. Test that deactivated/unenrolled students cannot log in.**
*   [ ] **State Management**: Ensure client and server state are managed correctly according to guidelines.
*   [X] **Error Handling**: Implement comprehensive error handling for API calls, displaying user-friendly messages and logging details.
*   [X] **Loading States**: Implement appropriate loading indicators for all asynchronous operations.
*   [ ] **End-to-End Feature Testing**: Manually test complete user flows for each feature as it's integrated (e.g., Admin creates product -> Staff assigns -> Student enrolls -> Student completes course/assessment -> Client Staff views progress).

## 7. Testing (Throughout & Dedicated Phase)

*   [ ] **Unit Testing**: Write unit tests for complex utility functions, helper functions, and potentially isolated React components (especially client components with logic).
*   [ ] **Integration Testing - Backend**: Write tests for API routes (mocking DB interactions or using test DB), RLS policies (using pgTAP?), and database functions.
*   [ ] **Integration Testing - Frontend**: Write tests for components that involve multiple sub-components or interaction with hooks/state management.
*   [ ] **End-to-End (E2E) Testing**: Implement E2E tests for critical user flows using Playwright/Cypress:
    *   [ ] Login/Logout (all roles).
    *   [ ] Admin: Create Product + Modules.
    *   [ ] Staff: Assign Product + Enroll Student.
    *   [ ] Student: Complete Course Module.
    *   [ ] Student: Complete Assessment Module.
    *   [ ] Client Staff: View Progress.
*   [ ] **Performance Testing**: Basic checks on page load speeds (Core Web Vitals) and API response times under simulated load (optional but recommended).
*   [ ] **Security Testing**: Review RLS policies, API authorization checks, input validation, and dependency vulnerabilities.
*   [ ] **Cross-Browser/Device Testing**: Manually test critical flows on different browsers and device sizes.

## 8. Documentation (Throughout & Finalization)

*   [ ] **Code Comments**: Add JSDoc comments to functions, components, and types.
*   [ ] **API Documentation**: Generate API documentation (e.g., using OpenAPI/Swagger) or maintain a manual document.
*   [X] **READMEs**: Update project README and add READMEs for complex features/packages if necessary.
*   [ ] **System Architecture**: Update/finalize diagrams illustrating the overall architecture.
*   [ ] **User Guides**: Draft basic user guides for Admin Panel roles and the Student App (if required).
*   [ ] **Review Existing Docs**: Ensure `prd.md`, `tech-stack.md`, `frontend-guidelines.md`, `backend-structure.md`, `app-flow-*.md` are up-to-date with final implementation details.

## 9. Deployment (Preparation & Go-Live)

*   [ ] **Environment Configuration**: Set up distinct Supabase projects (or use branching) for Staging and Production.
*   [ ] **Vercel Configuration**: Configure Staging and Production environments in Vercel with appropriate environment variables (Supabase URLs/keys, JWT secrets).
*   [ ] **CI/CD Pipeline**: Refine Vercel CI/CD pipeline (build steps, tests, deployment triggers).
*   [X] **Database Migrations**: Establish process for applying Supabase migrations to Staging and Production environments.
*   [ ] **Domain Setup**: Configure custom domain (`platform.com`) and path routing (`/admin`, `/app`) via Vercel (or main domain registrar/proxy).
*   [ ] **Monitoring Setup**: Configure Vercel Analytics and logging.
*   [ ] **Final Testing**: Perform thorough testing on Staging environment before Production deployment.
*   [ ] **Production Deployment**: Execute production deployment.

## 10. Maintenance (Post-Launch)

*   [ ] **Bug Tracking**: Set up system for tracking bugs (e.g., GitHub Issues).
*   [ ] **Bug Fixing Process**: Define process for prioritizing and fixing bugs.
*   [ ] **Monitoring**: Regularly monitor application performance, errors (Vercel logs, Supabase logs), and resource usage.
*   [X] **Backup Strategy**: Verify Supabase automated backups are running and test recovery process periodically.
*   [ ] **Dependency Updates**: Plan for regular updates to dependencies (Next.js, Supabase libraries, etc.).
*   [ ] **Feature Enhancements**: Plan process for developing and deploying future enhancements based on feedback and roadmap. 