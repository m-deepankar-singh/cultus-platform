# Admin Panel Application Flow (`platform.com/admin`)

## 1. Overview

This document describes the user flows and interactions within the Admin Panel of the Upskilling Platform, accessible at `platform.com/admin`. It details the experiences for the different administrative roles: Platform Administrator, Platform Staff, Platform Viewer, and Client Staff, based on the PRD and established technical guidelines.

## 2. Authentication & Entry

1.  **Access**: Users navigate to `platform.com/admin`.
2.  **Login Form**: A login form is presented (rendered ideally via RSC, form handling via Client Component).
3.  **Credentials**: User enters email and password.
4.  **Submission**: On submit, the client-side code calls Supabase Auth (`signInWithPassword`).
5.  **Verification**: Supabase Auth verifies credentials.
6.  **Session Creation**: On success, Supabase Auth establishes a session (JWT stored securely, likely in cookies handled by `@supabase/ssr`).
7.  **Redirection**: User is redirected to their role-specific dashboard within the Admin Panel.
8.  **Error Handling**: If authentication fails, a user-friendly error message is displayed on the login form.
9.  **Password Reset**: A link/mechanism exists to trigger the Supabase Auth password recovery flow.

## 3. Core Flows by Role

Authentication state and user roles (potentially from JWT claims or fetched profile) determine the available UI elements and API permissions enforced via RLS and backend checks.

### 3.1. Platform Administrator (Admin)

*   **Full Access**: Has CRUD permissions on most resources via the UI and corresponding API endpoints (`/api/admin/...`).
*   **User Management** (US-002, US-003, US-004):
    *   Navigates to the User Management section.
    *   Views lists of Staff, Viewers, and Client Staff (data fetched via API, respecting RLS - Admin sees all).
    *   Uses forms (Client Components validating with Zod) to create new users, selecting a role.
    *   If creating Client Staff, associates them with a specific Client (dropdown populated with Client data).
    *   API calls (`POST /api/admin/users`) interact with Supabase Auth (`admin.createUser`) and the `profiles` table.
    *   Edits user details (triggering `PUT /api/admin/users/:id`).
    *   Deactivates/reactivates users (triggering `PATCH /api/admin/users/:id/status` or similar).
    *   **Includes Export Button:** Progress views show an "Export to Excel" button.
        *   Clicking triggers a `GET` request to the appropriate export API endpoint (e.g., `/api/admin/progress/export`).
        *   Browser handles the file download based on response headers.
*   **Client Management** (US-005):
    *   Navigates to Client Management.
    *   Views a list of all clients (data fetched via API, `GET /api/admin/clients`).
    *   Uses forms to create/edit client details (`POST`, `PUT /api/admin/clients`).
*   **Product Management** (US-006):
    *   Navigates to Product Management.
    *   Views list of all products.
    *   Uses forms to create/edit Products (`POST`, `PUT /api/admin/products`).
*   **Question Bank Management** (US-007):
    *   Navigates to Question Banks section.
    *   Switches between Course Quiz and Assessment banks.
    *   Views questions (data fetched via API, `GET /api/admin/question-banks/{type}/questions`).
    *   Uses forms to create/edit/delete MCQ/MSQ questions (`POST`, `PUT`, `DELETE` on `/api/admin/question-banks/...`).
*   **Module Management** (US-008, US-009):
    *   Within a Product's detail view, adds Modules (Course or Assessment).
    *   **Course Module**: Defines sequence, uploads MP4 videos (client interacts with `/api/admin/storage/upload` which uses Supabase Storage), selects quizzes from the Course Bank (UI fetches questions, selection sent to `POST /api/admin/products/:pid/modules`).
    *   **Assessment Module**: Selects questions from Assessment Bank, sets time limit/scoring (config sent to `POST /api/admin/products/:pid/modules`).
    *   Updates are immediate; API calls (`PUT /api/admin/modules/:mid`) update module configuration directly.
*   **Product Assignment** (US-011 - Admin can also do this):
    *   Similar flow to Staff (see below).
*   **Student Management** (US-012 - Admin can also do this):
    *   Similar flow to Staff (see below), but can manage students for *any* client.

### 3.2. Platform Staff (Staff)

