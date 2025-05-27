# Job Readiness API Documentation - Cultus Platform

## Overview
This document contains all API routes for the Job Readiness module with actual URLs and request bodies using real data from the Cultus Supabase project.

**Base URL:** `https://your-domain.com` (Replace with your actual domain)
**Supabase Project:** Cultus (`meizvwwhasispvfbprck`)
**Test Student:** deepankar@test.com

---

## Authentication
All endpoints require admin authentication. Include appropriate authentication headers (JWT token, session cookies, or API key) in your requests.

---

## 1. Progress Routes

### Get Student Progress
**Endpoint:** `GET /api/admin/job-readiness/progress`

**URL:** `https://your-domain.com/api/admin/job-readiness/progress`

**Description:** View student progress across Job Readiness products based on client product assignments. Only shows students whose clients have been assigned Job Readiness products. Progress tracking is tied to the client-product assignment relationship.

**Query Parameters (all optional):**
- `productId` - Filter by product ID (e.g., `69999207-4a61-4261-b47d-5ae463a23c56`)
- `clientId` - Filter by client ID (e.g., `413babb5-94a1-4a3e-bd1e-dbd77e8bca63`)
- `page` - Page number for pagination (default: 1)
- `pageSize` - Number of results per page (default: 50)
- `search` - Search term for student names/emails (e.g., `deepankar`)

**Example URL with parameters:**
```
https://your-domain.com/api/admin/job-readiness/progress?productId=69999207-4a61-4261-b47d-5ae463a23c56&clientId=413babb5-94a1-4a3e-bd1e-dbd77e8bca63&page=1&pageSize=50&search=deepankar
```

**Request Body:** None

**Response Example:**
```json
{
  "students": [
    {
      "id": "a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8",
      "student_id": "a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8",
      "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
      "job_readiness_star_level": "FOUR",
      "job_readiness_tier": "BRONZE",
      "job_readiness_background_type": "COMPUTER_SCIENCE",
      "job_readiness_last_updated": "2025-05-22T15:11:50.252306+00:00",
      "job_readiness_promotion_eligible": false,
      "created_at": null,
      "updated_at": "2025-05-22T15:11:50.252306+00:00",
      "student": {
        "id": "a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8",
        "first_name": "Deepankar",
        "last_name": "Singh",
        "email": "deepankar@test.com"
      },
      "product": {
        "id": "c34ab292-8966-40a2-990f-e8957b833db9",
        "name": "Job Readiness Program",
        "description": "Comprehensive job readiness program with 5-star progression system"
      },
      "module_progress": {
        "total_modules": 0,
        "completed_modules": 0,
        "completion_percentage": 0
      },
      "client": {
        "id": "738bc518-aa37-4ed4-8db6-2cca5f327329",
        "name": "New Test University Update"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalCount": 3,
    "totalPages": 1
  }
}
```

---

### Export Progress Data
**Endpoint:** `GET /api/admin/job-readiness/progress/export`

**URL:** `https://your-domain.com/api/admin/job-readiness/progress/export`

**Description:** Export detailed progress data (Note: Currently returns JSON, file export to be implemented).

**Query Parameters (all optional):**
- `productId` - Filter by product ID (e.g., `69999207-4a61-4261-b47d-5ae463a23c56`)
- `clientId` - Filter by client ID (e.g., `413babb5-94a1-4a3e-bd1e-dbd77e8bca63`)
- `format` - Export format: `csv` or `xlsx` (default: csv)

**Example URL:**
```
https://your-domain.com/api/admin/job-readiness/progress/export?productId=69999207-4a61-4261-b47d-5ae463a23c56&format=csv
```

**Request Body:** None

---

## 2. Expert Sessions Routes

### Get Expert Sessions
**Endpoint:** `GET /api/admin/job-readiness/expert-sessions`

**URL:** `https://your-domain.com/api/admin/job-readiness/expert-sessions`

**Description:** Placeholder for expert sessions configuration.

**Request Body:** None

**Status:** Not implemented (returns placeholder message)

---

### Create Expert Session
**Endpoint:** `POST /api/admin/job-readiness/expert-sessions`

**URL:** `https://your-domain.com/api/admin/job-readiness/expert-sessions`

**Description:** Placeholder for creating expert sessions configuration.

**Request Body:** None

**Status:** Not implemented (returns 501 status)

---

## 3. Promotion Exams Routes

### Get Promotion Exam Configurations
**Endpoint:** `GET /api/admin/job-readiness/promotion-exams`

