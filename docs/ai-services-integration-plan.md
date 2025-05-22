# AI Services Integration Plan (Job Readiness Product)

## Overview
This document provides a detailed step-by-step plan for implementing the AI service integrations required for the Job Readiness product, as outlined in section 2.3 of the main `job-readiness-implementation-plan.md`. Each service will be developed as a module within the `lib/ai/` directory.

**General Setup for all AI Services:**
- [x] Ensure `GOOGLE_API_KEY` is configured in `.env` and accessible by the backend.
  - Relevant Files: `.env`
- [x] Create a helper function or utility within `lib/ai/` for initializing and making calls to the Google Gemini API (e.g., `lib/ai/gemini-client.js`). This should handle API key authentication, request formatting, and basic error handling/logging for Gemini calls.
  - Relevant Files: `lib/ai/gemini-client.ts` (new)
  - [x] Added proper structured output support using responseMimeType and responseSchema
  - [x] Implemented detailed error logging for development environments

## 1. Quiz Generator (`lib/ai/quiz-generator.js`)
This service will generate quizzes from video content or topics for course lessons. AI-generated questions are ephemeral and generated fresh on each request; only scores and student answers are stored, not the AI question text itself in attempt logs.

- **Relevant Files/Tables:**
  - Service File: `lib/ai/quiz-generator.ts` (new)
  - Content API Route: `app/api/app/job-readiness/courses/[moduleId]/content/route.ts`
  - Submission API Route: `app/api/app/job-readiness/courses/[moduleId]/lessons/[lessonId]/submit-quiz/route.ts`
  - Config Tables: `modules` (for `configuration`), `lessons` (for `quiz_data`, `quiz_generation_prompt`), `job_readiness_course_quiz_templates`
  - Fallback Tables: `lesson_question_bank_mappings`, `assessment_questions`
  - Attempt Storage: `job_readiness_course_quiz_attempts` (stores scores and student answers, but not AI-generated questions)

- **1.1. Setup & Configuration:**
  - [x] Create `lib/ai/quiz-generator.ts`.
  - [x] Import necessary Supabase client and Gemini API client/helper.
- **1.2. Core Function `generateQuizForLesson(lessonId, moduleId, studentTier, isDeterministicAttempt = false)`:**
  - [x] **Input:** `lessonId`, `moduleId`, `studentTier`, `isDeterministicAttempt` (flag, true if called by submit-quiz).
  - [x] **Step 1: Fetch Lesson and Module Configuration:** (from `lessons`, `modules` tables)
    - [x] Retrieve lesson details (importantly `quiz_data.quiz_generation_prompt` or topic).
    - [x] Retrieve module details (importantly `configuration` for AI quiz settings).
    - [x] If AI quizzes not enabled, return `null`.
  - [x] **Step 2: Determine Quiz Prompt:** (Based on module/lesson config, student tier)
    - [x] Construct the exact same prompt that would be used by both content and submission calls.
  - [x] **Step 3: Call Gemini API:**
    - [x] Construct detailed prompt for structured JSON output (e.g., `[{id: string, question_text: string, options: [{id: string, text: string}], correct_option_id: string, question_type: 'MCQ'|'MSQ'}]`).
    - [x] Use few-shot examples in the prompt for desired JSON structure.
    - [x] **Set `temperature = 0` for deterministic attempts** to ensure the AI generates the *exact same* questions if called by the submit-quiz endpoint.
    - [x] **Set `temperature = 0.5` for initial display** to add controlled randomness when questions are first presented to the user.
    - [x] Specify `module.configuration.ai_quiz_question_count`.
  - [x] **Step 4: Process and Validate AI Response:**
    - [x] Parse JSON. Validate structure (e.g., using Zod). If fails, log and prepare to return `null` (caller will handle fallback).
  - [x] **Step 5: Return Generated Questions:**
    - [x] If successful, return the array of validated quiz questions (including `correct_option_id`).
