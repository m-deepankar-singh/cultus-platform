# Backend Foundation - Detailed Implementation Plan

This document provides a detailed step-by-step guide for implementing the Backend Foundation tasks outlined in the main `implementation-plan.md`.

## 1. Database Schema - Core Tables (Managed via Supabase Dashboard)

*Goal: Define the essential database tables required for core functionality, including clients, admin user profiles, students, products, and modules.*

*   [X] **Access Supabase Dashboard:** Log in to your Supabase project dashboard.
*   [X] **Navigate to Table Editor:** Go to the "Table Editor" section.
*   [X] **Create `clients` Table:**
    *   Click "New table".
    *   Name the table `clients`.
    *   Disable "Row Level Security" (RLS) for now (will be enabled later).
    *   Define columns:
        *   `id` (uuid, primary key, default: `gen_random_uuid()`)
        *   `created_at` (timestamp with time zone, default: `now()`)
        *   `updated_at` (timestamp with time zone, default: `now()`). *Useful for tracking updates.*
        *   `name` (text, not null)
        *   `contact_email` (text)
        *   `address` (text)
        *   `logo_url` (text, nullable). *URL for the client's logo.*
        *   `is_active` (boolean, default: `true`). *Indicates if the client is active or inactive.*
        *   _Add other relevant client details as per PRD._
    *   *Note: The count of assigned products should be derived dynamically (e.g., by querying the `client_product_assignments` table later) rather than stored directly here to avoid data inconsistency.*
    *   Click "Save".
*   [X] **Create `profiles` Table (For Admin Panel Users):**
    *   *Note: This table stores data ONLY for Admin Panel users (Admin, Staff, Viewer, Client Staff), linked to `auth.users`.*
    *   Click "New table".
    *   Name the table `profiles`.
    *   Disable RLS for now.
    *   Define columns:
        *   `id` (uuid, primary key, **set as Foreign Key to `auth.users.id`**, ON DELETE CASCADE).
        *   `updated_at` (timestamp with time zone, default: `now()`)
        *   `full_name` (text, not null).
        *   `avatar_url` (text)
        *   `role` (text, not null, default: `'viewer'`). *Possible values: 'admin', 'staff', 'viewer', 'client_staff'.*
        *   `client_id` (uuid, **set as Foreign Key to `clients.id`**, ON DELETE SET NULL). *Links Client Staff to a client.*
        *   `is_active` (boolean, default: `true`). *Indicates if the user account is active.*
    *   Click "Save".
*   [X] **Create `students` Table (For Main App Users):**
    *   *Note: This table stores data ONLY for Student users accessing the Main App, linked to `auth.users`.*
    *   Click "New table".
    *   Name the table `students`.
    *   Disable RLS for now.
    *   Define columns:
        *   `id` (uuid, primary key, **set as Foreign Key to `auth.users.id`**, ON DELETE CASCADE).
        *   `created_at` (timestamp with time zone, default: `now()`)
        *   `updated_at` (timestamp with time zone, default: `now()`)
        *   `client_id` (uuid, not null, **set as Foreign Key to `clients.id`**, ON DELETE CASCADE). *Links student to a client. If client is deleted, student is likely removed too? Adjust ON DELETE if needed.*
        *   `full_name` (text, not null).
        *   `email` (text, nullable). *Note: Duplicates email from auth.users. Keep synchronized or query from auth.users.*
        *   `phone_number` (text, nullable).
        *   `star_rating` (smallint, nullable, check: 0-5). *Feature-specific rating.*
        *   `last_login_at` (timestamp with time zone, nullable). *Track last login time.*
        *   `is_active` (boolean, default: `true`). *Indicates if the student can log in to the Main App.*
        *   *Note: We rely on `is_active` here. The `is_enrolled` concept from the PRD is now implicitly handled by the existence of a record in this table and its `is_active` status.*
    *   Click "Save".
