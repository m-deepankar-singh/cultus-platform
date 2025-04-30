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

*   [x] **Create File:** Create the file `lib/schemas/module.ts` if it doesn't exist.
*   [x] **Imports:** `import { z } from 'zod';`
*   [x] **Define Module Type Enum:** `export const ModuleTypeEnum = z.enum(['Course', 'Assessment']);`
*   [x] **Define `ModuleSchema` (for Creation):**
    ```typescript
export const ModuleSchema = z.object({
  product_id: z.string().uuid({ message: 'Invalid Product ID' }),
  name: z.string().min(1, { message: 'Module name is required' }),
  type: ModuleTypeEnum,
  configuration: z.record(z.unknown()).optional().default({}), // Flexible JSONB for future settings. **Note:** For 'Assessment' type, this should store settings like time_limit_minutes, score_per_question, etc., as defined in the PRD.
  // Add other module fields if needed
});
```
*   [x] **Define `UpdateModuleSchema`:**
    ```typescript
export const UpdateModuleSchema = ModuleSchema.omit({ product_id: true }).partial(); // product_id cannot be changed
```
*   [x] **Define `ModuleIdSchema`:**
    ```typescript
export const ModuleIdSchema = z.object({
  moduleId: z.string().uuid({ message: 'Invalid Module ID format' })
});
```
*   [x] **Define `CourseLessonSchema` (for Creation/Update):**
    ```typescript
export const CourseLessonSchema = z.object({
  // module_id will come from the route parameter
  sequence: z.number().int().min(0, { message: 'Sequence must be non-negative' }),
  title: z.string().min(1, { message: 'Lesson title is required' }),
  video_url: z.string().url({ message: 'Invalid video URL' }).optional().nullable(),
  quiz_id: z.string().uuid({ message: 'Invalid Quiz Question ID' }).optional().nullable(),
});
```
*   [x] **Define `UpdateCourseLessonSchema`:**
    ```typescript
export const UpdateCourseLessonSchema = CourseLessonSchema.partial();
```
*   [x] **Define `LessonIdSchema`:**
    ```typescript
export const LessonIdSchema = z.object({
  lessonId: z.string().uuid({ message: 'Invalid Lesson ID format' })
});
```
*   [x] **Define `AssessmentQuestionLinkSchema`:**
    ```typescript
export const AssessmentQuestionLinkSchema = z.object({
  question_id: z.string().uuid({ message: 'Invalid Assessment Question ID' })
});
```
*   [x] **Export Schemas:** Ensure all defined schemas are exported.

---

## 2. Product-Specific Module Routes (`/api/admin/products/[productId]/modules`)

### 2.1 Implement `GET /api/admin/products/[productId]/modules` (List Modules for Product)

*   **File:** `app/api/admin/products/[productId]/modules/route.ts` 

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient` (server client utility), `ProductIdSchema` (from product schemas).
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Create Supabase server client.
    *   [x] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401 Unauthorized).
    *   [x] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile` (500 or 403).
    *   [x] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [x] **Validate Route Parameter (`productId`):** Validate `params.productId` using `ProductIdSchema`. Handle validation errors (400).
*   [x] **Fetch Modules:**
    *   [x] Query: `const { data: modules, error } = await supabase.from('modules').select('*').eq('product_id', productId).order('created_at', { ascending: true });`.
*   [x] **Handle Response & Errors:** Handle DB errors, return module list.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 2.2 Implement `POST /api/admin/products/[productId]/modules` (Create Module)

*   **File:** `app/api/admin/products/[productId]/modules/route.ts` 

*   [x] **Imports:** Add `ModuleSchema`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Create Supabase server client.
    *   [x] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [x] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [x] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [x] **Validate Route Parameter (`productId`):** Validate `params.productId`. Handle validation errors (400).
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body.
    *   [x] **Inject `productId`:** Add `productId` from `params` to the body object before validation if `ModuleSchema` doesn't include it, or validate separately.
    *   [x] Validate body against `ModuleSchema` (ensure `product_id` matches `params.productId`).
    *   [x] Handle validation errors (400).
    *   [x] Get validated data (excluding `product_id` if handled separately, or include it if part of schema).