- **1.3. Integration with Course Content Endpoint (`app/api/app/job-readiness/courses/[moduleId]/content/route.ts`):**
  - [x] On every request for a lesson with an AI quiz, this endpoint will call `lib/ai/quiz-generator.js#generateQuizForLesson` (with `isDeterministicAttempt = false`).
  - [x] If AI generation fails or returns `null`, it will attempt to fetch fallback questions from `lesson_question_bank_mappings`.
  - [x] It will then send **only the question text and options** (stripping `correct_option_id` and other answer-revealing info) to the client.
  - [x] **Caching Improved:** Cache keys now include a time component that changes every 10 minutes to ensure different questions are generated periodically.
  - [x] Updated `QuizQuestionClient` interface to include `question_type` field for proper client-side handling of MCQ vs MSQ questions.
- **1.4. Integration with Quiz Submission Endpoint (`app/api/app/job-readiness/courses/[moduleId]/lessons/[lessonId]/submit-quiz/route.ts`):**
  - [x] When a student submits answers, this endpoint is responsible for getting the authoritative questions (with correct answers) for grading.
  - [x] **Step 1: Determine Question Source:** Based on lesson config, is it an AI quiz or a fallback quiz?
  - [x] **Step 2a (AI Quiz Grading):**
    - [x] Call `lib/ai/quiz-generator.js#generateQuizForLesson` *again* using the identical parameters (lessonId, moduleId, studentTier, and derived prompt; `isDeterministicAttempt = true`).
    - [x] This relies on the `temperature=0` setting in the Gemini call within `generateQuizForLesson` to reproduce the *exact same questions and answers* that were originally generated when the student loaded the content.
    - [x] If this re-generation fails or returns `null` (e.g., AI error), the submission cannot be reliably graded against AI questions. Log this critical error. Consider how to handle this (e.g., error to user, or attempt fallback if appropriate).
  - [x] **Step 2b (Fallback Quiz Grading):**
    - [x] Fetch questions from `lesson_question_bank_mappings` and `assessment_questions` (current logic).
  - [x] **Step 3: Grade Submission:** Compare student's answers against the questions obtained in Step 2a/2b.
    - [x] Enhanced to support both MCQ (single answer) and MSQ (multiple answer) question types.
    - [x] Updated validation schema to properly accept both `selected_option_id` (for MCQ) and `selected_option_ids` array (for MSQ).
    - [x] Implemented proper scoring for MSQ questions that require all correct options to be selected.
  - [x] **Step 4: Store Attempt:** Save score, student's selected answers, passed status, tier used, etc., in `job_readiness_course_quiz_attempts`. The actual AI-generated question texts are **not** stored here.
  - [x] **Response Enhancement:** Now includes `question_type` and `correct_option_ids` array for MSQ questions in the response.
- **1.5. Fallback Mechanism:**
  - [x] The logic for falling back to `lesson_question_bank_mappings` remains in both the content and submit-quiz endpoints if `generateQuizForLesson` fails or indicates AI is not to be used.
- **1.6. Monitoring & Logging:**
  - [x] Log successes, AI errors, validation failures. Crucially log if deterministic re-generation in submit-quiz fails for AI quizzes.

## 2. Project Generator (`lib/ai/project-generator.ts`)
This service will generate real-world project descriptions based on student background and tier.

- **Relevant Files/Tables:**
  - Service File: `lib/ai/project-generator.ts` (new)
  - Calling API Route: `app/api/app/job-readiness/projects/generate/route.ts` (new)
  - Config Tables: `students` (for background, tier), `job_readiness_background_project_types` (for prompts)
  - Fallback Table: `job_readiness_fallback_projects` (new, or extend `job_readiness_background_project_types`)

- **2.1. Setup & Configuration:**
  - [x] Create `lib/ai/project-generator.ts`.
