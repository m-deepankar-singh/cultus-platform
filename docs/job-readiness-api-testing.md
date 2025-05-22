# Job Readiness API Testing Guide

This document provides instructions for testing the Job Readiness API endpoints using Postman.

## Prerequisites

1. The Job Readiness database schema has been set up
2. The API endpoints have been implemented
3. Postman is installed on your machine
4. The Next.js development server is running (`npm run dev`)

## Setting Up Postman

### 1. Configure Environment Variables

Create a new Environment in Postman with the following variables:

- `base_url`: Set to `http://localhost:3000` (or your deployed URL)
- `access_token`: Leave this empty initially

### 2. Create a Login Request

Create a POST request to get an authentication token:

- URL: `{{base_url}}/api/auth/api/login`
- Method: POST
- Body (raw, JSON):
  ```json
  {
    "email": "your-test-user@example.com",
    "password": "your-password"
  }
  ```
- In the Tests tab, add:
  ```javascript
  var jsonData = JSON.parse(responseBody);
  pm.environment.set("access_token", jsonData.access_token);
  ```

Run this request to authenticate and set the token.

### 3. Create a Collection

Create a new Collection for the Job Readiness API tests. In the Collection's Authorization tab:

- Type: `Bearer Token`
- Token: `{{access_token}}`

This sets up authentication for all requests in the collection.

## Test Sequence

The following test sequence follows the natural progression of the Job Readiness product:

### 1. Test Module Access Status

First, check the current status of module access to verify the starting point:

- URL: `{{base_url}}/api/app/job-readiness/test/module-access?moduleType=assessment`
- Method: GET

Also check other module types to verify they're locked or unlocked as expected:
- `moduleType=course`
- `moduleType=expert_session`
- `moduleType=project`
- `moduleType=interview`

### 2. Admin Overrides

Test the admin endpoint to manually set a student's star level and tier:

- URL: `{{base_url}}/api/admin/job-readiness/students/:studentId/override-progress`
- Method: PATCH
- Body (raw, JSON):
  ```json
  {
    "job_readiness_star_level": "THREE",
    "job_readiness_tier": "SILVER",
    "override_reason": "Testing the promotion exam flow"
  }
  ```

### 3. Promotion Exam Flow

#### 3.1. Check Eligibility

- URL: `{{base_url}}/api/app/job-readiness/promotion-exam/eligibility?productId=YOUR_PRODUCT_ID`
- Method: GET

Expected response to show `is_eligible: true`

#### 3.2. Start Exam

- URL: `{{base_url}}/api/app/job-readiness/promotion-exam/start`
- Method: POST
- Body (raw, JSON):
  ```json
  {
    "product_id": "YOUR_PRODUCT_ID"
  }
  ```

This will return an `exam_id` and questions. Save the `exam_id` for the next step.

#### 3.3. Submit Exam

- URL: `{{base_url}}/api/app/job-readiness/promotion-exam/submit`
- Method: POST
- Body (raw, JSON):
  ```json
  {
    "exam_id": "EXAM_ID_FROM_PREVIOUS_RESPONSE",
    "answers": [
      { "question_id": "q-1", "selected_option": "a" },
      { "question_id": "q-2", "selected_option": "b" },
      // Add answers for all questions...
    ]
  }
  ```

### 4. Verify Module Access After Updates

After running the admin override or completing the promotion exam, check module access again to verify the changes:

- URL: `{{base_url}}/api/app/job-readiness/test/module-access?moduleType=project`
- Method: GET

The response should show `has_access: true` if your updates unlocked the module.

## Test Cases for Error Handling

### 1. Authentication Errors

Remove the Bearer token and attempt to access protected endpoints.

### 2. Authorization Errors

Test that admin endpoints reject requests from non-admin users.

### 3. Invalid Inputs

Test with:
- Invalid module types
- Invalid star levels
- Invalid tiers
- Missing required fields

### 4. Progression Logic Errors

Test that:
- Students can't access modules beyond their current star level
- Promotion exam can't be taken again after passing
- GOLD tier students can't take promotion exams

## Exporting Postman Collection

Once you've set up all your tests, you can export the Postman Collection to share with others:

1. Click on the Collection's more actions (⋮)
2. Select "Export"
3. Choose the collection format (v2.1 recommended)
4. Save the file and share it with your team

## Troubleshooting

If you encounter issues during testing:

1. **Authentication Issues**: Make sure your login request is working and the token is being set correctly
2. **404 Errors**: Verify the API endpoints have been implemented and the server is running
3. **Database Issues**: Check that your database schema includes all the required tables
4. **Permission Errors**: Verify your test user has the correct roles assigned 