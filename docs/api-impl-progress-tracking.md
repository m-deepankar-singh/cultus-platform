# Detailed Implementation Plan: Progress Tracking API

This document provides a step-by-step guide for implementing the **Progress Tracking API** endpoints for Students, Client Staff, and Viewers.

**Target Roles:** Student, Client Staff, Viewer
**Base Routes:** `/api/app/...`, `/api/client-staff/progress`, `/api/viewer/reports`

**Prerequisites:**

*   Supabase project set up.
*   `profiles` table exists (linking `auth.users`, with `id`, `role`, `client_id`, `is_active`).
*   `clients` table exists.
*   `products`, `modules`, `course_lessons`, `assessment_questions`, `assessment_module_questions` tables exist.
*   `course_progress` table exists (e.g., PK on `student_id` + `module_id` or `lesson_id`, `status` ['not-started', 'in-progress', 'completed'], `progress_percentage`, `completed_at`, `last_accessed_at`).
*   `assessment_progress` table exists (e.g., PK on `student_id` + `module_id`, `score`, `passed`, `submitted_at`, `answers` JSONB).
*   Supabase RLS policies configured for all tables, crucially for `course_progress` and `assessment_progress` (Students: self-access; Client Staff: access based on student's `client_id`; Viewer: potentially broader access for aggregation, possibly via `SECURITY DEFINER` functions if direct RLS is too complex).
*   Next.js project with App Router, TypeScript, Zod, Supabase SSR helper installed.
*   Utility functions for Supabase server/admin clients and getting user session/profile/role exist.
*   Zod schemas for `ModuleIdSchema`, `ClientIdSchema`, `ProductIdSchema` exist.

**Design Notes:**

*   Student routes (`/api/app/...`) operate based on the authenticated student's ID.
*   Staff/Viewer routes require careful scoping based on roles and client associations.
*   RLS is critical for data security in progress tables.
*   Aggregation for reports might require specific database functions or careful query construction.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/progress.ts` (Create if needed)

*   [ ] **Create File/Imports:** Create `lib/schemas/progress.ts` and import `zod`.
*   [ ] **Define `CourseProgressUpdateSchema` (Student PATCH body):**
    ```typescript
    import { z } from 'zod';

    export const CourseProgressUpdateSchema = z.object({
      lesson_id: z.string().uuid({ message: 'Invalid Lesson ID' }), // Or module_id depending on granularity
      status: z.enum(['in-progress', 'completed']).optional(),
      progress_percentage: z.number().min(0).max(100).optional(),
      // Add other updatable fields like last video position?
    });
    ```
*   [ ] **Define `AssessmentSubmissionSchema` (Student POST body):**
    ```typescript
    export const AssessmentSubmissionSchema = z.object({
      answers: z.record(z.union([z.string(), z.array(z.string())])), // Record<questionId, selectedOptionId(s)>
      // Include timing information if needed
      duration_seconds: z.number().int().optional(),
    });
    ```
*   [ ] **Define `ProgressQuerySchema` (Client Staff GET query params):**
    ```typescript
    export const ProgressQuerySchema = z.object({
      studentId: z.string().uuid().optional(),
      productId: z.string().uuid().optional(),
      moduleId: z.string().uuid().optional(),
      // Add date range filters?
    });
    ```
*   [ ] **Define `ReportQuerySchema` (Viewer GET query params):**
    ```typescript
    export const ReportQuerySchema = z.object({
      clientId: z.string().uuid().optional(),
      productId: z.string().uuid().optional(),
      // Add date range filters?
    });
    ```
*   [ ] **Export Schemas.**

---

## 2. Student Progress Update Routes (`/api/app/...`)

### 2.1 Implement `PATCH /api/app/progress/course/[moduleId]` (Update Course Progress)

*   **File:** `app/api/app/progress/course/[moduleId]/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ModuleIdSchema`, `CourseProgressUpdateSchema`.
*   [ ] **Define `PATCH` Handler:** `export async function PATCH(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Verify user session, get profile, check role is 'Student'. `const { user, profile, role, error: authError } = await getUserSessionAndProfile(supabase);`
    *   [ ] Handle auth errors/role mismatch (401/403).
    *   [ ] Get `studentId = user.id;`
*   [ ] **Validate Route Parameter (`moduleId`):** Validate `params.moduleId`.
*   [ ] **Parse & Validate Request Body:** Validate body using `CourseProgressUpdateSchema`.
*   [ ] **Verify Enrollment:** Check if the student (`studentId`) is enrolled in the product associated with `moduleId` (requires fetching module/product data or checking assignment/enrollment tables).
*   [ ] **Update/Insert Progress:**
    *   [ ] Create Supabase client.
    *   [ ] Use `.upsert()` on `course_progress` table. Key will be `student_id` and `module_id` (or `lesson_id` if tracking per lesson). Update `status`, `progress_percentage`, `last_accessed_at`. Set `completed_at` if status is 'completed'.
    ```sql
    // Example Upsert Logic (adjust fields/keys)
    const { data, error } = await supabase
      .from('course_progress')
      .upsert({
        student_id: studentId,
        module_id: moduleId,
        lesson_id: updateData.lesson_id, // if tracking per lesson
        status: updateData.status,
        progress_percentage: updateData.progress_percentage,
        last_accessed_at: new Date().toISOString(),
        completed_at: updateData.status === 'completed' ? new Date().toISOString() : null,
      }, { onConflict: 'student_id,module_id,lesson_id' }) // Adjust conflict target
      .select()
      .single();
    ```
*   [ ] **Handle Response & Errors:** Handle DB errors (500), return updated progress data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 2.2 Implement `POST /api/app/assessments/[moduleId]/submit` (Submit Assessment)

*   **File:** `app/api/app/assessments/[moduleId]/submit/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ModuleIdSchema`, `AssessmentSubmissionSchema`.
*   [ ] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session, get profile, check role is 'Student'. Get `studentId`.
*   [ ] **Validate `moduleId`:** Validate route parameter.
*   [ ] **Verify Module Type:** Fetch module, ensure `type` is 'Assessment'.
*   [ ] **Verify Enrollment & Check Previous Submission:** Check if student is enrolled and if an entry already exists for this `studentId` and `moduleId` in `assessment_progress` (prevent resubmission unless allowed).
*   [ ] **Parse & Validate Body:** Validate body using `AssessmentSubmissionSchema`.
*   [ ] **Assessment Grading Logic:**
    *   [ ] Fetch correct answers for the questions linked to this `moduleId` (query `assessment_module_questions` join `assessment_questions`).
    *   [ ] Compare `submissionData.answers` with correct answers.
    *   [ ] Calculate `score` and determine `passed` status based on module configuration (pass threshold - may need to store in `modules.configuration`).
*   [ ] **Insert Assessment Result:**
    *   [ ] Create Supabase client.
    *   [ ] Insert into `assessment_progress`: include `student_id`, `module_id`, calculated `score`, `passed` status, submitted `answers` (JSONB), `submitted_at`.
*   [ ] **Handle Response & Errors:** Handle DB errors (500), return assessment result (score, passed status) (201).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Student Progress Fetching (`/api/app/progress`)

### 3.1 Implement `GET /api/app/progress` (Get Student's Own Progress)

*   **File:** `app/api/app/progress/route.ts`

*   [ ] **Create File/Directory:** Create directory and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session, get profile, check role is 'Student'. Get `studentId`.
*   [ ] **Fetch Assigned Products/Modules:** Get the list of products/modules the student is *currently enrolled* in (requires joining `profiles` or `client_product_assignments`).
*   [ ] **Fetch Corresponding Progress:**
    *   [ ] Create Supabase client.
    *   [ ] Query `course_progress` table for `studentId`, filtering by relevant `module_id`s or `lesson_id`s.
    *   [ ] Query `assessment_progress` table for `studentId`, filtering by relevant `module_id`s.
*   [ ] **Combine Data:** Structure the response to show product/module hierarchy with associated progress data (e.g., completion status, scores).
*   [ ] **Handle Response & Errors:** Handle DB errors, return structured progress overview (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Client Staff Progress Fetching (`/api/client-staff/progress`)

### 4.1 Implement `GET /api/client-staff/progress` (Get Progress for Client's Students)

*   **File:** `app/api/client-staff/progress/route.ts`

*   [ ] **Create File/Directory:** Create directory and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ProgressQuerySchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session, get profile, check role is 'Client Staff' (or 'Admin').
*   [ ] **Determine Client Scope:**
    *   [ ] **If Admin:** Allow fetching for any client (potentially require `clientId` query param).
    *   [ ] **If Client Staff:** Get `staffClientId = profile.client_id;`. If null, return 403.
*   [ ] **Parse & Validate Query Parameters:** Validate query params (`studentId`, `productId`, `moduleId`) using `ProgressQuerySchema`.
*   [ ] **Fetch Target Student IDs:**
    *   [ ] If `query.studentId` is provided, use it (and verify it belongs to the staff's client if role is Staff).
    *   [ ] Otherwise, fetch all active student IDs (`id` from `profiles`) belonging to `staffClientId` (or `query.clientId` if Admin).
*   [ ] **Fetch Progress Data (Scoped):**
    *   [ ] Create Supabase client.
    *   [ ] Query `course_progress` filtering by the fetched `studentId`(s). Apply `moduleId` filter if provided.
    *   [ ] Query `assessment_progress` filtering by the fetched `studentId`(s). Apply `moduleId` filter if provided.
    *   [ ] Fetch related `profiles` (student names), `modules`, `products` data as needed for the response structure.
    *   **RLS is crucial here.** Ensure Client Staff RLS policies on progress tables correctly restrict access based on the student's `client_id`.
*   [ ] **Structure and Return Data:** Format the data (e.g., grouped by student, then by product/module) suitable for the reporting UI. Return 200.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Viewer Reporting (`/api/viewer/reports`)

### 5.1 Implement `GET /api/viewer/reports` (Get Aggregated Reports)

*   **File:** `app/api/viewer/reports/route.ts`

*   [ ] **Create File/Directory:** Create directory and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `ReportQuerySchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Viewer' (or 'Admin').
*   [ ] **Parse & Validate Query Parameters:** Validate query params (`clientId`, `productId`) using `ReportQuerySchema`.
*   [ ] **Fetch and Aggregate Data:**
    *   [ ] This is the most complex part. Direct table queries with joins and aggregations might become slow or complex, especially across many students/clients.
    *   **Option 1 (Direct Query):** Construct SQL queries using Supabase client to join `profiles`, `course_progress`, `assessment_progress`, `modules`, `products`, `clients`. Filter by `query.clientId`, `query.productId`. Use `COUNT`, `AVG`, etc., and `GROUP BY` clauses to aggregate (e.g., completion rate per product, average score per assessment).
    *   **Option 2 (DB Function):** Create a Supabase Database Function (`SECURITY DEFINER` likely needed for cross-client access) that takes filters (clientId, productId) and performs the aggregation within the database, returning a structured summary. Call this function using `supabase.rpc('generate_report', { ...filters })`.
    *   **RLS Considerations:** If using direct queries, Viewer role needs appropriate RLS (potentially read-only access across relevant tables). DB functions can bypass row-level RLS if needed but must handle security internally.
*   [ ] **Handle Response & Errors:** Handle DB/function errors (500), return aggregated report data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 6. Refinement and Testing

*   [ ] **Review Code:** Check consistency, error handling, authorization logic, RLS implications.
*   [ ] **Database Schema:** Ensure progress tables have necessary indexes (on `student_id`, `module_id`, `lesson_id`, `client_id` via join) for efficient querying.
*   [ ] **Test Student Routes:**
    *   Verify students can update/submit progress only for modules they are enrolled in.
    *   Verify students can only fetch their own progress.
    *   Test preventing assessment resubmission (if applicable).
*   [ ] **Test Client Staff Route:**
    *   Verify staff can only fetch progress for students in their assigned client.
    *   Test query parameter filters.
    *   Test 403 scenarios.
*   [ ] **Test Viewer Route:**
    *   Verify report aggregation logic is correct.
    *   Test filters.
    *   Verify data access control (Viewers shouldn't see individual sensitive data unless intended).
*   [ ] **Test RLS:** Directly query tables/call functions as different roles in Supabase SQL editor to confirm RLS works as expected.
*   [ ] **Check Supabase Logs.** 