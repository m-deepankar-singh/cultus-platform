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

*   [ ] **Create File/Imports:** Create `lib/schemas/learner.ts` and import `zod`.
*   [ ] **Define `LearnerListQuerySchema`:**
    ```typescript
    import { z } from 'zod';

    export const LearnerListQuerySchema = z.object({
      search: z.string().optional(), // Search by name or email
      clientId: z.string().uuid().optional(), // For Admin filtering
      isActive: z.enum(['true', 'false']).optional(), // Filter by enrollment status
      // Add other potential filters like productId?
    });
    ```
*   [ ] **Reuse `StudentIdSchema`:** Ensure the schema for validating student UUIDs (`StudentIdSchema` or `UserIdSchema`) is available and exported from its location (e.g., `lib/schemas/user.ts`).
*   [ ] **Export Schemas.**

---

## 2. Admin Routes (`/api/admin/learners`)

### 2.1 Implement `GET /api/admin/learners` (List Learners - Admin)

*   **File:** `app/api/admin/learners/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `LearnerListQuerySchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'. Return 401/403 if invalid.
*   [ ] **Parse & Validate Query Parameters:**
    *   [ ] Get search params: `const { searchParams } = new URL(request.url);`
    *   [ ] Convert to object: `const queryParams = Object.fromEntries(searchParams.entries());`
    *   [ ] Validate: `const validationResult = LearnerListQuerySchema.safeParse(queryParams);`
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data: `const { search, clientId, isActive } = validationResult.data;`
*   [ ] **Build Supabase Query:**
    *   [ ] Start query: `let query = supabase.from('profiles').select('*, client:clients(id, name)'); // Select profile and basic client info`.
    *   [ ] Filter by role: `query = query.eq('role', 'Student');`
    *   [ ] Apply search filter (on `full_name` and `email`): `if (search) { query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`); }`.
    *   [ ] Apply client filter: `if (clientId) { query = query.eq('client_id', clientId); }`.
    *   [ ] Apply active filter: `if (isActive) { query = query.eq('is_active', isActive === 'true'); }`.
    *   [ ] Add ordering: `query = query.order('full_name', { ascending: true });`.
*   [ ] **Execute Query & Handle Response:** Fetch data, handle DB errors, return learner list.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 2.2 Implement `GET /api/admin/learners/[studentId]` (Get Learner Details - Admin)

*   **File:** `app/api/admin/learners/[studentId]/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `StudentIdSchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { studentId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter (`studentId`):** Validate `params.studentId` using `StudentIdSchema`.
*   [ ] **Fetch Learner Profile:**
    *   [ ] Create Supabase client.
    *   [ ] Query profile: `const { data: profile, error: profileError } = await supabase.from('profiles').select('*, client:clients(id, name)').eq('id', studentId).eq('role', 'Student').single();`.
    *   [ ] Handle profile fetch errors (DB error or learner not found/not a student - 404).
*   [ ] **Fetch Progress Summary (High-Level):**
    *   [ ] Query `course_progress` table for the `studentId`, potentially aggregating completion status/percentages.
    *   [ ] Query `assessment_progress` table for the `studentId`, fetching latest scores/attempts.
    *   [ ] **Note:** The exact structure of the progress summary needs definition. This might involve complex queries or separate helper functions.
    *   `const progressSummary = await fetchLearnerProgressSummary(supabase, studentId); // Placeholder`
*   [ ] **Combine and Return Response:**
    *   [ ] Combine `profile` data with `progressSummary`.
    *   [ ] Return combined data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Staff Routes (`/api/staff/learners`)

### 3.1 Implement `GET /api/staff/learners` (List Learners - Staff)

*   **File:** `app/api/staff/learners/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `LearnerListQuerySchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role (Staff, Admin allowed). Get profile data.
*   [ ] **Determine Client Scope:**
    *   [ ] **If Admin:** Can potentially reuse Admin logic or fetch all accessible clients.
    *   [ ] **If Staff:** Get `staffClientId = profile.client_id;`. If null, return 403 or empty list.
*   [ ] **Parse & Validate Query Parameters:** Validate query params using `LearnerListQuerySchema`.
*   [ ] **Build Supabase Query:**
    *   [ ] Start query: `let query = supabase.from('profiles').select('*, client:clients(id, name)');`
    *   [ ] Filter by role: `query = query.eq('role', 'Student');`
    *   [ ] **Apply Scoping:** `if (role === 'Staff') { query = query.eq('client_id', staffClientId); }`.
    *   [ ] Apply search filter (as in Admin GET).
    *   [ ] Apply active filter (as in Admin GET).
    *   [ ] Add ordering.
*   [ ] **Execute Query & Handle Response:** Fetch data, handle DB errors, return learner list.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.2 Implement `GET /api/staff/learners/[studentId]` (Get Learner Details - Staff)

*   **File:** `app/api/staff/learners/[studentId]/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `StudentIdSchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { studentId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify session and role (Staff, Admin). Get profile.
*   [ ] **Validate Route Parameter (`studentId`):** Validate `params.studentId`.
*   [ ] **Fetch Learner Profile & Verify Access:**
    *   [ ] Create Supabase client.
    *   [ ] Query profile: `const { data: profile, error: profileError } = await supabase.from('profiles').select('*, client:clients(id, name)').eq('id', studentId).eq('role', 'Student').single();`.
    *   [ ] Handle profile fetch errors (DB error or not found - 404).
    *   [ ] **If role is Staff:** Check if `profile.client_id` matches `staffProfile.client_id`. If not, return 403 Forbidden.
*   [ ] **Fetch Progress Summary:** Fetch progress summary for `studentId` (as in Admin GET details).
*   [ ] **Combine and Return Response:** Combine profile and progress, return 200.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Refinement and Testing

*   [ ] **Review Code:** Ensure consistency, error handling, access control.
*   [ ] **Progress Summary Logic:** Define and implement the `fetchLearnerProgressSummary` logic (or integrate queries directly). This might involve fetching counts, percentages, last activity, etc.
*   [ ] **Test Admin Access:** Verify Admins can list all learners, filter by client, and view details for any learner.
*   [ ] **Test Staff Access:**
    *   Verify Staff can only list learners belonging to their assigned client.
    *   Verify Staff can only view details for learners within their client.
    *   Test 403 scenarios for Staff accessing other clients' learners.
*   [ ] **Test Filtering:** Test search, client (for Admin), and isActive filters thoroughly.
*   [ ] **Test Edge Cases:** Learners with no progress, learners not found, inactive learners.
*   [ ] **Check Supabase RLS:** Ensure API behavior aligns with RLS, especially regarding progress tables if Staff access them directly.
*   [ ] **Check Supabase Logs.** 