**URL:** `https://your-domain.com/api/admin/job-readiness/promotion-exams`

**Description:** Get all promotion exam configurations with product details.

**Request Body:** None

**Response Example:**
```json
{
    "examConfigs": [
        {
            "id": "3bca8e3c-4f4d-4966-a633-b6286558a314",
            "product_id": "69999207-4a61-4261-b47d-5ae463a23c56",
            "is_enabled": true,
            "question_count": 25,
            "pass_threshold": 70,
            "created_at": "2025-05-19T14:46:35.701925+00:00",
            "updated_at": "2025-05-19T14:46:35.701925+00:00",
            "system_prompt": "You are an expert evaluator assessing candidates for promotion in their full stack development career path. Focus on both theoretical knowledge and practical implementation skills.",
            "time_limit_minutes": 60,
            "products": {
                "id": "69999207-4a61-4261-b47d-5ae463a23c56",
                "name": "Full Stack Development Career Path"
            }
        }
    ]
}
```

---

### Create Promotion Exam Configuration
**Endpoint:** `POST /api/admin/job-readiness/promotion-exams`

**URL:** `https://your-domain.com/api/admin/job-readiness/promotion-exams`

**Description:** Create a new promotion exam configuration for a product.

**Request Body:**
```json
{
  "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
  "is_enabled": true,
  "question_count": 30,
  "pass_threshold": 75,
  "time_limit_minutes": 90,
  "system_prompt": "You are an expert evaluator assessing candidates for promotion in their software engineering career path. Focus on advanced technical skills and leadership capabilities."
}
```

**Field Descriptions:**
- `product_id` (required) - UUID of the job readiness product
- `is_enabled` (optional) - Boolean, defaults to true
- `question_count` (optional) - Number, defaults to 25
- `pass_threshold` (optional) - Number (percentage), defaults to 70
- `time_limit_minutes` (optional) - Number, defaults to 60
- `system_prompt` (optional) - String for AI evaluation context

**Response Example:**
```json
{
    "examConfig": {
        "id": "a3734024-c3de-4bf8-81ca-89c44ec86f77",
        "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
        "is_enabled": true,
        "question_count": 30,
        "pass_threshold": 75,
        "created_at": "2025-05-26T10:02:13.493538+00:00",
        "updated_at": "2025-05-26T10:02:13.493538+00:00",
        "system_prompt": "You are an expert evaluator assessing candidates for promotion in their software engineering career path. Focus on advanced technical skills and leadership capabilities.",
        "time_limit_minutes": 90
    }
}
```

---

### Update Promotion Exam Configuration
**Endpoint:** `PATCH /api/admin/job-readiness/promotion-exams`

**URL:** `https://your-domain.com/api/admin/job-readiness/promotion-exams`

**Description:** Update an existing promotion exam configuration.

**Request Body:**
```json
{
  "id": "3bca8e3c-4f4d-4966-a633-b6286558a314",
  "is_enabled": false,
  "question_count": 20,
  "pass_threshold": 80,
  "time_limit_minutes": 45,
  "system_prompt": "Updated system prompt for evaluation criteria."
}
```

**Field Descriptions:**
- `id` (required) - UUID of the configuration to update
- All other fields are optional and will only update if provided

**Response Example:**
```json
{
    "success": true
}
```

---

### Delete Promotion Exam Configuration
**Endpoint:** `DELETE /api/admin/job-readiness/promotion-exams`

**URL:** `https://your-domain.com/api/admin/job-readiness/promotion-exams?id=3bca8e3c-4f4d-4966-a633-b6286558a314`

**Description:** Delete a promotion exam configuration.

**Query Parameters:**
- `id` (required) - UUID of the configuration to delete

**Request Body:** None

---

## 4. Background Project Types Routes

### Get Background Project Types
**Endpoint:** `GET /api/admin/job-readiness/backgrounds`

**URL:** `https://your-domain.com/api/admin/job-readiness/backgrounds`

**Description:** Get all background types and their project mappings.

**Request Body:** None

