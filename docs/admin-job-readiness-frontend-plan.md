# Admin Panel: Job Readiness Frontend Implementation Plan

## 1. Overview

This document outlines the step-by-step plan for developing the Admin Panel frontend for the "Job Readiness" product. This includes creating a new section in the admin sidebar, dedicated pages for managing various aspects of Job Readiness, and integrating these pages with the existing backend API routes under `/api/admin/job-readiness/`. This plan is updated based on the API specifications outlined in `job-readiness-api-documentation.md`.

## 2. Core Setup & Navigation

### 2.1. Sidebar Integration ✅ COMPLETED
-   **Task**: ✅ Modify the existing `DashboardSidebar` component (`@/components/dashboard-sidebar.tsx`).
    -   ✅ Add a new top-level navigation item: "Job Readiness".
        -   ✅ Icon: `Briefcase` from `lucide-react`
    -   ✅ This item is a collapsible group with sub-items and links to Job Readiness overview page.
-   **Task**: ✅ Define sub-navigation items under "Job Readiness".
    -   ✅ Products
    -   ✅ Backgrounds
    -   ✅ Assessments (JR)
    -   ✅ Courses (JR)
    -   ✅ Expert Sessions
    -   ✅ Projects (JR)
    -   ✅ Submissions Review
    -   ✅ Student Progress (JR)
    -   ✅ Promotion Exams
-   **Permissions**: ✅ This new sidebar section is only visible to users with the "Admin" role.

### 2.2. Routing Setup
-   **Task**: Create new route groups and pages within `app/(dashboard)/admin/job-readiness/`.
    -   `app/(dashboard)/admin/job-readiness/` (Optional: Default overview page)
    -   `app/(dashboard)/admin/job-readiness/products/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/backgrounds/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/assessments/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/courses/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/expert-sessions/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/projects/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/submissions/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/progress/page.tsx`
    -   `app/(dashboard)/admin/job-readiness/promotion-exams/page.tsx`
-   **Task**: Ensure layout consistency with other admin pages (`app/(dashboard)/layout.tsx`).

## 3. Shared Components & Utilities for Job Readiness Admin

-   **Task**: Create a directory `components/job-readiness/admin/` for shared admin-specific JR components.
-   **Task**: Develop a generic data table component or adapt existing ones (e.g., from `ModulesTable`) for JR entities, including features like search, filtering, pagination, and sort.
-   **Task**: Develop standard form components (Create/Edit modals/dialogs) for JR entities.
    -   Leverage `@/components/ui/` (Dialog, Form, Input, Select, etc.).
    -   Implement reusable form field components for common JR configurations (e.g., tier selection, prompt textareas).

## 4. Feature: Product Management (Job Readiness)

-   **Page**: `app/(dashboard)/admin/job-readiness/products/page.tsx`
-   **Components**:
    -   `JrProductsTable`: Displays list of Job Readiness products.
        -   Columns: Name, Description, Type (should always be "JOB_READINESS"), Tier Score Ranges (Bronze, Silver, Gold Min/Max), Created At, Actions.
        -   Actions: Edit, Delete.
    -   `JrProductCreateEditForm` (Modal/Dialog):
        -   Fields for Creating (aligns with `POST /api/admin/job-readiness/products` request body):
            -   `name` (string, required): Product Name.
            -   `description` (string, optional): Product Description.
            -   `configuration` (object, required):
                -   `bronze_assessment_min_score` (number, required, 0-100).
                -   `bronze_assessment_max_score` (number, required, 0-100).
                -   `silver_assessment_min_score` (number, required, 0-100).
                -   `silver_assessment_max_score` (number, required, 0-100).
                -   `gold_assessment_min_score` (number, required, 0-100).
                -   `gold_assessment_max_score` (number, required, 0-100).
            -   *(Note: Configuration for 5-star criteria is mentioned in PRD but not present in the documented API for this endpoint. This might be a future addition or part of module-level config.)*
        -   Fields for Editing (aligns with `PATCH /api/admin/job-readiness/products` request body):
            -   `id` (string, UUID, required, hidden or non-editable, used for targeting the update).
            -   `name` (string, optional).
            -   `description` (string, optional).
            -   `configuration` (object, optional, same structure as create).
