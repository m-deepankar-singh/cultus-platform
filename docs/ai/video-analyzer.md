# Video Analyzer for Job Readiness Interviews

This document provides technical details about the Video Analyzer service for the Job Readiness product, which handles student interview recording, submission, and AI-powered analysis.

## Architecture Overview

The Video Analyzer system consists of these main components:

1. **Frontend Recording Component**: Captures webcam videos of student interviews.
2. **Video Submission API**: Handles video uploads and storage.
3. **Video Analysis Service**: Processes videos using Google Gemini 2.5 Flash.
4. **Results Retrieval API**: Provides analysis results to the frontend.

## Database Schema

### Tables

- **job_readiness_ai_interview_submissions**
  - Primary storage for interview submissions and analysis results
  - Stores video paths, submission metadata, and analysis outcomes
  - Contains status tracking (pending, completed, failed)

### Storage

- **interview_recordings** bucket in Supabase Storage
  - Secured with appropriate RLS policies
  - Videos stored with format: `interviews/{userId}_{submissionId}.webm`

## API Endpoints

### 1. Submit Interview Recording

- **Endpoint**: `POST /api/app/job-readiness/interviews/submit`
- **Purpose**: Upload interview recording video and create submission record
- **Authentication**: Required
- **Request Format**:
  ```
  multipart/form-data with:
  - video: WebM file (max 20MB)
  - interviewQuestionsId: UUID of cached questions
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Interview submission received and queued for analysis",
    "submissionId": "uuid-of-submission"
  }
  ```

### 2. Retrieve Analysis Results

- **Endpoint**: `GET /api/app/job-readiness/interviews/analysis/[submissionId]`
- **Purpose**: Get analysis results for a submitted interview
- **Authentication**: Required (must be submission owner)
- **Response**: Varies based on status:
  ```json
  {
    "id": "uuid-of-submission",
    "status": "completed|pending_analysis|analysis_failed|pending_manual_review",
    "createdAt": "2025-05-30T12:00:00Z",
    
    // For completed analysis:
    "analysis": {
      "overall_feedback": "Detailed feedback text...",
      "status": "Approved|Rejected",
      "reasoning": "Explanation for the decision..."
    },
    "analyzedAt": "2025-05-30T12:10:00Z",
    
    // For other statuses:
    "message": "Status-specific message..."
  }
  ```

## AI Analysis Process

1. **Video Preparation**:
   - Student records their response to interview questions
   - Video is uploaded to Supabase Storage
   - A record is created in the database with `status: 'pending_analysis'`

2. **Asynchronous Processing**:
   - The `analyzeInterviewVideo` function is triggered without awaiting completion
   - This prevents API timeout issues for longer videos

3. **AI Analysis**:
   - Generates a signed URL for the video
   - Fetches associated interview questions and grading criteria
   - Uses Gemini 2.5 Flash's video understanding capabilities
   - Provides structured output with feedback and decision

4. **Results Storage**:
   - Analysis results are stored in the `analysis_result` JSONB field
   - Status updated to `'completed'` or `'analysis_failed'`
   - For `'Approved'` interviews, student tier promotion logic may be triggered

## Error Handling & Fallbacks

- **Fallback Mechanism**:
  - If AI analysis fails, status becomes `'analysis_failed'` or `'pending_manual_review'`
  - Fallback analysis provides a generic message for display to the student

- **Manual Review**:
  - Failed analyses can be manually reviewed by administrators
  - Admin interface allows overriding the AI decision

## Security Considerations

- **RLS Policies**:
  - Students can only view their own submissions
  - Storage policies restrict access to the student's own recordings
  - Updates to analysis results restricted to service role

- **Data Protection**:
  - Interview videos are stored in a private bucket
  - Signed URLs are short-lived (1 hour)

## Testing & Development

A test script is provided at `scripts/test-video-analyzer.ts` to help with:
- Checking submission details
- Manually triggering analysis
- Viewing analysis results

Example usage:
```
npx ts-node scripts/test-video-analyzer.ts <submissionId>
``` 