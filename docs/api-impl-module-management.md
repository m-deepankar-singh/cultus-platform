# Detailed Implementation Plan: Module Management API

This document provides a step-by-step guide for implementing the **Admin Module Management API** endpoints.

**Target Role:** Admin
**Base Routes:** `/api/admin/products/[productId]/modules`, `/api/admin/modules/[moduleId]` (and sub-routes for lessons/questions)

**Prerequisites:**

*   Supabase project set up.
*   `products` table exists.
*   `modules` table exists (e.g., `id`, `product_id` FK, `name`, `type` ['Course', 'Assessment'], `configuration` JSONB, `created_at`).
*   `course_lessons` table exists (e.g., `id`, `module_id` FK, `sequence` INT, `title`, `video_url`, `quiz_id` FK to `course_questions` nullable).
*   `assessment_module_questions` link table exists (e.g., `module_id` FK, `question_id` FK to `assessment_questions`).
*   `course_questions` and `assessment_questions` tables exist.
*   Supabase RLS policies configured for all tables (Admins: all access).
*   Next.js project with App Router, TypeScript, Zod, and Supabase SSR helper installed.
*   Utility functions for creating Supabase server/admin clients exist.
*   Assumed: A `profiles` table exists, linked to `auth.users` via the user's `id`, containing a `role` column ('Admin', 'Staff', etc.).
*   Relevant Zod schemas from other domains (Product, Question) are available.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/module.ts`

*   [ ] **Create File:** Create the file `lib/schemas/module.ts` if it doesn't exist.
*   [ ] **Imports:** `import { z } from 'zod';`
*   [ ] **Define Module Type Enum:** `export const ModuleTypeEnum = z.enum(['Course', 'Assessment']);`
*   [ ] **Define `ModuleSchema` (for Creation):**
    ```typescript
    export const ModuleSchema = z.object({
      product_id: z.string().uuid({ message: 'Invalid Product ID' }),
      name: z.string().min(1, { message: 'Module name is required' }),
      type: ModuleTypeEnum,
      configuration: z.record(z.unknown()).optional().default({}), // Flexible JSONB for future settings. **Note:** For 'Assessment' type, this should store settings like time_limit_minutes, score_per_question, etc., as defined in the PRD.
      // Add other module fields if needed
    });
    ```
*   [ ] **Define `UpdateModuleSchema`:**
    ```typescript
    export const UpdateModuleSchema = ModuleSchema.omit({ product_id: true }).partial(); // product_id cannot be changed
    ```
*   [ ] **Define `ModuleIdSchema`:**
    ```typescript
    export const ModuleIdSchema = z.object({
      moduleId: z.string().uuid({ message: 'Invalid Module ID format' })
    });
    ```
*   [ ] **Define `CourseLessonSchema` (for Creation/Update):**
    ```typescript
    export const CourseLessonSchema = z.object({
      // module_id will come from the route parameter
      sequence: z.number().int().min(0, { message: 'Sequence must be non-negative' }),
      title: z.string().min(1, { message: 'Lesson title is required' }),
      video_url: z.string().url({ message: 'Invalid video URL' }).optional().nullable(),
      quiz_id: z.string().uuid({ message: 'Invalid Quiz Question ID' }).optional().nullable(),
    });
    ```
*   [ ] **Define `UpdateCourseLessonSchema`:**
    ```typescript
    export const UpdateCourseLessonSchema = CourseLessonSchema.partial();
    ```
*   [ ] **Define `LessonIdSchema`:**
    ```typescript
    export const LessonIdSchema = z.object({
      lessonId: z.string().uuid({ message: 'Invalid Lesson ID format' })
    });
    ```
*   [ ] **Define `AssessmentQuestionLinkSchema`:**
    ```typescript
    export const AssessmentQuestionLinkSchema = z.object({
      question_id: z.string().uuid({ message: 'Invalid Assessment Question ID' })
    });
    ```
*   [ ] **Export Schemas:** Ensure all defined schemas are exported.

---

## 2. Product-Specific Module Routes (`/api/admin/products/[productId]/modules`)

### 2.1 Implement `GET /api/admin/products/[productId]/modules` (List Modules for Product)

*   **File:** `app/api/admin/products/[productId]/modules/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient` (server client utility), `ProductIdSchema` (from product schemas).
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401 Unauthorized).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile` (500 or 403).
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate Route Parameter (`productId`):** Validate `params.productId` using `ProductIdSchema`. Handle validation errors (400).
*   [ ] **Fetch Modules:**
    *   [ ] Query: `const { data: modules, error } = await supabase.from('modules').select('*').eq('product_id', productId).order('created_at', { ascending: true });`.