-   **API Integration**:
    -   **List Products**: `GET /api/admin/job-readiness/products`
        -   **Example Response Snippet**:
            ```json
            {
                "products": [
                    {
                        "id": "69999207-4a61-4261-b47d-5ae463a23c56",
                        "name": "Full Stack Development Career Path",
                        "description": "Comprehensive job readiness program for full stack developers with tier-based progression",
                        "type": "JOB_READINESS",
                        "job_readiness_products": [ { "id": "ab8b2f9f-15d5-4220-926f-c3444a5f633d", ..., "gold_assessment_max_score": 100, ... } ]
                    }
                ]
            }
            ```
    -   **Create Product**: `POST /api/admin/job-readiness/products`
        -   **Request Body Example**:
            ```json
            {
              "name": "Advanced Job Readiness Program",
              "description": "A comprehensive job readiness program for senior-level positions",
              "configuration": {
                "bronze_assessment_min_score": 0, "bronze_assessment_max_score": 65,
                "silver_assessment_min_score": 66, "silver_assessment_max_score": 85,
                "gold_assessment_min_score": 86, "gold_assessment_max_score": 100
              }
            }
            ```
    -   **Update Product**: `PATCH /api/admin/job-readiness/products`
        -   **Request Body Example**:
            ```json
            {
              "id": "69999207-4a61-4261-b47d-5ae463a23c56",
              "name": "Updated Job Readiness Program",
              "configuration": { "bronze_assessment_max_score": 70 }
            }
            ```
    -   **Delete Product**: `DELETE /api/admin/job-readiness/products?id={productId}`
-   **Functionality**:
    -   List all Job Readiness products with their specific configurations.
    -   Allow admins to create new Job Readiness products, defining name, description, and tier assessment score ranges.
    -   Allow admins to edit existing Job Readiness products.
    -   Allow admins to delete Job Readiness products.

## 5. Feature: Background & Project Configuration

-   **Page**: `app/(dashboard)/admin/job-readiness/backgrounds/page.tsx`
-   **Components**:
    -   `JrBackgroundsTable`: Displays list of defined student background types and their project configurations.
        -   Columns: Background Type, Project Type, Project Description Template, Tiered Prompts (summary), Actions.
        -   Actions: Edit, Delete.
    -   `JrBackgroundEditForm` (Modal/Dialog):
        -   Fields for Creating/Editing (aligns with `POST` & `PATCH /api/admin/job-readiness/backgrounds` request bodies):
            -   `id` (string, UUID, for PATCH only, hidden or non-editable).
            -   `background_type` (string, required, Select from predefined enum e.g., `COMPUTER_SCIENCE`, `DATA_SCIENCE`).
            -   `project_type` (string, required, Select from predefined enum e.g., `CODING_PROJECT`, `DATA_ANALYSIS`).
            -   `project_description_template` (string, required, Textarea).
            -   `grading_criteria` (array of objects `{"weight": number, "criterion": string}`, required). UI should allow dynamic adding/editing of criteria.
            -   `bronze_system_prompt` (string, required, Textarea).
            -   `bronze_input_prompt` (string, required, Textarea).
            -   `silver_system_prompt` (string, required, Textarea).
            -   `silver_input_prompt` (string, required, Textarea).
            -   `gold_system_prompt` (string, required, Textarea).
            -   `gold_input_prompt` (string, required, Textarea).
        -   *(Note: The PRD mentions `job_readiness_background_interview_types` for interview prompts per background/tier. However, the documented `/api/admin/job-readiness/backgrounds` endpoint currently only supports project-related configurations. Interview prompt configuration will require a separate API or an extension to this one. This plan currently only covers project configurations as per the API docs.)*
-   **API Integration**:
    -   **List Backgrounds**: `GET /api/admin/job-readiness/backgrounds`
        -   **Example Response Snippet**:
            ```json
            {
                "backgrounds": [
                    {
                        "id": "3c70cd51-4169-45a4-9e72-620877ca2d2e",
                        "background_type": "COMPUTER_SCIENCE",
                        "project_type": "CODING_PROJECT",
                        "project_description_template": "A coding project...",
                        "grading_criteria": [{"weight": 40, "criterion": "Code Quality"}, ...],
                        "bronze_system_prompt": "You are a project creator...",
                        ...
                    }
                ]
            }
            ```
    -   **Create Background Config**: `POST /api/admin/job-readiness/backgrounds`
        -   **Request Body Example**: (Refer to API docs for full structure, including all prompt fields)
            ```json
            {
              "background_type": "DATA_SCIENCE",
              "project_type": "DATA_ANALYSIS",
              "project_description_template": "A data analysis project...",
              "grading_criteria": [ {"weight": 35, "criterion": "Data Quality & Cleaning"}, ... ],
              "bronze_system_prompt": "You are a project creator for data scientists...",
              ...
            }
            ```
    -   **Update Background Config**: `PATCH /api/admin/job-readiness/backgrounds`
        -   **Request Body Example**: (ID is required, other fields are optional)
            ```json
            {
              "id": "3c70cd51-4169-45a4-9e72-620877ca2d2e",
              "project_description_template": "An updated coding project...",
              "gold_system_prompt": "Updated advanced prompt..."
            }
            ```
    -   **Delete Background Config**: `DELETE /api/admin/job-readiness/backgrounds?id={backgroundId}`