**Response Example:**
```json
{
    "backgrounds": [
        {
            "id": "3c70cd51-4169-45a4-9e72-620877ca2d2e",
            "background_type": "COMPUTER_SCIENCE",
            "project_type": "CODING_PROJECT",
            "project_description_template": "A coding project to demonstrate your programming skills and problem-solving abilities.",
            "grading_criteria": [
                {
                    "weight": 40,
                    "criterion": "Code Quality"
                },
                {
                    "weight": 30,
                    "criterion": "Functionality"
                },
                {
                    "weight": 30,
                    "criterion": "Documentation"
                }
            ],
            "bronze_system_prompt": "You are a project creator for computer scientists. Create a beginner-level project.",
            "bronze_input_prompt": "Create a beginner-level software development project that focuses on fundamental programming concepts and simple application development.",
            "silver_system_prompt": "You are a project creator for computer scientists. Create an intermediate-level project.",
            "silver_input_prompt": "Design an intermediate-level software project that incorporates multiple technologies and demonstrates understanding of software architecture.",
            "gold_system_prompt": "You are a project creator for computer scientists. Create an advanced-level project.",
            "gold_input_prompt": "Develop an advanced software engineering project that showcases complex problem-solving, scalability considerations, and best practices in software development.",
            "created_at": "2025-05-22T11:11:27.276221+00:00",
            "updated_at": "2025-05-22T11:11:27.276221+00:00"
        }
    ]
}
```

---

### Create Background Project Type
**Endpoint:** `POST /api/admin/job-readiness/backgrounds`

**URL:** `https://your-domain.com/api/admin/job-readiness/backgrounds`

**Description:** Create a new background type with project mapping.

**Request Body:**
```json
{
  "background_type": "DATA_SCIENCE",
  "project_type": "DATA_ANALYSIS",
  "project_description_template": "A data analysis project to demonstrate your analytical skills and data visualization abilities.",
  "grading_criteria": [
    {"weight": 35, "criterion": "Data Quality & Cleaning"},
    {"weight": 30, "criterion": "Analysis Depth"},
    {"weight": 25, "criterion": "Visualization"},
    {"weight": 10, "criterion": "Documentation"}
  ],
  "bronze_system_prompt": "You are a project creator for data scientists. Create a beginner-level analysis project.",
  "bronze_input_prompt": "Create a beginner-level data analysis project focusing on basic statistics and simple visualizations.",
  "silver_system_prompt": "You are a project creator for data scientists. Create an intermediate-level analysis project.",
  "silver_input_prompt": "Design an intermediate data analysis project incorporating machine learning and advanced visualizations.",
  "gold_system_prompt": "You are a project creator for data scientists. Create an advanced-level analysis project.",
  "gold_input_prompt": "Develop an advanced data science project with complex modeling and business insights."
}
```

**Available Background Types:**
- `ECONOMICS`
- `COMPUTER_SCIENCE`
- `MARKETING`
- `DESIGN`
- `HUMANITIES`
- `BUSINESS_ADMINISTRATION`
- `DATA_SCIENCE`
- `ENGINEERING`
- `HEALTHCARE`
- `OTHER`

**Available Project Types:**
- `CASE_STUDY`
- `CODING_PROJECT`
- `MARKETING_PLAN`
- `DESIGN_CONCEPT`
- `RESEARCH_OUTLINE`
- `DATA_ANALYSIS`
- `BUSINESS_PROPOSAL`
- `CONTENT_CREATION`
- `TECHNICAL_DOCUMENTATION`
- `OTHER`

**Response Example:**
```json
{
    "background": {
        "id": "6af51bdc-ad58-41ec-b157-c59d99b0ed5d",
        "background_type": "DATA_SCIENCE",
        "project_type": "DATA_ANALYSIS",
        "project_description_template": "A data analysis project to demonstrate your analytical skills and data visualization abilities.",
        "grading_criteria": [
            {
                "weight": 35,
                "criterion": "Data Quality & Cleaning"
            },
            {
                "weight": 30,
                "criterion": "Analysis Depth"
            },
            {
                "weight": 25,
                "criterion": "Visualization"
            },
            {
                "weight": 10,
                "criterion": "Documentation"
            }
        ],
        "bronze_system_prompt": "You are a project creator for data scientists. Create a beginner-level analysis project.",
        "bronze_input_prompt": "Create a beginner-level data analysis project focusing on basic statistics and simple visualizations.",
        "silver_system_prompt": "You are a project creator for data scientists. Create an intermediate-level analysis project.",
        "silver_input_prompt": "Design an intermediate data analysis project incorporating machine learning and advanced visualizations.",
        "gold_system_prompt": "You are a project creator for data scientists. Create an advanced-level analysis project.",
        "gold_input_prompt": "Develop an advanced data science project with complex modeling and business insights.",
        "created_at": "2025-05-26T10:07:53.571846+00:00",
        "updated_at": "2025-05-26T10:07:53.571846+00:00"
    }
}
```

---

### Update Background Project Type
**Endpoint:** `PATCH /api/admin/job-readiness/backgrounds`

