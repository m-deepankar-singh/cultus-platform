# Detailed Implementation Plan: Learner Management API

This document provides a step-by-step guide for implementing the **Learner Management API** endpoints for reading student data, scoped for Admin and Staff roles.

**Target Roles:** Admin, Staff
**Base Routes:** `/api/admin/learners`, `/api/staff/learners`

**Prerequisites:**

*   Supabase project set up.
*   `profiles` table exists (linking `auth.users`, with `role`, `client_id`, `is_active`, `email`, `full_name`).
*   `clients` table exists.
*   `course_progress` and `assessment_progress` tables exist (or similar for tracking progress).
*   Supabase RLS policies configured for `profiles`, `clients`, and progress tables (Admins: all access; Staff: scoped access based on client(s); Students: self-access).
*   Next.js project with App Router, TypeScript, Zod, Supabase SSR helper installed.
*   Utility functions for Supabase server clients and getting user session/profile/role exist.
*   Zod schema for `StudentIdSchema` (or `UserIdSchema`) exists.

**Assumption for Staff Access:** Staff users have a single `client_id` in their profile, or a mechanism exists to determine which clients they manage.

**Design Notes:**

*   This API is primarily read-only.
*   Learners are identified as users with the 'Student' role in the `profiles` table.
*   Fetching details includes a summary of their progress.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/learner.ts` (Create if needed, or add to existing e.g., `user.ts`)

*   [x] **Create File/Imports:** Create `lib/schemas/learner.ts` and import `zod`.
*   [x] **Define `LearnerListQuerySchema`:**
    ```typescript
    import { z } from 'zod';

    export const LearnerListQuerySchema = z.object({
      search: z.string().optional(), // Search by name or email
      clientId: z.string().uuid().optional(), // For Admin filtering
      isActive: z.enum(['true', 'false']).optional(), // Filter by enrollment status
      // Add other potential filters like productId?
    });
    ```
*   [x] **Reuse `StudentIdSchema`:** Ensure the schema for validating student UUIDs (`StudentIdSchema` or `UserIdSchema`) is available and exported from its location (e.g., `lib/schemas/user.ts`).
*   [x] **Export Schemas.**

---

## 2. Admin Routes (`/api/admin/learners`)

### 2.1 Implement `GET /api/admin/learners` (List Learners - Admin)

*   **File:** `app/api/admin/learners/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `LearnerListQuerySchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'. Return 401/403 if invalid.
*   [x] **Parse & Validate Query Parameters:**
    *   [x] Get search params: `const { searchParams } = new URL(request.url);`
    *   [x] Convert to object: `const queryParams = Object.fromEntries(searchParams.entries());`
    *   [x] Validate: `const validationResult = LearnerListQuerySchema.safeParse(queryParams);`
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const { search, clientId, isActive } = validationResult.data;`
*   [x] **Build Supabase Query:**
    *   [x] Start query: `let query = supabase.from('profiles').select('*, client:clients(id, name)'); // Select profile and basic client info`.
    *   [x] Filter by role: `query = query.eq('role', 'Student');`
    *   [x] Apply search filter (on `full_name` and `email`): `if (search) { query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`); }`.
    *   [x] Apply client filter: `if (clientId) { query = query.eq('client_id', clientId); }`.
    *   [x] Apply active filter: `if (isActive !== undefined) { query = query.eq('is_active', isActive === 'true'); }`. // Corrected logic check
    *   [x] Add ordering: `query = query.order('full_name', { ascending: true });`.
*   [x] **Execute Query & Handle Response:** Fetch data, handle DB errors, return learner list.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 2.2 Implement `GET /api/admin/learners/[studentId]` (Get Learner Details - Admin)

*   **File:** `app/api/admin/learners/[studentId]/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `StudentIdSchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { studentId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Validate Route Parameter (`studentId`):** Validate `params.studentId` using `UserIdSchema`.
*   [x] **Fetch Learner Profile:**
    *   [x] Create Supabase client.
    *   [x] Query profile: `const { data: profile, error: profileError } = await supabase.from('profiles').select('*, client:clients(id, name)').eq('id', studentId).eq('role', 'Student').single();`.
    *   [x] Handle profile fetch errors (DB error or learner not found/not a student - 404).
*   [x] **Fetch Progress Summary (High-Level):**
    *   [x] Query `course_progress` table (`student_course_progress`) for the `studentId`, potentially aggregating completion status/percentages.
    *   [ ] Query `assessment_progress` table for the `studentId`, fetching latest scores/attempts. (*Skipped - table missing*)
    *   [ ] **Note:** The exact structure of the progress summary needs definition. This might involve complex queries or separate helper functions.
    *   `// const progressSummary = await fetchLearnerProgressSummary(supabase, studentId); // Placeholder`
*   [x] **Combine and Return Response:**
    *   [x] Combine `profile` data with `progressSummary`.
    *   [x] Return combined data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Staff Routes (`/api/staff/learners`)

### 3.1 Implement `GET /api/staff/learners` (List Learners - Staff)

*   **File:** `app/api/staff/learners/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `LearnerListQuerySchema`. // Corrected: getUserSessionAndRole instead of Profile
*   [x] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role (Staff, Admin allowed). Get profile data.
*   [x] **Determine Client Scope:**
    *   [x] **If Admin:** Can potentially reuse Admin logic or fetch all accessible clients. (*Handled in implementation*)
    *   [x] **If Staff:** Get `staffClientId = profile.client_id;`. If null, return 403 or empty list.
*   [x] **Parse & Validate Query Parameters:** Validate query params using `LearnerListQuerySchema`.
*   [x] **Build Supabase Query:**
    *   [x] Start query: `let query = supabase.from('profiles').select('*, client:clients(id, name)');`
    *   [x] Filter by role: `query = query.eq('role', 'Student');`
    *   [x] **Apply Scoping:** `if (role === 'Staff') { query = query.eq('client_id', staffClientId); } else if (role === 'Admin' && validatedClientId) { ... }`. // Corrected logic summary
    *   [x] Apply search filter (as in Admin GET).
    *   [x] Apply active filter (as in Admin GET).
    *   [x] Add ordering.
*   [x] **Execute Query & Handle Response:** Fetch data, handle DB errors, return learner list.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 3.2 Implement `GET /api/staff/learners/[studentId]` (Get Learner Details - Staff)

*   **File:** `app/api/staff/learners/[studentId]/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `StudentIdSchema`. // Corrected: getUserSessionAndRole
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { studentId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify session and role (Staff, Admin). Get profile.
*   [x] **Validate Route Parameter (`studentId`):** Validate `params.studentId`.
*   [x] **Fetch Learner Profile & Verify Access:**
    *   [x] Create Supabase client.
    *   [x] Query profile: `const { data: profile, error: profileError } = await supabase.from('profiles').select('*, client:clients(id, name)').eq('id', studentId).eq('role', 'Student').single();`.
    *   [x] Handle profile fetch errors (DB error or not found - 404).
    *   [x] **If role is Staff:** Check if `profile.client_id` matches `sessionProfile.client_id`. If not, return 403 Forbidden. // Corrected variable name
*   [x] **Fetch Progress Summary:** Fetch progress summary for `studentId` (as in Admin GET details, *skipping assessment progress*).
*   [x] **Combine and Return Response:** Combine profile and progress, return 200.
*   [x] **Add Error Handling:** Wrap in `try...catch`.