# Detailed Implementation Plan: Question Bank API (`/api/admin/question-banks`)

This document provides a step-by-step guide for implementing the **Admin Question Bank API** endpoints.

**Target Role:** Admin
**Base Route:** `/api/admin/question-banks`

**Prerequisites:**

*   Supabase project set up.
*   `course_questions` table exists (e.g., `id`, `question_text`, `question_type` [MCQ/MSQ], `options` [JSONB], `correct_answer(s)` [JSONB/text[]], `tags` [text[]], `created_at`).
*   `assessment_questions` table exists (likely similar schema to `course_questions`).
*   Supabase RLS policies configured for both question tables (Admins: all access).
*   Next.js project with App Router, TypeScript, Zod, and Supabase SSR helper installed.
*   Utility functions for creating Supabase server/admin clients and getting user session/role exist.

**Design Note:** This API manages two distinct types of questions stored in separate tables. API routes will differentiate based on a required `type` query parameter (`course` or `assessment`).

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/question.ts`

*   [x] **Create File:** Create the file `lib/schemas/question.ts` if it doesn't exist.
*   [x] **Import Zod:** Add `import { z } from 'zod';`.
*   [x] **Define Question Type Enum:** `export const QuestionBankType = z.enum(['course', 'assessment']);`
*   [x] **Define Question Content Schemas:**
    ```typescript
    // Base schema for common fields
    const BaseQuestionSchema = z.object({
      question_text: z.string().min(1, { message: 'Question text is required' }),
      question_type: z.enum(['MCQ', 'MSQ']), // Multiple Choice Question, Multi-Select Question
      options: z.array(z.object({ id: z.string(), text: z.string() })).min(2, { message: 'At least two options required' }),
      tags: z.array(z.string()).optional().default([]),
      // Add other relevant fields like explanation, difficulty, etc.
    });

    // Schema for MCQ
    export const MCQSchema = BaseQuestionSchema.extend({
      question_type: z.literal('MCQ'),
      correct_answer: z.string({ required_error: 'Correct answer ID is required for MCQ' }), // ID of the correct option
    }).refine(data => data.options.some(opt => opt.id === data.correct_answer), {
      message: 'Correct answer ID must match one of the option IDs',
      path: ['correct_answer'],
    });

    // Schema for MSQ
    export const MSQSchema = BaseQuestionSchema.extend({
      question_type: z.literal('MSQ'),
      correct_answers: z.array(z.string()).min(1, { message: 'At least one correct answer ID is required for MSQ' }), // IDs of correct options
    }).refine(data => data.correct_answers.every(ans => data.options.some(opt => opt.id === ans)), {
      message: 'All correct answer IDs must match option IDs',
      path: ['correct_answers'],
    });

    // Union schema for validation
    export const QuestionSchema = z.discriminatedUnion('question_type', [
      MCQSchema,
      MSQSchema,
    ]);

    // Schema for the request body when creating/updating (includes bank type)
    export const QuestionApiSchema = QuestionSchema.extend({
        bank_type: QuestionBankType, // Used internally in API, not stored in DB table directly
    });

    // Schema for updates (make content fields optional)
    export const UpdateQuestionApiSchema = QuestionSchema.partial().extend({
        bank_type: QuestionBankType,
    });
    ```
*   [x] **Define `QuestionIdSchema`:**
    ```typescript
    export const QuestionIdSchema = z.object({
      questionId: z.string().uuid({ message: 'Invalid Question ID format' })
    });
    ```
*   [x] **Define `QuestionBankQuerySchema`:**
    ```typescript
    export const QuestionBankQuerySchema = z.object({
        type: QuestionBankType,
        // Add other query params like search, tags etc. as optional strings
        search: z.string().optional(),
        tag: z.string().optional(),
    });
    ```
*   [x] **Export Schemas:** Ensure all relevant schemas are exported.

---

## 2. Implement `GET /api/admin/question-banks` (List Questions)

*   **File:** `app/api/admin/question-banks/route.ts`

*   [x] **Create File/Directory:** Create `app/api/admin/question-banks/route.ts`.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `QuestionBankQuerySchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'. Return 401/403 if invalid.
*   [x] **Parse & Validate Query Parameters:**
    *   [x] Get search params: `const { searchParams } = new URL(request.url);`
    *   [x] Convert to object: `const queryParams = Object.fromEntries(searchParams.entries());`
    *   [x] Validate: `const validationResult = QuestionBankQuerySchema.safeParse(queryParams);`
    *   [x] Handle validation errors (400 - especially missing/invalid `type`).
    *   [x] Get validated data: `const { type, search, tag } = validationResult.data;`
*   [x] **Determine Target Table:**
    *   [x] `const tableName = type === 'course' ? 'course_questions' : 'assessment_questions';`