*   **Scoped Access**: Permissions generally restricted to managing assigned clients and their students/product assignments.
*   **Client Management** (US-010):
    *   Navigates to Client Management.
    *   Views list of clients (API/RLS may restrict this view based on assignment, or UI filters). Can likely view all but only edit assigned ones.
    *   Edits details of *assigned* clients (`PUT /api/staff/clients/:id` - note potential separate API namespace or logic check based on role).
*   **Product Assignment** (US-011):
    *   Navigates to a specific Client's detail page.
    *   Views available Products (fetched via `GET /api/staff/products` - assuming Staff sees all available Products to assign).
    *   Assigns/unassigns Products to the Client (UI sends requests like `POST /api/staff/clients/:cid/products`, `DELETE /api/staff/clients/:cid/products/:pid`). Backend updates the association table.
*   **Student Management** (US-012):
    *   Navigates to a specific Client's student management section.
    *   Views students *only* for that client (enforced by API/RLS, `GET /api/staff/clients/:cid/students`).
    *   Uses forms to manually add students (`POST /api/staff/clients/:cid/students`, backend creates `auth.users` entry and profile, associating with the client).
    *   Uses bulk import feature (UI parses CSV, sends data to `POST /api/staff/clients/:cid/students/bulk`, backend processes in batches).
    *   Removes/deactivates students for that client (`DELETE /api/staff/clients/:cid/students/:sid`).
*   **Progress Monitoring**: Can view progress data, but restricted to their assigned clients (API/RLS enforces this).
    *   **Includes Export Button:** Progress views show an "Export to Excel" button.
        *   Clicking triggers `GET /api/staff/progress/export?clientId={clientId}` (or similar, filtering handled based on Staff role).
        *   Browser handles download.

### 3.3. Platform Viewer (Viewer)

*   **Read-Only Access**: Cannot perform any create, update, or delete operations.
*   **Aggregated Progress** (US-017):
    *   Logs in and sees a dashboard displaying aggregated, anonymized progress data across all clients.
    *   Data is fetched via specific API endpoints (e.g., `GET /api/viewer/reports/aggregated`) that perform aggregation queries, respecting RLS (Viewer role might have SELECT access on relevant tables but only via these specific aggregation functions/views).
    *   Cannot drill down into individual client or student data.
    *   **No Export Functionality for Viewer role.**
    *   Views progress (% completion for courses, status/score for assessments) for students of their institution only.

### 3.4. Client Staff

*   **Highly Restricted Access**: Read-only, and strictly limited to data for their *own* affiliated university/client.
*   **Progress Monitoring** (US-014):
    *   Logs in and sees a dashboard/reporting section.
    *   UI fetches progress data via API endpoints (e.g., `GET /api/client-staff/progress`).
    *   Backend API and RLS policies *strictly* filter data based on the logged-in Client Staff's associated `client_id`.
    *   Views progress (% completion for courses, status/score for assessments) for students of their institution only.
*   **Notifications** (US-015):
    *   Receives notifications (in-app or email) triggered by backend processes when an Admin updates a Product/Module assigned to their client.
    *   May have an in-app notification center (UI polls/subscribes via `GET /api/client-staff/notifications`).
    *   **Includes Export Button:** Progress views show an "Export to Excel" button.
        *   Clicking triggers `GET /api/client-staff/progress/export` (backend filters by logged-in user's client).
        *   Browser handles download.

## 4. General UI/UX Notes (Admin Panel)

*   **Responsiveness**: All views must be functional and usable on mobile devices.
*   **Data Display**: Use tables (with sorting/filtering) for lists (users, clients, products).
*   **Forms**: Implement clear, intuitive forms for data entry/editing, using components from Shadcn UI/Radix UI.
*   **Feedback**: Provide clear loading states (spinners, skeletons) and feedback messages (toasts for success/error) for all asynchronous operations.
*   **Navigation**: Consistent and clear navigation (sidebar/header) to access different management sections based on user role.

## 5. Existing UI Components (Note)

Based on the current file structure, foundational UI elements like the dashboard layout (`app/(dashboard)/layout.tsx`), sidebar (`dashboard-sidebar.tsx`), header (`dashboard-header.tsx`), theme provider, and notification center (`notification-center.tsx`) appear to be already implemented or in progress. Feature-specific component directories (`users`, `clients`, `products`, etc.) also exist, indicating the component structure is established. 