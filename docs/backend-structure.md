# Backend Structure & Guidelines

## 1. Overview

This document outlines the backend architecture, structure, and development guidelines for the Upskilling Platform. The backend leverages a combination of Next.js API Routes hosted on Vercel and Supabase services (Database, Auth, Storage).

These guidelines are based on the project's PRD, the `optimized-nextjs-typescript-best-practices-modern-ui-ux` rule (for the API layer), and relevant Supabase rules (`supabase/code-format-sql`, `supabase/database-create-migration`, `supabase/database-functions`, `supabase/database-rls-policies`, `supabase/nextjs-supabase-auth`).

## 2. Architecture

*   **API Layer**: Next.js API Routes (`app/api/...`)
    *   Handles HTTP requests from the frontend (Admin Panel & Main App).
    *   Contains business logic, request validation, and orchestration.
    *   Interacts with Supabase services for data persistence, authentication, and storage.
    *   Runs as serverless functions on Vercel.
*   **Authentication**: Supabase Auth
    *   Manages user identities, sessions, JWTs, and password functionalities.
    *   Integrates tightly with Supabase Database (RLS) and Next.js (middleware, route handlers).
*   **Database**: Supabase Database (PostgreSQL)
    *   Primary data store for all application data (users, clients, products, modules, questions, progress, etc.).
    *   Utilizes Row-Level Security (RLS) extensively for data isolation and access control.
    *   May use database functions (PL/pgSQL) for complex queries, triggers, or security-critical operations.
*   **Storage**: Supabase Storage
    *   Stores user-uploaded files, specifically MP4 course videos.
    *   Access control managed via Supabase Storage policies.

## 3. Next.js API Layer (`app/api/...`)

### 3.1. Structure & Organization

*   **Routing**: Utilize Next.js App Router conventions for API routes within the `app/api/` directory.
*   **Grouping**: Group related endpoints logically using directory structures (e.g., `app/api/admin/users`, `app/api/app/assessments`).
*   **File Naming**: Use `route.ts` for route handlers.
*   **Modularity**: Break down complex logic into reusable service functions or utilities within a `lib/` or `server/` directory structure.

### 3.2. Coding Standards & Best Practices

*   **Language**: TypeScript.
*   **Style**: Adhere to functional programming principles. Use async/await for asynchronous operations. Follow project linting (ESLint) and formatting (Prettier) rules.
*   **Conciseness**: Write clear, concise, and maintainable code.
*   **Environment Variables**: Use environment variables (`.env.local`, Vercel environment variables) for sensitive information (Supabase keys, JWT secrets).
*   **No Sensitive Data Exposure**: Ensure API responses do not expose sensitive user or system data unnecessarily.

### 3.3. Authentication & Authorization

*   **Integration**: Use Supabase client libraries (e.g., `@supabase/ssr` for server-side operations in Next.js) to interact with Supabase Auth.
*   **Session Management**: Verify user sessions/JWTs in API routes or middleware to protect endpoints.
*   **Role-Based Access Control (RBAC)**: Check user roles (obtained from Supabase Auth custom claims or a dedicated roles table) to authorize actions. Implement logic matching the roles defined in the PRD (Admin, Staff, Viewer, Client Staff, Student).
*   **Middleware**: Consider Next.js middleware (`middleware.ts`) for centralized authentication checks on specific API paths.

### 3.4. Input Validation

*   **Library**: Use Zod for defining schemas and validating incoming request bodies, query parameters, and route parameters.
*   **Validation Placement**: Perform validation early within the API route handler.
*   **Error Response**: Return clear 4xx error responses (e.g., 400 Bad Request) with specific validation error details upon failure.

### 3.5. Error Handling

*   **Consistency**: Implement consistent error handling patterns.
*   **Error Types**: Use custom error classes or standardized error objects for predictable error responses.
*   **Logging**: Implement logging (e.g., using Vercel logs or a dedicated logging service) to capture errors and important events.
*   **HTTP Status Codes**: Return appropriate HTTP status codes (4xx for client errors, 5xx for server errors).
*   **User Feedback**: Provide generic error messages in responses to avoid leaking implementation details, while logging specifics.

### 3.6. Interaction with Supabase

*   **Client Libraries**: Use the official Supabase JavaScript libraries (`@supabase/supabase-js`, `@supabase/ssr`) for interacting with the database and storage.
*   **Server-Side Client**: Instantiate Supabase clients securely on the server-side, using service keys only where absolutely necessary and primarily relying on user context for RLS.
*   **Data Fetching**: Abstract database queries into dedicated functions/services where appropriate.

## 4. Supabase Database (PostgreSQL)

### 4.1. Schema Design

*   **Modularity**: Design tables to reflect the core entities (Users, Clients, Products, Modules, Questions, Answers, Progress, Roles, etc.).
*   **Relationships**: Define clear relationships using foreign keys with appropriate constraints (ON DELETE actions).
*   **Client Isolation**: Ensure the schema supports robust client data isolation, typically using a `client_id` column in relevant tables, enforced by RLS.
*   **Indexing**: Apply indexes strategically to optimize query performance, especially on columns used in WHERE clauses, JOINs, and ORDER BY operations (e.g., user IDs, client IDs, product IDs, timestamps).
*   **Naming Conventions**: Follow consistent naming conventions (e.g., `snake_case` for tables and columns) as per `supabase/code-format-sql` guidelines.
*   **Data Types**: Use appropriate PostgreSQL data types.
*   **Question Banks**: Design schemas for `course_question_bank` and `assessment_question_bank` allowing efficient querying and reuse of questions across modules. Consider JSON/JSONB for flexible question structures if needed, but relational linking is generally preferred.
*   **Progress Tracking**: Design tables for tracking course progress (e.g., percentage completion, last viewed item) and assessment progress (e.g., completion status, score, potentially submitted answers if required later).