*   [ ] **Handle Response & Errors:** Handle DB errors, return module list.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 2.2 Implement `POST /api/admin/products/[productId]/modules` (Create Module)

*   **File:** `app/api/admin/products/[productId]/modules/route.ts`

*   [ ] **Imports:** Add `ModuleSchema`.
*   [ ] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate Route Parameter (`productId`):** Validate `params.productId`. Handle validation errors (400).
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get body.
    *   [ ] **Inject `productId`:** Add `productId` from `params` to the body object before validation if `ModuleSchema` doesn't include it, or validate separately.
    *   [ ] Validate body against `ModuleSchema` (ensure `product_id` matches `params.productId`).
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data (excluding `product_id` if handled separately, or include it if part of schema).
*   [ ] **Insert Module:**
    *   [ ] Insert: `const { data: newModule, error } = await supabase.from('modules').insert({ ...moduleData, product_id: productId }).select().single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors, return new module data (201).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Module-Specific Routes (`/api/admin/modules/[moduleId]`)

### 3.1 Implement `GET /api/admin/modules/[moduleId]` (Get Module Details)

*   **File:** `app/api/admin/modules/[moduleId]/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate Route Parameter (`moduleId`):** Validate `params.moduleId` using `ModuleIdSchema`. Handle validation errors (400).
*   [ ] **Fetch Module Core Details:**
    *   [ ] Query: `const { data: module, error: moduleError } = await supabase.from('modules').select('*, product:products(*)').eq('id', moduleId).single();`.
    *   [ ] Handle initial fetch errors (DB error or module not found - 404).
*   [ ] **Fetch Related Data Based on Type:**
    *   [ ] `if (module.type === 'Course') { ... } else if (module.type === 'Assessment') { ... }`
    *   [ ] **Course:** Fetch `course_lessons`: `const { data: lessons, error: lessonError } = await supabase.from('course_lessons').select('*, quiz:course_questions(id, question_text)').eq('module_id', moduleId).order('sequence', { ascending: true });`
    *   [ ] **Assessment:** Fetch `assessment_module_questions` and join `assessment_questions`: `const { data: assessmentQuestions, error: aqError } = await supabase.from('assessment_module_questions').select('question:assessment_questions(*)').eq('module_id', moduleId);`
*   [ ] **Combine and Return Response:**
    *   [ ] Check for errors fetching related data.
    *   [ ] Combine `module` data with `lessons` or `assessmentQuestions`.
    *   [ ] Return combined data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.2 Implement `PUT /api/admin/modules/[moduleId]` (Update Module)

*   **File:** `app/api/admin/modules/[moduleId]/route.ts`

*   [ ] **Imports:** Add `UpdateModuleSchema`.
*   [ ] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate Route Parameter (`moduleId`):** Validate `params.moduleId`. Handle validation errors (400).
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get body.
    *   [ ] Validate using `UpdateModuleSchema.safeParse(body)`.
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data: `const updateData = validationResult.data;`.
    *   [ ] Check if `updateData` is empty (return 400).