- **2.2. Core Function `generateProject(studentId, productId)`:**
  - [x] **Input:** `studentId`, `productId`.
  - [x] **Step 1: Fetch Student and Product Details:**
    - [x] Get `student.job_readiness_background_type`, `student.job_readiness_tier`. (from `students` table)
  - [x] **Step 2: Fetch Project Configuration:**
    - [x] Query `job_readiness_background_project_types` using background type.
    - [x] Select prompts based on tier. If no config, log error, prepare for fallback.
  - [x] **Step 3: Call Gemini API:**
    - [x] Use fetched prompts. Specify output (JSON: `title`, `description`, `tasks`, `deliverables`, `submission_type`).
  - [x] **Step 4: Process and Validate AI Response:**
    - [x] Parse/validate. If fails, log, proceed to fallback.
  - [x] **Step 5: Return Generated Project Details:**
    - [x] If successful, return project details.
- **2.3. Integration with Project Generation Endpoint:**
  - [x] `app/api/app/job-readiness/projects/generate/route.ts` calls this service.
  - [x] **Updated Caching Strategy:** 
    - [x] Unlike the previous implementation, projects will now be generated freshly on each request.
    - [x] Projects should NOT be cached until the student submits an answer.
    - [x] Only when a project is submitted, both the project details and student answer are stored in the database.
    - [x] After a project is answered and stored, the student should no longer be able to generate new projects.
    - [x] The `job_readiness_ai_project_submissions` table will store final submissions, not drafts.
- **2.4. Fallback Mechanism:**
  - [x] **Step 1: Design Fallback Project Storage:**
    - [x] New table `job_readiness_fallback_projects` or use JSONB in `job_readiness_background_project_types`.
    - [x] Structure: `background_type`, `tier`, `project_title`, etc.
  - [x] **Step 2: Implement Fallback Logic:**
    - [x] If AI fails, query fallback storage.
- **2.5. Logging:**
  - [x] Log successes, prompts used, errors, fallback activation.

## 3. Project Grader (`lib/ai/project-grader.ts`)
This service will grade submitted projects.

- **Relevant Files/Tables:**
  - Service File: `lib/ai/project-grader.ts` (new)
  - Calling API Route: `app/api/app/job-readiness/projects/submit/route.ts` 
  - Data Tables: `job_readiness_ai_project_submissions` (read submission, write grade), `job_readiness_background_project_types` (for grading criteria)

- **3.1. Setup & Configuration:**
  - [x] Create `lib/ai/project-grader.ts`.
- **3.2. Core Function `gradeProject(submission)`:**
  - [x] **Input:** `submission` with project and student details.
  - [x] **Step 1: Set Up Structured Output:**
    - [x] Define schema for the AI response with fields for score, summary, strengths, weaknesses, and improvements.
    - [x] Configure Gemini API call with structuredOutputSchema for consistent, well-formatted feedback.
  - [x] **Step 2: Handle Submission Type:**
    - [x] If 'text_input': use `submission_content`.
    - [x] If 'github_url': process the submission URL.
  - [x] **Step 3: Construct Grading Prompt for Gemini:**
    - [x] Provide comprehensive context with original project desc/reqs, student submission, background, and tier.
    - [x] Include detailed evaluation instructions for consistent grading.
  - [x] **Step 4: Call Gemini API and Process Response:**
    - [x] Make API call with temperature=0.2 for consistent grading.
    - [x] Parse/validate the response, ensuring the score is within bounds.
    - [x] Provide fallback grading in case of API failure.
  - [x] **Step 5: Return Grading Result:**
    - [x] Return complete grading with score, pass/fail status, and detailed feedback.
- **3.3. Integration with Project Submission Endpoint:**
  - [x] `app/api/app/job-readiness/projects/submit/route.ts` uses the grader service to evaluate submissions.
  - [x] Stores both the project details and AI-generated feedback in the database.
  - [x] Returns detailed feedback to the client with strengths, weaknesses, and improvement suggestions.
  - [x] Promotes students from star level THREE to FOUR upon successful project completion (score ≥ 80).
- **3.4. Fallback Mechanism:**
  - [x] Implemented `getFallbackGrading()` to provide generic positive feedback if AI grading fails.
- **3.5. Logging:**
  - [x] Log grading attempts, scores, feedback.

## 4. Interview Question Generator (`lib/ai/interview-question-generator.js`)
Generates interview questions based on student background and tier.