### 4.2. Migrations

*   **Tooling**: Use the Supabase CLI for managing database migrations (`supabase/database-create-migration` guidelines).
*   **Workflow**: Develop schema changes locally, generate migration files using the CLI, apply them locally, and then deploy them to staging/production environments.
*   **Idempotency**: Ensure migration scripts are idempotent where possible.
*   **Version Control**: Commit migration files to the Git repository.

### 4.3. SQL Formatting & Style

*   **Guidelines**: Adhere to the SQL formatting and style guidelines outlined in the `supabase/code-format-sql` rule.
*   **Readability**: Write clear, well-formatted SQL within migration files and database functions.

### 4.4. Row-Level Security (RLS)

*   **Enable RLS**: Enable RLS on all tables containing user or client-specific data (`supabase/database-rls-policies` guidelines).
*   **Default Deny**: Start with a default-deny policy.
*   **Policy Granularity**: Create specific policies for different roles (Admin, Staff, Viewer, Client Staff, Student) and operations (SELECT, INSERT, UPDATE, DELETE).
*   **`USING` vs. `WITH CHECK`**: Use `USING` clauses for read access (SELECT) and `WITH CHECK` clauses for write access (INSERT, UPDATE).
*   **User Context**: Policies should primarily rely on user context functions like `auth.uid()` and `auth.jwt() ->> 'user_role'` (assuming role is stored in JWT claims) or helper functions that query user roles.
*   **Client Isolation**: Ensure RLS policies rigorously enforce client data boundaries (e.g., `client_id = (SELECT client_id FROM user_profiles WHERE user_id = auth.uid())`).
*   **Testing**: Thoroughly test RLS policies to ensure they function correctly and prevent unauthorized access.

### 4.5. Database Functions (PL/pgSQL)

*   **Purpose**: Use database functions (`supabase/database-functions` guidelines) for:
    *   Complex queries or business logic best performed close to the data.
    *   Triggers (e.g., updating timestamps, calculating progress).
    *   Security-critical operations (`SECURITY DEFINER` functions - use with extreme caution).
    *   Helper functions for RLS policies.
*   **Excel Export API (`/api/[role]/progress/export`)**
    *   **Requirement**: Implement API endpoint(s) accessible by Admin, Staff, Client Staff roles to trigger an export of learner progress data.
    *   **Logic**: Endpoint fetches relevant progress data (filtered by client based on role/request), formats it.
    *   **Library**: Utilize a library (e.g., `exceljs` or similar) to generate an Excel (.xlsx) file stream.
    *   **Response**: Set appropriate headers (`Content-Disposition: attachment; filename="progress-export.xlsx"`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) to trigger browser download.
*   **Security Context**: Be mindful of `SECURITY INVOKER` (default) vs. `SECURITY DEFINER`.
*   **Testing**: Test database functions thoroughly.

### 4.6. Authentication Integration

*   **User Profiles**: Maintain a `profiles` or `users` table linked to `auth.users` via the user ID. **This table must indicate if a user is an enrolled student and their associated client.**
*   **Custom Claims**: Consider storing user roles or client affiliations as custom claims within the Supabase Auth JWT for efficient access in RLS policies and API logic (`supabase/nextjs-supabase-auth` patterns).
*   **User Management**: Implement API endpoints for Admin/Staff user management actions (inviting, **updating roles [primarily by Admin]**, deactivating) that interact with Supabase Auth and the profiles table. **Enrollment actions must correctly update the student status in the `profiles` table.**
*   **Login Verification**: The backend logic handling student login (`/app`) must perform an additional check after successful Supabase authentication: Query the `profiles` table to verify the authenticated user ID exists, is marked as a student, is active, and associated with a client. Deny access if this check fails.

## 5. Supabase Storage

*   **Buckets**: Create dedicated buckets (e.g., `course-videos`).
*   **Policies**: Implement Storage access policies to control who can upload (likely Admins) and read (likely authenticated Students assigned to the corresponding course) video files.
*   **File Handling**: Implement logic in the API layer (or potentially edge functions if needed later) to handle video uploads from Admins and associate file URLs with course modules.

## 6. Testing

*   **API Routes**: Write integration tests for API routes, mocking Supabase client interactions or connecting to a local/test Supabase instance.
*   **Database**: Test RLS policies and database functions using pgTAP or similar PostgreSQL testing frameworks.
*   **End-to-End**: E2E tests should cover flows involving backend interactions.

## 7. Security

*   **RLS**: RLS is the primary mechanism for data security and isolation. Implement and test rigorously.
*   **Input Validation**: Validate all input received from the client.
*   **Authentication/Authorization**: Secure all relevant API endpoints and ensure correct role checks.
*   **Secrets Management**: Securely manage Supabase API keys and JWT secrets.
*   **Dependency Management**: Keep dependencies up-to-date.
*   **SQL Injection**: Use Supabase client libraries correctly to prevent SQL injection vulnerabilities (they typically use parameterized queries).

By adhering to these guidelines, the backend development will align with the project requirements and maintain high standards of quality, security, and maintainability. 