*   [X] **Create `products` Table:**
    *   Click "New table".
    *   Name the table `products`.
    *   Disable RLS for now.
    *   Define columns:
        *   `id` (uuid, primary key, default: `gen_random_uuid()`)
        *   `created_at` (timestamp with time zone, default: `now()`)
        *   `updated_at` (timestamp with time zone, default: `now()`)
        *   `name` (text, not null)
        *   `description` (text)
        *   `created_by` (uuid, **set as Foreign Key to `profiles.id`**, ON DELETE SET NULL). *Links to the Admin profile who created it.*
    *   Click "Save".
*   [X] **Create `modules` Table:**
    *   Click "New table".
    *   Name the table `modules`.
    *   Disable RLS for now.
    *   Define columns:
        *   `id` (uuid, primary key, default: `gen_random_uuid()`)
        *   `created_at` (timestamp with time zone, default: `now()`)
        *   `updated_at` (timestamp with time zone, default: `now()`)
        *   `product_id` (uuid, not null, **set as Foreign Key to `products.id`**, ON DELETE CASCADE). *Links module to a product.*
        *   `type` (text, not null). *Possible values: 'course', 'assessment'. Consider Enum type.*
        *   `name` (text, not null)
        *   `sequence` (integer, default: 0). *For ordering modules within a product, and lessons within a course module.*
        *   `configuration` (jsonb). *Store module-specific settings, e.g., assessment time limit, score per question, video URL, associated quiz ID.*
        *   `created_by` (uuid, **set as Foreign Key to `profiles.id`**, ON DELETE SET NULL). *Links to the Admin profile who created it.*
    *   Click "Save".
*   [X] **(Optional) Create `roles` Table:**
    *   If choosing not to use text/claims for roles:
    *   Create a `roles` table (`id`, `name`, `permissions` JSONB?).
    *   Update `profiles.role` column to be a Foreign Key to `roles.id`.
*   [X] **Apply Indexes:**
    *   Navigate to "Database" -> "Indexes".
    *   Ensure indexes are automatically created on primary keys (`id`).
    *   Ensure foreign key indexes exist for: `profiles.client_id`, `students.client_id`, `products.created_by`, `modules.product_id`, `modules.created_by`.
    *   Ensure custom indexes (`idx_modules_product_id`, `idx_modules_type`) were created.
    *   Consider adding indexes on frequently queried columns like `profiles.role`, `students.client_id` if performance issues arise later.

## 2. Supabase Authentication Setup

*Goal: Configure the authentication provider, integrate the necessary helpers into the Next.js application, and clarify user provisioning and login logic based on PRD and separate `students` table.*

*   [X] **Configure Auth Provider (Supabase Dashboard):**
    *   Navigate to "Authentication" -> "Providers".
    *   Enable the "Email" provider.
    *   Configure settings:
        *   **Enable "Confirm email"**: Recommended for verifying users.
        *   **Enable "Password Reset"**: Required feature (US-001, US-018).
    *   Navigate to "Authentication" -> "URL Configuration".
    *   Set the **Site URL** (e.g., `http://localhost:3000` for local dev, Vercel URL for prod).
    *   Set **Redirect URLs**: Add necessary URLs where users might be redirected after authentication (e.g., `http://localhost:3000/auth/callback`, `http://localhost:3000/admin`, `http://localhost:3000/app`).
    *   Navigate to "Authentication" -> "Email Templates".
    *   Review and customize templates (Invite, Confirmation, Password Reset) as needed.
*   [X] **Clarify User Provisioning Flow (As per PRD & new structure):**
    *   **Admin Panel Users** (Admin, Staff, Viewer, Client Staff) are created via Supabase Auth (e.g., invite) and have a corresponding record created in the `profiles` table with the appropriate `role`.
    *   **Student Users** are created via Supabase Auth (e.g., invite or bulk creation by Admin/Staff) and have a corresponding record created in the `students` table, linking them to a `client_id`. Students **do not** self-register.