- **Relevant Files/Tables:**
  - Service File: `lib/ai/interview-question-generator.js` (new)
  - Calling API Route: `app/api/app/job-readiness/interviews/questions/route.ts` (new)
  - Config Tables: `students` (for background, tier), `job_readiness_background_interview_types` (for prompts, question quantity)
  - Fallback Table: `job_readiness_fallback_interview_questions` (new)

- **4.1. Setup & Configuration:**
  - [ ] Create `lib/ai/interview-question-generator.js`.
- **4.2. Core Function `generateInterviewQuestions(studentId, productId)`:**
  - [ ] **Input:** `studentId`, `productId`.
  - [ ] **Step 1: Fetch Student and Configuration:**
    - [ ] Get `student.job_readiness_background_type`, `student.job_readiness_tier`. (from `students` table)
    - [ ] Query `job_readiness_background_interview_types` for prompts and `question_quantity` based on background/tier.
  - [ ] **Step 2: Call Gemini API:**
    - [ ] Use fetched prompts. Desired output: JSON array of question strings.
  - [ ] **Step 3: Process and Validate Response:**
    - [ ] Parse/validate. If error, log, prepare fallback.
  - [ ] **Step 4: Return Questions:**
    - [ ] Return array of questions.
- **4.3. Integration with Interview Questions Endpoint:**
  - [ ] `app/api/app/job-readiness/interviews/questions/route.ts` calls this service.
  - [ ] **Caching:** Similar to projects, once interview questions are generated for a session, they should ideally be cached for that student's active attempt/viewing session to avoid confusion. Fresh on every single refresh of this specific page might be okay, but not between seeing questions and starting the recording.
- **4.4. Fallback Mechanism:**
  - [ ] **Step 1: Design Fallback Storage:**
    - [ ] New table `job_readiness_fallback_interview_questions` (`background_type`, `tier`, `question_text`).
  - [ ] **Step 2: Implement Fallback Logic:**
    - [ ] If AI fails, fetch from fallback table.
- **4.5. Logging:**
  - [ ] Log generation attempts, prompts used.

## 5. Video Analyzer (`lib/ai/video-analyzer.js`)
Analyzes recorded interview videos.

- **Relevant Files/Tables:**
  - Service File: `lib/ai/video-analyzer.js` (new)
  - Calling API Route: `app/api/app/job-readiness/interviews/submit/route.ts` 
  - Data Tables: `job_readiness_ai_interview_submissions` (read video path, write analysis), `students` (for background), `job_readiness_background_interview_types` (for grading criteria)

- **5.1. Setup & Configuration:**
  - [ ] Create `lib/ai/video-analyzer.js`.
  - [ ] **Research:** Google AI service for video analysis (Gemini 1.5 Pro or Google Cloud Video Intelligence API).
- **5.2. Core Function `analyzeInterviewVideo(submissionId)`:**
  - [ ] **Input:** `submissionId`.
  - [ ] **Step 1: Fetch Submission and Context:**
    - [ ] Get `video_storage_path` from `job_readiness_ai_interview_submissions`.
    - [ ] Get interview questions (should be stored/retrievable alongside the submission or linked).
    - [ ] Get `student.job_readiness_background_type` (from `students`) and `grading_criteria` (from `job_readiness_background_interview_types`).
  - [ ] **Step 2: Video Processing (if needed):**
    - [ ] Ensure `video_storage_path` is compatible with AI service.
    - [ ] **Transcription:** Transcribe audio. Crucial step.
  - [ ] **Step 3: Construct Analysis Prompt for AI:**
    - [ ] Provide AI: interview questions, transcribed responses, grading criteria.
    - [ ] Desired output: JSON with `overall_score`, `feedback_per_question`, `overall_feedback`, `passed`.
  - [ ] **Step 4: Call AI Service and Process Response:**
    - [ ] Parse/validate. Handle errors.
  - [ ] **Step 5: Update Submission Record:**
    - [ ] Store results in `job_readiness_ai_interview_submissions`.