*   [x] **Insert Module:**
    *   [x] Insert: `const { data: newModule, error } = await supabase.from('modules').insert({ ...moduleData, product_id: productId }).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors, return new module data (201).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Module-Specific Routes (`/api/admin/modules/[moduleId]`)

### 3.1 Implement `GET /api/admin/modules/[moduleId]` (Get Module Details)

*   **File:** `app/api/admin/modules/[moduleId]/route.ts` 

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Create Supabase server client.
    *   [x] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [x] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [x] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [x] **Validate Route Parameter (`moduleId`):** Validate `params.moduleId` using `ModuleIdSchema`. Handle validation errors (400).
*   [x] **Fetch Module Core Details:**
    *   [x] Query: `const { data: module, error: moduleError } = await supabase.from('modules').select('*, product:products(*)').eq('id', moduleId).single();`.
    *   [x] Handle initial fetch errors (DB error or module not found - 404).
*   [x] **Fetch Related Data Based on Type:**
    *   [x] `if (module.type === 'Course') { ... } else if (module.type === 'Assessment') { ... }`
    *   [x] **Course:** Fetch `course_lessons`: `const { data: lessons, error: lessonError } = await supabase.from('course_lessons').select('*, quiz:course_questions(id, question_text)').eq('module_id', moduleId).order('sequence', { ascending: true });`
    *   [x] **Assessment:** Fetch `assessment_module_questions` and join `assessment_questions`: `const { data: assessmentQuestions, error: aqError } = await supabase.from('assessment_module_questions').select('question:assessment_questions(*)').eq('module_id', moduleId);`
*   [x] **Combine and Return Response:**
    *   [x] Check for errors fetching related data.
    *   [x] Combine `module` data with `lessons` or `assessmentQuestions`.
    *   [x] Return combined data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 3.2 Implement `PUT /api/admin/modules/[moduleId]` (Update Module)

*   **File:** `app/api/admin/modules/[moduleId]/route.ts` 

*   [x] **Imports:** Add `UpdateModuleSchema`.
*   [x] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Create Supabase server client.
    *   [x] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [x] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [x] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [x] **Validate Route Parameter (`moduleId`):** Validate `params.moduleId`. Handle validation errors (400).
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body.
    *   [x] Validate using `UpdateModuleSchema.safeParse(body)`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const updateData = validationResult.data;`.
    *   [x] Check if `updateData` is empty (return 400).
*   [x] **Update Module:**
    *   [x] Update: `const { data: updatedModule, error } = await supabase.from('modules').update(updateData).eq('id', moduleId).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors, handle not found, return updated module data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 3.3 Implement `DELETE /api/admin/modules/[moduleId]` (Delete Module)

*   **File:** `app/api/admin/modules/[moduleId]/route.ts` 

*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Create Supabase server client.
    *   [x] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [x] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [x] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [x] **Validate Route Parameter (`moduleId`):** Validate `params.moduleId`. Handle validation errors (400).
*   [x] **Perform Deletion:**
    *   [x] Delete module: `const { error } = await supabase.from('modules').delete().eq('id', moduleId);`.
*   [x] **Handle Response & Errors:** Handle DB errors (500). If successful, return 204 No Content.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Course Lesson Management (`/api/admin/modules/[moduleId]/lessons/...`)

### 4.1 Implement `GET /api/admin/modules/[moduleId]/lessons` (List Lessons)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/route.ts` ✅

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Standard Admin checks.
*   [x] **Validate Route Parameter (`moduleId`):** Use `ModuleIdSchema`.
*   [x] **Verify Module Type:** Fetch module (`select('id, type')`), ensure it exists and `type === 'Course'`. Handle errors (404, 400 for wrong type).
*   [x] **Fetch Lessons:** `const { data: lessons, error } = await supabase.from('course_lessons').select('*').eq('module_id', moduleId).order('sequence', { ascending: true });`
*   [x] **Handle Response & Errors:** Handle DB errors, return lessons array (200).
*   [x] **Add Error Handling:** `try...catch`.

### 4.2 Implement `POST /api/admin/modules/[moduleId]/lessons` (Create Lesson)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/route.ts` ✅

*   [x] **Imports:** Add `CourseLessonSchema`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Standard Admin checks.
*   [x] **Validate Route Parameter (`moduleId`):** Use `ModuleIdSchema`.
*   [x] **Verify Module Type:** Ensure module exists and `type === 'Course'`. Handle errors.
*   [x] **Parse & Validate Request Body:** Use `CourseLessonSchema.safeParse(body)`. Handle errors (400).
*   [x] **Calculate Next Sequence Number:**
    *   [x] Query: `const { data: maxSeq, error } = await supabase.from('course_lessons').select('sequence').eq('module_id', moduleId).order('sequence', { ascending: false }).limit(1).maybeSingle();`
    *   [x] Calculate: `const nextSequence = (maxSeq?.sequence ?? 0) + 1;`
*   [x] **Insert Lesson:** `const { data: newLesson, error } = await supabase.from('course_lessons').insert({ ...lessonData, module_id: moduleId, sequence: nextSequence }).select().single();`
*   [x] **Handle Response & Errors:** Handle DB errors, return new lesson data (201 Created).
*   [x] **Add Error Handling:** `try...catch`.