**URL:** `https://your-domain.com/api/admin/job-readiness/backgrounds`

**Description:** Update an existing background type with project mapping.

**Request Body:**
```json
{
  "id": "3c70cd51-4169-45a4-9e72-620877ca2d2e",
  "background_type": "COMPUTER_SCIENCE",
  "project_type": "CODING_PROJECT",
  "project_description_template": "An updated coding project to demonstrate advanced programming skills and system design abilities.",
  "grading_criteria": [
    {"weight": 30, "criterion": "Code Quality"},
    {"weight": 25, "criterion": "Functionality"},
    {"weight": 25, "criterion": "System Design"},
    {"weight": 20, "criterion": "Documentation"}
  ],
  "gold_system_prompt": "Updated advanced prompt for complex software engineering projects."
}
```

---

### Delete Background Project Type
**Endpoint:** `DELETE /api/admin/job-readiness/backgrounds`

**URL:** `https://your-domain.com/api/admin/job-readiness/backgrounds?id=3c70cd51-4169-45a4-9e72-620877ca2d2e`

**Description:** Delete a background type with project mapping.

**Query Parameters:**
- `id` (required) - UUID of the background project type to delete

**Request Body:** None

---

## 5. Products Routes

### Get Job Readiness Products
**Endpoint:** `GET /api/admin/job-readiness/products`

**URL:** `https://your-domain.com/api/admin/job-readiness/products`

**Description:** Get all Job Readiness products with their configurations.

**Request Body:** None

**Response Example:**
```json
{
    "products": [
        {
            "id": "69999207-4a61-4261-b47d-5ae463a23c56",
            "name": "Full Stack Development Career Path",
            "description": "Comprehensive job readiness program for full stack developers with tier-based progression",
            "type": "JOB_READINESS",
            "job_readiness_products": [
                {
                    "id": "ab8b2f9f-15d5-4220-926f-c3444a5f633d",
                    "created_at": "2025-05-19T14:38:28.642286+00:00",
                    "product_id": "69999207-4a61-4261-b47d-5ae463a23c56",
                    "updated_at": "2025-05-19T14:38:28.642286+00:00",
                    "gold_assessment_max_score": 100,
                    "gold_assessment_min_score": 81,
                    "bronze_assessment_max_score": 60,
                    "bronze_assessment_min_score": 0,
                    "silver_assessment_max_score": 80,
                    "silver_assessment_min_score": 61
                }
            ]
        },
        {
            "id": "c34ab292-8966-40a2-990f-e8957b833db9",
            "name": "Job Readiness Program",
            "description": "Comprehensive job readiness program with 5-star progression system",
            "type": "JOB_READINESS",
            "job_readiness_products": [
                {
                    "id": "0e8953e1-c0fe-4d2f-b6ef-eb735cec59e2",
                    "created_at": "2025-05-19T18:09:28.344522+00:00",
                    "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
                    "updated_at": "2025-05-19T18:09:28.344522+00:00",
                    "gold_assessment_max_score": 100,
                    "gold_assessment_min_score": 81,
                    "bronze_assessment_max_score": 60,
                    "bronze_assessment_min_score": 0,
                    "silver_assessment_max_score": 80,
                    "silver_assessment_min_score": 61
                }
            ]
        },
        {
            "id": "b812b74e-4698-444f-ba1d-bd413fc6d30d",
            "name": "AI Quiz Test Course",
            "description": "A course to demonstrate AI-generated quizzes",
            "type": "JOB_READINESS",
            "job_readiness_products": [
                {
                    "id": "5d1baae7-84d7-4d72-a6fe-488a39eb68fd",
                    "created_at": "2025-05-20T16:29:32.398527+00:00",
                    "product_id": "b812b74e-4698-444f-ba1d-bd413fc6d30d",
                    "updated_at": "2025-05-20T16:29:32.398527+00:00",
                    "gold_assessment_max_score": 100,
                    "gold_assessment_min_score": 86,
                    "bronze_assessment_max_score": 60,
                    "bronze_assessment_min_score": 0,
                    "silver_assessment_max_score": 85,
                    "silver_assessment_min_score": 61
                }
            ]
        }
    ]
}
```

---

### Create Job Readiness Product
**Endpoint:** `POST /api/admin/job-readiness/products`

**URL:** `https://your-domain.com/api/admin/job-readiness/products`

**Description:** Create a new Job Readiness product with assessment score ranges.