*   [X] **Integrate Supabase SSR Helper (`@supabase/ssr`):**
    *   [X] Ensure `@supabase/ssr` and `@supabase/supabase-js` are installed.
    *   [X] **Create Supabase Client Utilities:**
        *   Create `lib/supabase/client.ts`: Contains function to create a client-side Supabase client using `createBrowserClient`.
        *   Create `lib/supabase/server.ts`: Contains function to create a server-side Supabase client (for Server Components, API Routes, Server Actions) using `createServerClient` reading cookies.
        *   Create `lib/supabase/middleware.ts`: Contains function to create a Supabase client within Middleware using `createServerClient` reading/writing cookies.
    *   [X] **Implement Middleware (`middleware.ts`):**
        *   Create/update `middleware.ts` at the root of the project (or inside `src/` if using `src` directory).
        *   Use the middleware client from `lib/supabase/middleware.ts` to manage the user's session by inspecting and refreshing it on requests. Refer to `@supabase/ssr` documentation for the standard middleware implementation.
    *   [X] **Update Root Layout (`app/layout.tsx`):**
        *   Ensure the root layout is dynamic (`export const dynamic = 'force-dynamic'`) or uses methods to handle dynamic rendering if needed due to cookie usage, although `@supabase/ssr` aims to minimize this.
    *   [X] **Utilize Clients:**
        *   In Server Components and API Routes, use the server client from `lib/supabase/server.ts`.
        *   In Client Components, use the client client from `lib/supabase/client.ts`.
*   [X] **Define Student Login Verification Logic (Crucial for `/app` access):**
    *   *Note: Implemented in `app/api/auth/app/login/route.ts`.*
    *   The logic performs a **two-step check** (Ref: US-018):
        1.  Attempt authentication using Supabase Auth client.
        2.  If Supabase auth succeeds, query `public.students` table using the authenticated user's ID.
        3.  Verify a record exists in `students` and `is_active = true`.
        4.  Only grant access to the Main App (`/app`) if both checks succeed.

## 3. Row-Level Security (RLS) - Foundation

*Goal: Implement basic RLS policies on core tables to secure data access, accounting for separate `profiles` and `students` tables.*

*   [X] **3.1 Enable RLS for All Core Tables:**
    *   In Supabase Dashboard -> Authentication -> Policies:
    *   Enable RLS for `profiles` table.
    *   Enable RLS for `clients` table.
    *   Enable RLS for `students` table.
    *   Enable RLS for `products` table.
    *   Enable RLS for `modules` table.
    *   *Note: This enforces default-deny unless specific policies grant access.*
*   [X] **3.2 Implement `profiles` Policies (Admin Panel Users):**
    *   Navigate to Policies for `profiles` table.
    *   **Policy 1: Allow individuals to read their own profile.**
        *   Use Template: "Enable read access for authenticated users".
        *   Check `USING` expression: `auth.uid() = id`.
        *   Save Policy.
    *   **Policy 2: Allow individuals to update their own profile.**
        *   Use Template: "Enable update access for users based on their user ID".
        *   Check `USING` expression: `auth.uid() = id`.
        *   Check `WITH CHECK` expression: `auth.uid() = id`.
        *   Save Policy.
    *   **Policy 3: Allow Admins full access to all profiles.**
        *   Create New Policy: "Allow admin full access to profiles".
        *   Operation: `ALL`.
        *   `USING` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   `WITH CHECK` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   Save Policy.