-   **Functionality**:
    -   Define student academic/professional backgrounds and map them to project types.
    -   For each background, configure AI project generation parameters (description, grading criteria, system/input prompts for Bronze, Silver, Gold tiers).

## 6. Feature: Job Readiness Assessments Management

-   **Page**: `app/(dashboard)/admin/job-readiness/assessments/page.tsx`
-   **Context**: This section primarily deals with configuring which existing assessments (modules of type 'assessment') are used for initial tier determination within a specific Job Readiness product. The actual assessment creation and content management happens in the main "Modules" section of the admin panel.
-   **Components**:
    -   This functionality is primarily part of the **Product Management (Job Readiness) UI (Section 4)**. When editing a JR Product, there should be a section to:
        -   List currently assigned assessment modules for tier determination.
        -   Allow an admin to select/assign existing assessment modules (fetched via `GET /api/admin/modules?type=Assessment`) to this JR Product specifically for tiering.
        -   The tier score ranges (Bronze, Silver, Gold min/max scores) are configured directly on the JR Product (see Section 4 API for `job_readiness_products` configuration).
-   **API Integration**:
    -   To list available assessments for assignment: `GET /api/admin/modules?type=Assessment`.
    -   Storing the link between a JR product and the assessment(s) designated for tiering: This needs clarification. It might be a new field in the `job_readiness_products` table's JSONB configuration or a separate mapping table. The current `job-readiness-api-documentation.md` for `POST/PATCH /api/admin/job-readiness/products` does not show a field for linking assessment module IDs for this purpose. **This association logic and its API support need to be defined.**
-   **Functionality**:
    -   Within a Job Readiness Product's configuration page:
        -   View/Manage which assessment module(s) are used for initial tier determination.
        -   Recall that tier score thresholds are set at the JR Product level (Section 4).

## 7. Feature: Job Readiness Courses & AI Quiz Management