- **5.3. Integration with Interview Submission Endpoint:**
  - [ ] `app/api/app/job-readiness/interviews/submit/route.ts` triggers this asynchronously after video is uploaded and submission entry is created.
- **5.4. Robustness:**
  - [ ] Implement retries, error logging, connection health checks.
- **5.5. Logging:**
  - [ ] Log analysis attempts, results.

## 6. Exam Generator (`lib/ai/exam-generator.js`)
Generates Promotion Exam questions.

- **Relevant Files/Tables:**
  - Service File: `lib/ai/exam-generator.js` (new)
  - Calling API Route: `app/api/app/job-readiness/promotion-exam/start/route.ts` (new)
  - Config Tables: `job_readiness_promotion_exam_config` (for `question_count`, etc.), `students` (for background, tier)
  - Fallback Table: (Consider `job_readiness_fallback_exam_questions` - new, if needed)

- **6.1. Setup & Configuration:**
  - [ ] Create `lib/ai/exam-generator.js`.
- **6.2. Core Function `generatePromotionExam(studentId, productId, targetTier)`:**
  - [ ] **Input:** `studentId`, `productId`, `targetTier`.
  - [ ] **Step 1: Fetch Configuration:**
    - [ ] Get config from `job_readiness_promotion_exam_config`.
    - [ ] Get student background/tier from `students`.
  - [ ] **Step 2: Construct Prompt for Gemini:**
    - [ ] Request `question_count` questions suitable for background, current tier to targetTier progression.
    - [ ] Desired output: JSON array (similar to quiz questions).
  - [ ] **Step 3: Call Gemini API and Process Response:**
    - [ ] Parse/validate. If error, log, consider fallback.
  - [ ] **Step 4: Return Exam Questions:**
    - [ ] Return array of questions.
- **6.3. Integration with Promotion Exam Start Endpoint:**
  - [ ] `app/api/app/job-readiness/promotion-exam/start/route.ts` calls this service.
  - [ ] **Caching:** Exam questions, once generated for an attempt, MUST be cached securely server-side for the duration of that single exam attempt to ensure the student answers the same set they started with.
- **6.4. Fallback (Consider if needed):**
  - [ ] A bank of pre-defined promotion exam questions might be necessary.
- **6.5. Logging:**
  - [ ] Log exam generation attempts.

## 7. General AI Error Handling and Fallbacks (Cross-Cutting Concern)
These principles apply to all AI service modules above.

- **Relevant Files/Tables:**
  - Primarily affects: `lib/ai/gemini-client.ts` and all individual AI service files.
  - Configuration source: Potentially a new table `ai_service_config` or within existing module configurations.

- **7.1. Retry Logic:**
  - [x] Implement in `gemini-client.ts` or within each service.
  - [x] Enhanced error logging in callGeminiWithRetry to show specific error for each failed attempt.
- **7.2. Consistent Logging:**
  - [x] Establish standard logging format.
  - [x] Improved with more detailed error output in development mode.
- **7.3. Centralized Monitoring:**
  - [ ] Set up alerts (Supabase logs or external service).
- **7.4. User Feedback for Failures:**
  - [x] API responses should handle AI failures gracefully.
  - [x] Implemented fallback to question bank when AI generation fails.
- **7.5. Configuration for AI Parameters:**
  - [x] Store model names, temperature, etc., configurably. This includes `temperature` settings adjusted for different scenarios:
    - [x] Using 0.0 for deterministic quiz generation when needed for grading
    - [x] Using 0.5 for initial quiz display to add controlled randomness
- **7.6. Input/Output Validation:**
  - [x] Use Zod or similar for schema validation of AI inputs/outputs (especially for the JSON structure expected from Gemini).
  - [x] Implemented JSON structure validation for quiz questions.
  - [x] Enhanced validation to support both MCQ and MSQ question types.

This detailed plan provides a solid roadmap for implementing the AI service integrations. The Quiz Generator and Project Generator services are fully implemented with improved structured output handling and proper caching strategies. The Project Grader now provides comprehensive feedback with strengths, weaknesses, and improvement suggestions using structured outputs from the Gemini API. 