**Request Body:**
```json
{
  "name": "Advanced Job Readiness Program",
  "description": "A comprehensive job readiness program for senior-level positions",
  "configuration": {
    "bronze_assessment_min_score": 0,
    "bronze_assessment_max_score": 65,
    "silver_assessment_min_score": 66,
    "silver_assessment_max_score": 85,
    "gold_assessment_min_score": 86,
    "gold_assessment_max_score": 100
  }
}
```

**Field Descriptions:**
- `name` (required) - Product name
- `description` (optional) - Product description
- `configuration` (required) - Assessment score ranges for all tiers
  - All score range fields are required numbers (0-100)

---

### Update Job Readiness Product
**Endpoint:** `PATCH /api/admin/job-readiness/products`

**URL:** `https://your-domain.com/api/admin/job-readiness/products`

**Description:** Update an existing Job Readiness product.

**Request Body:**
```json
{
  "id": "69999207-4a61-4261-b47d-5ae463a23c56",
  "name": "Updated Job Readiness Program",
  "description": "An updated comprehensive job readiness program",
  "configuration": {
    "bronze_assessment_min_score": 0,
    "bronze_assessment_max_score": 70,
    "silver_assessment_min_score": 71,
    "silver_assessment_max_score": 85,
    "gold_assessment_min_score": 86,
    "gold_assessment_max_score": 100
  }
}
```

**Field Descriptions:**
- `id` (required) - UUID of the product to update
- All other fields are optional

---

### Delete Job Readiness Product
**Endpoint:** `DELETE /api/admin/job-readiness/products`

**URL:** `https://your-domain.com/api/admin/job-readiness/products?id=c34ab292-8966-40a2-990f-e8957b833db9`

**Description:** Delete a Job Readiness product.

**Query Parameters:**
- `id` (required) - UUID of the product to delete

**Request Body:** None

---

## 6. Interview Manual Review Route

### Manual Review Interview Submission
**Endpoint:** `PATCH /api/admin/job-readiness/interviews/[submissionId]/manual-review`

**URL:** `https://your-domain.com/api/admin/job-readiness/interviews/12345678-1234-5678-9abc-123456789abc/manual-review`

**Description:** Manually approve or reject an interview submission by admin.

**URL Parameters:**
- `submissionId` (required) - UUID of the interview submission

**Request Body for Approval:**
```json
{
  "status": "Approved",
  "admin_feedback": "Excellent performance in the interview. The candidate demonstrated strong technical skills and clear communication. Recommended for promotion to the next tier."
}
```

**Request Body for Rejection:**
```json
{
  "status": "Rejected",
  "admin_feedback": "The interview submission needs improvement in technical depth and communication clarity. Please review the feedback and resubmit after addressing the mentioned areas."
}
```

**Field Descriptions:**
- `status` (required) - Either "Approved" or "Rejected"
- `admin_feedback` (required) - Minimum 1 character feedback message

**Response:** Returns success message and updates student tier if approved.

---

## Real Data References

### Actual Product IDs (from your database):
- `69999207-4a61-4261-b47d-5ae463a23c56` - Job Readiness Product 1
- `c34ab292-8966-40a2-990f-e8957b833db9` - Job Readiness Product 2

### Actual Client IDs:
- `413babb5-94a1-4a3e-bd1e-dbd77e8bca63` - Test University
- `f8c3de3d-1d35-4b77-9e0a-184a37321627` - Test University 2

### Actual Configuration IDs:
- Promotion Exam Config: `3bca8e3c-4f4d-4966-a633-b6286558a314`
- Background Project Type: `3c70cd51-4169-45a4-9e72-620877ca2d2e`

### Test Student:
- Email: `deepankar@test.com`
- Name: Use for testing student-related operations

---

## Postman Setup Instructions

1. **Environment Variables:**
   - Set `base_url` = `https://your-domain.com`
   - Set `supabase_url` = `https://db.meizvwwhasispvfbprck.supabase.co`

2. **Authentication:**
   - Add Authorization header with admin JWT token
   - Or include session cookies for authenticated requests

3. **Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

4. **Testing:**
   - Use the actual UUIDs provided above
   - Test with the deepankar@test.com student email
   - All endpoints require admin privileges

---

## Notes

- All routes are under `/api/admin/job-readiness/` and require admin authentication
- UUIDs in examples are real data from your Cultus Supabase database
- Expert sessions routes are placeholders and not fully implemented
- Progress export currently returns JSON (file export to be implemented)
- Interview manual review supports tier promotion for approved submissions

---

*Last Updated: December 2024*
*Project: Cultus Platform - Job Readiness Module* 