-   **Page**: `app/(dashboard)/admin/job-readiness/courses/page.tsx`
-   **Context**: This section allows admins to configure AI quiz settings for courses that are part of a Job Readiness product. Core course creation and lesson management remain in the main "Modules" section. This page provides a focused view for JR-related course configurations.
-   **Components**:
    -   `JrCourseConfigTable`: Lists courses potentially part of JR Products.
        -   Columns: Course Name, AI Quizzes Enabled (Boolean), Tier-Based Difficulty (Boolean), Actions.
        -   Actions: "Configure AI Quizzes" (links to or opens a modal for the specific course module's edit page, likely `/admin/modules/{moduleId}/edit` but with a focus on AI quiz settings).
    -   `JrCourseQuizConfigForm` (Likely part of the standard module edit page, enhanced for JR courses):
        -   Fields (stored in the `modules.configuration` JSONB field for the course):
            -   `enable_ai_quizzes` (Boolean).
            -   `ai_quiz_prompt_template` (Textarea - for generic quiz).
            -   `ai_quiz_question_count` (Number).
            -   `ai_quiz_passing_score` (Number).
            -   `tier_based_difficulty` (Boolean).
            -   If `tier_based_difficulty` is true:
                -   Store configurations for Bronze, Silver, Gold tiers, possibly in `job_readiness_course_quiz_templates` linked to the course module ID. This includes:
                    -   `tier_specific_quiz_prompt_template` (Textarea).
                    -   `tier_specific_question_count` (Number).
                    -   `tier_specific_passing_score` (Number).
            -   Fallback: UI to map Question Bank questions to lessons.
-   **API Integration**:
    -   **List Courses**: `GET /api/admin/modules?type=Course` (or a dedicated JR courses view if established).
    -   **Update Course Config**: `PATCH /api/admin/modules/{moduleId}` (to update the `configuration` field of the course module).
    -   **Tier-Specific Templates**: API for managing `job_readiness_course_quiz_templates` (CRUD) needs to be confirmed/defined if not managed through module configuration.
-   **Functionality**:
    -   View courses and their current AI quiz configuration status.
    -   Navigate to configure AI quiz settings for individual courses:
        -   Enable/disable AI quizzes.
        -   Set global and tier-specific AI quiz parameters.
        -   Manage fallback Question Bank mappings.

## 8. Feature: Expert Sessions Management ✅ COMPLETED

-   **Page**: `app/(dashboard)/admin/job-readiness/expert-sessions/page.tsx` ✅
-   **Current API Status**: These endpoints are **✅ IMPLEMENTED** and production-ready.
-   **Components**: ✅ ALL IMPLEMENTED
    -   ✅ `JrExpertSessionsTable`: Lists uploaded Expert Session videos.
        -   ✅ Columns: Title, Product, Duration, Status, Students, Completion Rate, Uploaded, Actions.
        -   ✅ Actions: Edit, Activate/Deactivate, Delete.
    -   ✅ `JrExpertSessionCreateForm` (Modal/Dialog):
        -   ✅ Fields for Creating (aligns with `POST /api/admin/job-readiness/expert-sessions` request body):
            -   ✅ `title` (string, required): Session title.
            -   ✅ `description` (string, required): Session description.
            -   ✅ `video_file` (file upload, required): Video file validation.
            -   ✅ `product_id` (string, UUID, required): Link to specific Job Readiness product.
        -   ✅ File upload component with:
            -   ✅ File validation (video formats, 500MB size limit).
            -   ✅ Upload progress indicator.
            -   ✅ Automatic duration detection.
    -   ✅ `JrExpertSessionEditForm` (Modal/Dialog):
        -   ✅ Fields for Editing (aligns with `PATCH /api/admin/job-readiness/expert-sessions` request body):
            -   ✅ `id` (string, UUID, hidden/non-editable).
            -   ✅ `title` (string, optional): Updated session title.
            -   ✅ `description` (string, optional): Updated session description.
            -   ✅ `is_active` (boolean, optional): Activate/deactivate session.
    -   ✅ `JrExpertSessionStatsPanel`: Shows statistics for each session.
        -   ✅ Displays: Total sessions, active sessions, total students, average completion rate.
        -   ✅ Individual session completion statistics in table view.
-   **API Integration**:
    -   **List Expert Sessions**: `GET /api/admin/job-readiness/expert-sessions`
        -   **Actual Response Structure**:
            ```json
            {
                "sessions": [
                    {
                        "id": "session-uuid",
                        "product_id": "product-uuid", 
                        "title": "Industry Leadership Insights",
                        "description": "Expert insights on leadership in tech industry",
                        "video_storage_path": "expert_session_videos/video.mp4",
                        "video_url": "https://signed-url-for-24h-access",
                        "video_duration": 3600,
                        "created_at": "2024-01-15T10:00:00Z",
                        "updated_at": "2024-01-15T10:00:00Z",
                        "is_active": true,
                        "completion_stats": {
                            "total_students": 45,
                            "completed_students": 35,
                            "completion_rate": 77.8,
                            "average_completion_percentage": 89.5
                        }
                    }
                ]
            }
            ```
    -   **Create Expert Session**: `POST /api/admin/job-readiness/expert-sessions`
        -   **Request Body** (multipart/form-data):
            ```json
            {
              "title": "Leadership in Technology",
              "description": "A comprehensive session on tech leadership",
              "product_id": "product-uuid",
              "video_file": "[uploaded file]",
              "video_duration": 3600
            }
            ```
        -   **Response includes**: `video_storage_path` and `video_url` (signed URL)
    -   **Update Expert Session**: `PATCH /api/admin/job-readiness/expert-sessions`
        -   **Request Body Example**:
            ```json
            {
              "id": "session-uuid",
              "title": "Updated Leadership Session",
              "description": "Updated description",
              "is_active": false
            }
            ```
    -   **Delete Expert Session**: `DELETE /api/admin/job-readiness/expert-sessions?id={sessionId}`
        -   Soft delete to preserve student progress data.
-   **Functionality**: ✅ ALL IMPLEMENTED
    -   ✅ Upload and manage pre-recorded Expert Session videos from industry leaders.
    -   ✅ Configure session details (title, description) and link to specific Job Readiness products.
    -   ✅ Activate/deactivate sessions without permanent deletion.
    -   ✅ View completion statistics and student engagement metrics.
    -   ✅ Video file validation (format validation, 500MB size limit).
    -   ✅ Automatic video duration detection from uploaded files.
    -   ✅ Search and filter functionality for sessions.
    -   ✅ Responsive design with modern UI components.

## 9. Feature: Job Readiness Projects Management (Overview)

-   **Page**: `app/(dashboard)/admin/job-readiness/projects/page.tsx`
-   **Context**: This page serves as a consolidated overview of all configured AI project generation rules, as defined in "Background & Project Configuration" (Section 5). No direct CRUD operations here.
-   **Components**:
    -   `JrProjectConfigurationsViewer`: Displays a structured list/view of all project configurations.
        -   Grouped by `background_type`.
        -   Shows `project_type`, `project_description_template`, `grading_criteria`, and tier-specific prompts (`bronze_system_prompt`, etc.) for each.
    -   (Optional) A "Preview" button for each configuration that could simulate a project generation call (if a relevant API for previewing is available).
-   **API Integration**:
    -   **Fetch Configurations**: `GET /api/admin/job-readiness/backgrounds` (Uses the same API as Section 5).
-   **Functionality**:
    -   Provide a read-only, comprehensive view of all defined AI project generation rules.
    -   Help admins review and verify configurations across different backgrounds and tiers.

## 10. Feature: Submissions Review (Interviews & Projects)

-   **Page**: `app/(dashboard)/admin/job-readiness/submissions/page.tsx`
-   **Components**:
    -   `JrSubmissionsTable`: Displays student submissions for AI Projects and AI Interviews.
        -   Columns: Student Name, Product, Module Type (Project/Interview), Submission Date, AI Grade/Status, Manual Review Status, Reviewer, Actions.
        -   Filters: By product, module type, status.
        -   Actions: View Submission Details, Manually Review (for interviews).
    -   `JrInterviewReviewModal` (Modal/Dialog):
        -   Displays interview submission details.
        -   Fields for Admin (aligns with `PATCH .../manual-review` request body):
            -   `status` (string, required, Select: "Approved" / "Rejected").
            -   `admin_feedback` (string, required, Textarea, min 1 char).
        -   Button: "Submit Manual Review".
-   **API Integration**:
    -   **List Submissions**:
        -   **Required API Enhancement**: Endpoints like `GET /api/admin/job-readiness/interview-submissions` and `GET /api/admin/job-readiness/project-submissions` with pagination and filtering are needed. These are not currently in `job-readiness-api-documentation.md`.
    -   **Manual Interview Review**: `PATCH /api/admin/job-readiness/interviews/{submissionId}/manual-review`
        -   **Request Body Example (Approval)**:
            ```json
            {
              "status": "Approved",
              "admin_feedback": "Excellent performance."
            }
            ```
-   **Functionality**:
    -   List all project and interview submissions (pending API for listing).
    -   Filter submissions.
    -   Allow admins to manually review and approve/reject interview submissions with feedback.

## 11. Feature: Student Progress & Manual Override

-   **Page**: `app/(dashboard)/admin/job-readiness/progress/page.tsx`
-   **Components**:
    -   `JrStudentProgressTable`: Displays progress of students in JR products.
        -   Columns: Student Name, Email, Enrolled JR Product, Current Star Level, Current Tier, Module Progress (summary), Last Updated, Actions.
        -   Filters: By Product, Client ID, Search (student name/email).
        -   Actions: View Detailed Progress, Override Progress.
    -   `JrStudentProgressOverrideForm` (Modal/Dialog):
        -   Displays current student star level and tier.
        -   Fields for Admin:
            -   New Star Level (Select: Enum `ONE` to `FIVE`).
            -   New Tier (Select: Enum `BRONZE`, `SILVER`, `GOLD`).
            -   Reason for Override (Textarea - for audit log).
        -   Button: "Save Override".
    -   `ExportButton`: To export progress data.
-   **API Integration**:
    -   **List Student Progress**: `GET /api/admin/job-readiness/progress`
        -   Query Params: `productId`, `clientId`, `page`, `pageSize`, `search`.
        -   *(Note: Example response for this endpoint is not in the API docs, but it should return paginated student progress details.)*
    -   **Export Progress**: `GET /api/admin/job-readiness/progress/export`
        -   Query Params: `productId`, `clientId`, `format` (`csv`/`xlsx`).
    -   **Override Progress**: `PATCH /api/admin/job-readiness/students/{studentId}/override-progress`
        -   *(Note: This endpoint is present in the file structure (`students/[studentId]/override-progress/route.ts`) and PRD but missing from `job-readiness-api-documentation.md`. Its request body (e.g., `{ job_readiness_star_level: string, job_readiness_tier: string, reason: string }`) and response need to be confirmed from the actual route implementation.)*
-   **Functionality**:
    -   View, filter, and paginate student progress in Job Readiness products.
    -   Export progress data in CSV/XLSX format.
    -   Allow admins to manually override a student's star level and tier, with an audit trail (pending API spec confirmation).

## 12. Feature: Promotion Exams Management

-   **Page**: `app/(dashboard)/admin/job-readiness/promotion-exams/page.tsx`
-   **Components**:
    -   `JrPromotionExamConfigTable`: Lists JR Products and their promotion exam configurations.
        -   Columns: Product Name, Exam Enabled, Question Count, Pass Threshold, Time Limit, System Prompt (summary), Actions.
        -   Actions: Edit Configuration, Delete Configuration.
    -   `JrPromotionExamConfigForm` (Modal/Dialog):
        -   Fields for Creating/Editing (aligns with `POST` & `PATCH /api/admin/job-readiness/promotion-exams` request bodies):
            -   `id` (string, UUID, for PATCH only, hidden/non-editable if editing).
            -   `product_id` (string, UUID, required for POST, usually non-editable for PATCH, links to a JR Product).
            -   `is_enabled` (boolean, optional, defaults to true).
            -   `question_count` (number, optional, defaults to 25).
            -   `pass_threshold` (number, percentage, optional, defaults to 70).
            -   `time_limit_minutes` (number, optional, defaults to 60).
            -   `system_prompt` (string, optional, Textarea).
    -   `JrPromotionExamAttemptsTable`: Lists student attempts at promotion exams.
        -   Columns: Student Name, Product, Star Level Attempted For, Current Tier, Target Tier, Timestamp, Score, Passed (Status).
        -   *(Note: API for listing attempts needs to be specified. `GET /api/admin/job-readiness/promotion-exams` currently only documents fetching configurations.)*
        -   **Required API Enhancement**: An endpoint like `GET /api/admin/job-readiness/promotion-exam-attempts` (with filtering/pagination) is needed.
-   **API Integration**:
    -   **List Exam Configurations**: `GET /api/admin/job-readiness/promotion-exams`
        -   **Example Response Snippet (Configs)**:
            ```json
            {
                "examConfigs": [ { "id": "3bca8e3c...", "product_id": "69999...", "is_enabled": true, ... "products": {"name": "Full Stack..."} } ]
            }
            ```
    -   **Create Exam Configuration**: `POST /api/admin/job-readiness/promotion-exams`
        -   **Request Body Example**:
            ```json
            {
              "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
              "is_enabled": true, "question_count": 30, "pass_threshold": 75, ...
            }
            ```
    -   **Update Exam Configuration**: `PATCH /api/admin/job-readiness/promotion-exams`
        -   **Request Body Example**: (ID is required, other fields optional)
            ```json
            {
              "id": "3bca8e3c-4f4d-4966-a633-b6286558a314",
              "is_enabled": false, "question_count": 20
            }
            ```
    -   **Delete Exam Configuration**: `DELETE /api/admin/job-readiness/promotion-exams?id={configId}`
    -   **List Exam Attempts**: **Needs API Definition** (e.g., `GET /api/admin/job-readiness/promotion-exam-attempts`)
-   **Functionality**:
    -   Configure promotion exam settings for each JR product.
    -   View a log of all student attempts at promotion exams (pending API for attempts).

## 13. General UI/UX Considerations

-   **Consistency**: Adhere to the existing admin panel's design language, component usage (`@/components/ui/`), and UX patterns.
-   **Responsiveness**: Ensure all new pages and components are responsive.
-   **Loading States**: Implement skeleton loaders or spinners for data fetching.
-   **Error Handling**: Display user-friendly error messages from API responses or client-side issues using `Alert` components and `toast` notifications.
-   **User Feedback**: Provide clear feedback for actions (e.g., "Configuration saved successfully").
-   **Accessibility**: Follow accessibility best practices.

## 14. Iteration and Testing

-   Implement features incrementally, sub-section by sub-section.
-   Conduct thorough testing for each feature:
    -   UI interactions.
    -   API integrations (request/response handling, query params).
    -   Form validations based on API requirements.
    -   Permission checks.
    -   Edge cases. 