*   [X] **3.3 Implement `students` Policies (Main App Users):**
    *   Navigate to Policies for `students` table.
    *   **Policy 1: Allow students to read their own record.**
        *   Use Template: "Enable read access for authenticated users".
        *   Policy Name: `Allow student read access to own record`.
        *   Check `USING` expression: `auth.uid() = id`.
        *   Save Policy.
    *   **Policy 2: Allow students to update specific fields (e.g., full_name).**
        *   Use Template: "Enable update access for users based on their user ID".
        *   Policy Name: `Allow student update access to own name`.
        *   Check `USING` expression: `auth.uid() = id`.
        *   Check `WITH CHECK` expression: `auth.uid() = id`.
        *   *(Optional: Add specific columns later if needed)*.
        *   Save Policy.
    *   **Policy 3: Allow Admins full access to all student records.**
        *   Create New Policy: "Allow admin full access to students".
        *   Operation: `ALL`.
        *   `USING` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   `WITH CHECK` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   Save Policy.
    *   **Policy 4: Allow Client Staff read access to students of their client.**
        *   Create New Policy: "Allow client staff read access to own client students".
        *   Operation: `SELECT`.
        *   `USING` expression: `client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid() AND role = 'client_staff')`.
        *   Save Policy.
*   [X] **3.4 Implement `clients` Policies:**
    *   Navigate to Policies for `clients` table.
    *   **Policy 1: Allow Admins full access to all clients.**
        *   Create New Policy: "Allow admin full access to clients".
        *   Operation: `ALL`.
        *   `USING` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   `WITH CHECK` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   Save Policy.
    *   **Policy 2: Allow Staff/Client Staff read access to clients.** *(Adjust as needed)*
        *   Create New Policy: "Allow staff/client_staff read access to clients".
        *   Operation: `SELECT`.
        *   `USING` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'staff', 'client_staff')`.
        *   Save Policy.
*   [X] **3.5 Implement `products` Policies:**
    *   Navigate to Policies for `products` table.
    *   **Policy 1: Allow Admins full access to all products.**
        *   Create New Policy: "Allow admin full access to products".
        *   Operation: `ALL`.
        *   `USING` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   `WITH CHECK` expression: `(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'`.
        *   Save Policy.
    *   *(Note: Read access for students/staff will depend on assignments - implement later)*
*   [X] **3.6 Implement `modules` Policies:**
    *   Navigate to Policies for `modules`

## 5. Seed Initial Data (Optional - Managed via Supabase Dashboard)

*Goal: Populate the database with essential starting data, like the first Admin user and test clients/students.*

*   [X] **5.1 Create Initial Admin User Account:**
    *   Use the Supabase Dashboard: Authentication -> Users -> Invite user.
    *   Invite a user with an email address that will be the main administrator.
    *   Handle the invitation/confirmation flow.
*   [X] **5.2 Create Admin Profile Record:**
    *   In Supabase Dashboard -> Table Editor -> `profiles` table:
    *   Click "Insert row".
    *   Set the `id` to the User ID of the admin user created in step 5.1 (copy from Authentication -> Users page).
    *   Set the `role` to `admin`.
    *   Fill in `full_name` (mandatory).
    *   Click "Save".
*   [X] **5.3 (Optional) Populate `roles` Table:**
    *   In Supabase Dashboard -> Table Editor -> `roles` table:
    *   If not already populated, insert rows for 'admin', 'staff', 'viewer', 'client_staff', 'student'.
*   [X] **5.4 (Optional) Create Test Client(s):**
    *   In Supabase Dashboard -> Table Editor -> `clients` table:
    *   Click "Insert row" and add one or two dummy client records (e.g., 'Test University').
*   [X] **5.5 (Optional) Create Test Student User(s):**
    *   Use Supabase Dashboard: Authentication -> Users -> Invite user (for a test student email).
    *   Handle invitation/confirmation.
    *   In Supabase Dashboard -> Table Editor -> `students` table:
    *   Click "Insert row".
    *   Set `id` to the User ID of the test student.
    *   Set `client_id` to the ID of a test client created in step 5.4.
    *   Set `is_active` to `true`.
    *   Fill in `full_name` (mandatory).
    *   Click "Save".

This completes the detailed steps for the Backend Foundation phase. Remember to commit changes frequently and test RLS policies thoroughly.