*   [ ] **Update Module:**
    *   [ ] Update: `const { data: updatedModule, error } = await supabase.from('modules').update(updateData).eq('id', moduleId).select().single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors, handle not found, return updated module data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.3 Implement `DELETE /api/admin/modules/[moduleId]` (Delete Module)

*   **File:** `app/api/admin/modules/[moduleId]/route.ts`

*   [ ] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate Route Parameter (`moduleId`):** Validate `params.moduleId`. Handle validation errors (400).
*   [ ] **Perform Deletion:**
    *   [ ] Delete module: `const { error } = await supabase.from('modules').delete().eq('id', moduleId);`.
*   [ ] **Handle Response & Errors:** Handle DB errors (500). If successful, return 204 No Content.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Course Lesson Management (`/api/admin/modules/[moduleId]/lessons/...`)

*   **Base Directory:** `app/api/admin/modules/[moduleId]/lessons/`

### 4.1 Implement `POST /api/admin/modules/[moduleId]/lessons` (Create Lesson)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/route.ts`
*   [ ] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`, `CourseLessonSchema`.
*   [ ] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate `moduleId`:** Validate `params.moduleId`. Handle validation errors (400).
*   [ ] **Verify Module Type:** Fetch the module using `moduleId` and ensure its `type` is 'Course'. Return 400 or 404 if not found or wrong type.
*   [ ] **Parse & Validate Body:** Validate request body using `CourseLessonSchema`.
*   [ ] **Insert Lesson:** Insert into `course_lessons` table, associating with `moduleId`.
*   [ ] **Handle Response:** Return new lesson data (201).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 4.2 Implement `PUT /api/admin/modules/[moduleId]/lessons/[lessonId]` (Update Lesson)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/[lessonId]/route.ts`
*   [ ] **Create File/Directory.**
*   [ ] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`, `LessonIdSchema`, `UpdateCourseLessonSchema`.
*   [ ] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { moduleId: string, lessonId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate `moduleId` and `lessonId`:** Validate both route params. Handle validation errors (400).
*   [ ] **Parse & Validate Body:** Validate request body using `UpdateCourseLessonSchema`. Handle validation errors (400).
*   [ ] **Update Lesson:** Update `course_lessons` where `id` matches `lessonId` AND `module_id` matches `moduleId` (to ensure lesson belongs to the correct module).
*   [ ] **Handle Response:** Return updated lesson data (200), handle not found.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 4.3 Implement `DELETE /api/admin/modules/[moduleId]/lessons/[lessonId]` (Delete Lesson)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/[lessonId]/route.ts`
*   [ ] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { moduleId: string, lessonId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate `moduleId` and `lessonId`:** Validate route params. Handle validation errors (400).
*   [ ] **Delete Lesson:** Delete from `course_lessons` where `id` matches `lessonId` AND `module_id` matches `moduleId`.
*   [ ] **Handle Response:** Return 204 No Content, handle errors/not found.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Assessment Question Linking (`/api/admin/modules/[moduleId]/assessment-questions/...`)

*   **Base Directory:** `app/api/admin/modules/[moduleId]/assessment-questions/`

### 5.1 Implement `POST /api/admin/modules/[moduleId]/assessment-questions` (Link Question)

*   **File:** `app/api/admin/modules/[moduleId]/assessment-questions/route.ts`
*   [ ] **Create File/Directory.**
*   [ ] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`, `AssessmentQuestionLinkSchema`.
*   [ ] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate `moduleId`:** Validate `params.moduleId`. Handle validation errors (400).
*   [ ] **Verify Module Type:** Fetch the module and ensure its `type` is 'Assessment'. Return 400/404 if not found or wrong type.
*   [ ] **Parse & Validate Body:** Validate body using `AssessmentQuestionLinkSchema` (get `question_id`).
*   [ ] **Verify Question Exists:** Optionally, check if the `question_id` exists in the `assessment_questions` table.
*   [ ] **Insert Link:** Insert into `assessment_module_questions` link table (`module_id`, `question_id`). Handle potential unique constraint violations (already linked).
*   [ ] **Handle Response:** Return success status (201 or 200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 5.2 Implement `DELETE /api/admin/modules/[moduleId]/assessment-questions/[questionId]` (Unlink Question)

*   **File:** `app/api/admin/modules/[moduleId]/assessment-questions/[questionId]/route.ts`
*   [ ] **Create File/Directory.**
*   [ ] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`, `QuestionIdSchema` (from question schemas).
*   [ ] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { moduleId: string, questionId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Create Supabase server client.
    *   [ ] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [ ] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [ ] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [ ] **Validate `moduleId` and `questionId`:** Validate route params. Handle validation errors (400).
*   [ ] **Delete Link:** Delete from `assessment_module_questions` where `module_id` matches AND `question_id` matches.
*   [ ] **Handle Response:** Return 204 No Content, handle errors.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 6. Refinement and Testing

*   [ ] **Review Code:** Check consistency, types, error handling, status codes.
*   [ ] **Test Module CRUD:** Test creating/reading/updating/deleting modules of both types.
*   [ ] **Test Course Lesson CRUD:** Test adding/updating/deleting lessons for Course modules.
*   [ ] **Test Assessment Linking:** Test linking/unlinking questions for Assessment modules.
*   [ ] **Test Type Constraints:** Ensure lesson/question operations fail for the wrong module type.
*   [ ] **Test Dependency Handling:** Verify behavior when deleting products/modules/questions (cascades or constraints).
*   [ ] **Test Authorization:** Ensure only Admins can perform these actions.
*   [ ] **Check Supabase Logs.** 