*   [x] **Build Supabase Query:**
    *   [x] Start query: `let query = supabase.from(tableName).select('*');`
    *   [x] Apply filters: `if (search) { query = query.ilike('question_text', `%${search}%`); }`, `if (tag) { query = query.contains('tags', [tag]); }`.
    *   [x] Add ordering: `query = query.order('created_at', { ascending: false });`.
*   [x] **Execute Query & Handle Response:** Fetch data, handle DB errors, return question list or empty array.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Implement `POST /api/admin/question-banks` (Create Question)

*   **File:** `app/api/admin/question-banks/route.ts`

*   [x] **Imports:** Add `QuestionApiSchema`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body: `const body = await request.json();`.
    *   [x] Validate: `const validationResult = QuestionApiSchema.safeParse(body);`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const { bank_type, ...questionData } = validationResult.data;`.
*   [x] **Determine Target Table:** `const tableName = bank_type === 'course' ? 'course_questions' : 'assessment_questions';`
*   [x] **Insert Question:**
    *   [x] Create Supabase server client.
    *   [x] Insert: `const { data: newQuestion, error } = await supabase.from(tableName).insert(questionData).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors (500), return new question data (201).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Implement `GET /api/admin/question-banks/[questionId]` (Get Question Details)

*   **File:** `app/api/admin/question-banks/[questionId]/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/question-banks/[questionId]/route.ts`.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `QuestionIdSchema`, `QuestionBankQuerySchema` (or just `QuestionBankType`).
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { questionId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter:** Validate `params.questionId` using `QuestionIdSchema`.
*   [ ] **Validate Query Parameter (`type`):**
    *   [ ] Get search params: `const { searchParams } = new URL(request.url);`
    *   [ ] Get and validate type: `const typeResult = QuestionBankType.safeParse(searchParams.get('type'));`
    *   [ ] Handle validation errors (400 - missing or invalid `type`).
    *   [ ] Get validated type: `const type = typeResult.data;`
*   [ ] **Determine Target Table:** `const tableName = type === 'course' ? 'course_questions' : 'assessment_questions';`
*   [ ] **Fetch Question Details:**
    *   [ ] Create Supabase server client.
    *   [ ] Query: `const { data: question, error } = await supabase.from(tableName).select('*').eq('id', questionId).single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors (non-PGRST116), handle not found (404), return question data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Implement `PUT /api/admin/question-banks/[questionId]` (Update Question)

*   **File:** `app/api/admin/question-banks/[questionId]/route.ts`

*   [x] **Imports:** Add `UpdateQuestionApiSchema`.
*   [x] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { questionId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Validate Route Parameter:** Validate `params.questionId` using `QuestionIdSchema`.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body.
    *   [x] Validate using `UpdateQuestionApiSchema.safeParse(body)`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const { bank_type, ...updateData } = validationResult.data;`.
    *   [x] Check if `updateData` is empty (return 400).
*   [x] **Determine Target Table:** `const tableName = bank_type === 'course' ? 'course_questions' : 'assessment_questions';`
*   [x] **Update Question:**
    *   [x] Create Supabase server client.
    *   [x] Update: `const { data: updatedQuestion, error } = await supabase.from(tableName).update(updateData).eq('id', questionId).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors, handle not found (if `updatedQuestion` is null), return updated question data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 6. Implement `DELETE /api/admin/question-banks/[questionId]` (Delete Question)

*   **File:** `app/api/admin/question-banks/[questionId]/route.ts`

*   [x] **Imports:** Add `QuestionBankQuerySchema` (or `QuestionBankType`).
*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { questionId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Validate Route Parameter:** Validate `params.questionId` using `QuestionIdSchema`.
*   [x] **Validate Query Parameter (`type`):** Validate the `type` query parameter as in the GET details endpoint. Return 400 if invalid.
*   [x] **Determine Target Table:** `const tableName = type === 'course' ? 'course_questions' : 'assessment_questions';`
*   [x] **Perform Deletion:**
    *   [x] Create Supabase server client.
    *   [ ] **Consider Dependencies:** Check if the question is used in any `modules` (`course_lessons` quiz_id or `assessment_module_questions`). Disallow deletion or cascade if appropriate (requires careful DB schema design or manual checks).
    *   [x] Delete question: `const { error } = await supabase.from(tableName).delete().eq('id', questionId);`.
*   [x] **Handle Response & Errors:** Handle DB errors (500). If successful, return 204 No Content.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 7. Refinement and Testing

*   [ ] **Review Code:** Ensure consistency, proper error handling, and adherence to best practices.
*   [ ] **Test Each Endpoint:** Use Postman/Insomnia:
    *   Success cases for CRUD on both `course` and `assessment` types.
    *   Authentication/Authorization failures.
    *   Validation errors (invalid input, missing type parameter, schema violations like incorrect options/answers).
    *   Not found errors (invalid IDs).
    *   Filter functionality (list endpoint).
    *   Deletion constraints.
*   [ ] **Check Supabase Logs:** Monitor logs.
*   [ ] **Verify RLS:** Ensure only Admins can access. 