### 4.3 Implement `GET /api/admin/modules/[moduleId]/lessons/[lessonId]` (Get Lesson Details)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/[lessonId]/route.ts` ✅

*   [x] **Create File/Directory:** Create directory and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`, `LessonIdSchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { moduleId: string, lessonId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Standard Admin checks.
*   [x] **Validate Route Parameters:** Validate both `moduleId` and `lessonId`. Handle validation errors (400).
*   [x] **Verify Module Type:** Ensure module exists and `type === 'Course'`. Handle errors.
*   [x] **Fetch Lesson:** Fetch from `course_lessons` where `id` matches `lessonId` AND `module_id` matches `moduleId`. Handle 404 if not found.
*   [x] **Handle Response & Errors:** Return lesson data (200) or appropriate error responses.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 4.4 Implement `PUT /api/admin/modules/[moduleId]/lessons/[lessonId]` (Update Lesson)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/[lessonId]/route.ts` ✅

*   [x] **Imports:** Add `UpdateCourseLessonSchema`.
*   [x] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { moduleId: string, lessonId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Standard Admin checks.
*   [x] **Validate Route Parameters:** Validate both `moduleId` and `lessonId`. Handle validation errors (400).
*   [x] **Parse & Validate Body:** Validate request body using `UpdateCourseLessonSchema`. Handle validation errors (400).
*   [x] **Verify Lesson Belongs to Module:** Check if lesson exists in the specified module before updating.
*   [x] **Update Lesson:** Update `course_lessons` where `id` matches `lessonId` AND `module_id` matches `moduleId`.
*   [x] **Handle Response:** Return updated lesson data (200), handle not found.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 4.5 Implement `DELETE /api/admin/modules/[moduleId]/lessons/[lessonId]` (Delete Lesson)

*   **File:** `app/api/admin/modules/[moduleId]/lessons/[lessonId]/route.ts` ✅

*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { moduleId: string, lessonId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Standard Admin checks.
*   [x] **Validate Route Parameters:** Validate both `moduleId` and `lessonId`. Handle validation errors (400).
*   [x] **Delete Lesson:** Delete from `course_lessons` where `id` matches `lessonId` AND `module_id` matches `moduleId`.
*   [x] **Handle Response:** Return 204 No Content, handle errors/not found.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Assessment Question Linking (`/api/admin/modules/[moduleId]/assessment-questions/...`)

*   **Base Directory:** `app/api/admin/modules/[moduleId]/assessment-questions/`

### 5.1 Implement `POST /api/admin/modules/[moduleId]/assessment-questions` (Link Question)

*   **File:** `app/api/admin/modules/[moduleId]/assessment-questions/route.ts` ✅

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`, `AssessmentQuestionLinkSchema`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { moduleId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Create Supabase server client.
    *   [x] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [x] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [x] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [x] **Validate `moduleId`:** Validate `params.moduleId`. Handle validation errors (400).
*   [x] **Verify Module Type:** Fetch the module and ensure its `type` is 'Assessment'. Return 400/404 if not found or wrong type.
*   [x] **Parse & Validate Body:** Validate body using `AssessmentQuestionLinkSchema` (get `question_id`).
*   [x] **Verify Question Exists:** Check if the `question_id` exists in the `assessment_questions` table.
*   [x] **Insert Link:** Insert into `assessment_module_questions` link table (`module_id`, `question_id`). Handle potential unique constraint violations (already linked).
*   [x] **Handle Response:** Return success status (201 or 200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 5.2 Implement `DELETE /api/admin/modules/[moduleId]/assessment-questions/[questionId]` (Unlink Question)

*   **File:** `app/api/admin/modules/[moduleId]/assessment-questions/[questionId]/route.ts` ✅

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `ModuleIdSchema`, with a local definition for `QuestionIdSchema`.
*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { moduleId: string, questionId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Create Supabase server client.
    *   [x] Get user session: `const { data: { user }, error: authError } = await supabase.auth.getUser();`. Handle `authError` or `!user` (401).
    *   [x] Fetch user profile/role: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`. Handle `profileError` or `!profile`.
    *   [x] Verify role: `if (profile.role !== 'Admin') { /* return 403 Forbidden */ }`.
*   [x] **Validate `moduleId` and `questionId`:** Validate route params. Handle validation errors (400).
*   [x] **Verify Module Type:** Ensure module exists and `type === 'Assessment'`. Handle errors.
*   [x] **Delete Link:** Delete from `assessment_module_questions` where `module_id` matches AND `question_id` matches.
*   [x] **Handle Response:** Return 204 No Content, handle errors.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

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