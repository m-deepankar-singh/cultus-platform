# Job Readiness: Student App Frontend Implementation Plan

## Overview
This document outlines the detailed step-by-step plan for implementing the student-facing frontend for the Job Readiness product. It includes UI components, page structures, API interactions, and state management considerations. The primary goal is to create an engaging and intuitive experience for students as they progress through the Job Readiness program.

### Business Rules
- **One Job Readiness Product per Client**: Each client can have multiple products (learning, assessment, etc.) but only ONE Job Readiness product. This is enforced at the database level.
- **Students inherit their client's single Job Readiness product**: No need for product selection - students automatically get their client's Job Readiness product.
- **Simplified API responses**: Since there's only one Job Readiness product per client, APIs return a single product rather than arrays.

## Implementation Progress Summary

### ✅ Completed Sections:
1. **Foundational Setup & Global Components** - ✅ COMPLETE - All core infrastructure is in place
2. **Job Readiness Dashboard Page** - ✅ COMPLETE - Main dashboard with progress display and module navigation
3. **Complete Hook Foundation** - ✅ COMPLETE - All TanStack Query hooks for data fetching and mutations
4. **Module: Standard Assessments (Star 1)** - ✅ COMPLETE - Full assessment system with MCQ/MSQ support

### ✅ Completed Sections:
1. **Foundational Setup & Global Components** - ✅ COMPLETE - All core infrastructure is in place
2. **Job Readiness Dashboard Page** - ✅ COMPLETE - Main dashboard with progress display and module navigation
3. **Complete Hook Foundation** - ✅ COMPLETE - All TanStack Query hooks for data fetching and mutations
4. **Module: Standard Assessments (Star 1)** - ✅ COMPLETE - Full assessment system with MCQ/MSQ support
5. **Module: Courses with AI-Generated Quizzes (Star 2)** - ✅ COMPLETE - Video lessons with AI-generated quizzes
6. **Module: Expert Sessions (Star 3)** - ✅ COMPLETE WITH OPTIMIZATIONS - Manual completion system with performance optimizations

**Key Optimizations in Expert Sessions:**
- Manual "Mark as Completed" button system for better user control
- Optimized TanStack Query configuration to prevent excessive API calls
- Smart cache management with targeted updates instead of full invalidations
- Adaptive completion detection for videos of any length
- Debounced progress updates with strategic timing (every 30 seconds)

### 🚧 Next Phase - Individual Module Implementation:
7. **Module: AI-Generated Real-World Projects (Star 4)** - Background-specific projects
8. **Module: AI-Powered Simulated Interview (Star 5)** - Video interview recording
9. **Optional: Promotion Exam** - Tier advancement exams

### 📁 Files Created/Completed:
**✅ Completed:**
- `app/(app)/app/job-readiness/page.tsx` - Main dashboard page
- `components/app/app-header.tsx` - Updated with Job Readiness navigation
- `components/job-readiness/JobReadinessLayout.tsx` - Layout wrapper component
- `components/job-readiness/OverallProgressDisplay.tsx` - 5-star progress display
- `components/job-readiness/ModuleNavigation.tsx` - Module cards with lock/unlock logic
- `components/ui/StarRating.tsx` - Reusable star rating component
- `hooks/useJobReadinessProgress.ts` - Progress data hook
- `hooks/useJobReadinessProducts.ts` - Products data hook
- `hooks/useJobReadinessMutations.ts` - Action mutation hooks

**✅ Foundational Hooks Completed:**
- `hooks/useAssessmentList.ts` - Hook for fetching Job Readiness assessments ✅
- `hooks/useAssessmentDetails.ts` - Hook for fetching assessment details and questions ✅
- `hooks/useCourseList.ts` - Hook for fetching available courses ✅
- `hooks/useCourseContent.ts` - Hook for fetching course content and lessons ✅
- `hooks/useExpertSessions.ts` - Hook for fetching expert sessions and progress ✅
- `hooks/useProjectGeneration.ts` - Hook for generating/fetching projects ✅
- `hooks/useInterviewQuestions.ts` - Hook for fetching interview questions ✅
- `hooks/usePromotionExamEligibility.ts` - Hook for checking promotion exam eligibility ✅
- `hooks/useSubmitAssessment.ts` - Mutation hook for submitting assessments ✅
- `hooks/useStartPromotionExam.ts` - Mutation hook for starting promotion exams ✅
- `hooks/useSubmitPromotionExam.ts` - Mutation hook for submitting promotion exams ✅

**✅ Assessment Module Completed:**
- `app/(app)/app/job-readiness/assessments/page.tsx` - Assessment listing page ✅
- `app/(app)/app/job-readiness/assessments/[moduleId]/page.tsx` - Individual assessment taking page ✅
- `app/(app)/app/job-readiness/assessments/[moduleId]/results/page.tsx` - Assessment results page ✅
- `components/job-readiness/AssessmentList.tsx` - Display available assessments ✅
- `components/job-readiness/AssessmentCard.tsx` - Individual assessment card ✅
- `components/job-readiness/TierDisplay.tsx` - Show tier criteria and current tier ✅
- `components/job-readiness/AssessmentInterface.tsx` - Assessment taking interface with MCQ/MSQ support ✅
- `components/job-readiness/AssessmentResults.tsx` - Results display with tier feedback ✅
- `app/api/app/job-readiness/assessments/[moduleId]/submit/route.ts` - Fixed submission API ✅

**✅ Course Module Completed:**
- `app/(app)/app/job-readiness/courses/page.tsx` - Course listing page ✅
- `app/(app)/app/job-readiness/courses/[moduleId]/page.tsx` - Individual course content viewer ✅
- `app/(app)/app/job-readiness/courses/[moduleId]/lessons/[lessonId]/page.tsx` - Individual lesson viewer ✅
- `components/job-readiness/CourseList.tsx` - Display available courses with progress ✅
- `components/job-readiness/CourseCard.tsx` - Individual course card with progress tracking ✅
- `components/job-readiness/CourseOverview.tsx` - Course overview with lesson list and progress ✅
- `components/job-readiness/LessonViewer.tsx` - Video player with progress tracking and quiz integration ✅
- `components/job-readiness/AiQuiz.tsx` - AI-generated quiz component with MCQ/MSQ/TF support ✅
- `app/api/app/job-readiness/courses/[moduleId]/lessons/[lessonId]/submit-quiz/route.ts` - Quiz submission API ✅
- `app/api/app/job-readiness/courses/[moduleId]/save-progress/route.ts` - Progress saving API ✅

**✅ Expert Sessions Module Completed:**
- `app/(app)/app/job-readiness/expert-sessions/page.tsx` - Expert sessions listing page ✅
- `app/(app)/app/job-readiness/expert-sessions/[sessionId]/page.tsx` - Individual session viewer ✅
- `components/job-readiness/ExpertSessionList.tsx` - Display list of expert sessions with progress ✅
- `components/job-readiness/OverallSessionProgress.tsx` - Overall progress display (X of 5 completed) ✅
- `components/job-readiness/ExpertSessionPlayer.tsx` - Video player with manual completion button and optimized progress tracking ✅
- `components/job-readiness/SessionProgress.tsx` - Individual session progress display ✅
- `hooks/useExpertSessions.ts` - Expert sessions data fetching with optimized caching ✅
- `hooks/useUpdateExpertSessionProgress.ts` - Progress updates with smart cache management (in useJobReadinessMutations) ✅
- `app/api/app/job-readiness/expert-sessions/route.ts` - Sessions listing API ✅
- `app/api/app/job-readiness/expert-sessions/[sessionId]/watch-progress/route.ts` - Progress tracking API with force completion support ✅

## 1. Foundational Setup & Global Components ✅ COMPLETED

- [x] **Project Setup:**
  - [x] Ensure Next.js routing is configured for the new Job Readiness student app section.
  - [x] Path: `app/(app)/app/job-readiness/` ✅
- [x] **Main Navigation & Layout:**
  - [x] Create a distinct top-level tab/navigation item "Job Readiness" in the main student dashboard.
    - File: `components/app/app-header.tsx` ✅ (Added Job Readiness navigation with Briefcase icon)
  - [x] Design a unique and engaging layout for the Job Readiness section.
    - Component: `components/job-readiness/JobReadinessLayout.tsx` ✅ (Completed)
    - This layout wraps all Job Readiness pages and includes the 5-star progress display.
- [x] **TanStack Query Hooks & Data Management:**
  - [x] Create custom hooks for Job Readiness data fetching and caching:
    - `useJobReadinessProducts()` - Fetch and cache Job Readiness products and progress ✅
      - **API:** `GET /api/app/job-readiness/products`
    - `useJobReadinessProgress()` - Fetch and cache student's current star level and tier ✅
      - **API:** `GET /api/app/job-readiness/products` (includes progress data)
    - [x] `useCourseContent(moduleId)` - Fetch course content and lessons ✅
      - **API:** `GET /api/app/job-readiness/courses/{moduleId}/content`
    - [x] `useExpertSessions(productId)` - Fetch expert sessions and progress ✅
      - **API:** `GET /api/app/job-readiness/expert-sessions?productId={productId}`
    - [x] `useInterviewQuestions()` - Fetch AI-generated interview questions ✅
      - **API:** `GET /api/app/job-readiness/interviews/questions`
    - [x] `usePromotionExamEligibility()` - Check promotion exam eligibility ✅
      - **API:** `GET /api/app/job-readiness/promotion-exam/eligibility`
    - [x] `useAssessmentList(productId)` - Fetch Job Readiness assessments ✅
      - **API:** `GET /api/app/job-readiness/assessments?productId={productId}`
    - [x] `useAssessmentDetails(moduleId)` - Fetch assessment details and questions ✅
      - **API:** `GET /api/app/job-readiness/assessments/{moduleId}/details`
    - [x] `useCourseList(productId)` - Fetch available courses ✅
      - **API:** `GET /api/app/job-readiness/courses?productId={productId}`
    - [x] `useProjectGeneration(productId)` - Generate or fetch existing project ✅
      - **API:** `GET /api/app/job-readiness/projects/generate?productId={productId}`
  - [x] Create mutation hooks for actions:
    - `useSubmitQuiz()` - Submit lesson quiz answers ✅
      - **API:** `POST /api/app/job-readiness/courses/{moduleId}/lessons/{lessonId}/submit-quiz`
    - `useUpdateProgress()` - Update video/course progress ✅
      - **API:** `POST /api/app/job-readiness/courses/{moduleId}/save-progress`
    - `useSubmitProject()` - Submit project work ✅
      - **API:** `POST /api/app/job-readiness/projects/submit`
    - `useSubmitInterview()` - Submit interview video ✅
      - **API:** `POST /api/app/job-readiness/interviews/submit`
    - `useUpdateExpertSessionProgress()` - Update expert session watch progress ✅
      - **API:** `POST /api/app/job-readiness/expert-sessions/{sessionId}/watch-progress`
    - [x] `useSubmitAssessment()` - Submit assessment answers ✅
      - **API:** `POST /api/app/job-readiness/assessments/{moduleId}/submit`
    - [x] `useStartPromotionExam()` - Start promotion exam ✅
      - **API:** `POST /api/app/job-readiness/promotion-exam/start`
    - [x] `useSubmitPromotionExam()` - Submit promotion exam answers ✅
      - **API:** `POST /api/app/job-readiness/promotion-exam/submit`
  - [x] Configure appropriate cache times and query key strategies for efficient invalidation. ✅
- [x] **Styling and UI Kit:**
  - [x] Define a unique visual theme for Job Readiness (colors, typography, iconography) while maintaining overall platform consistency. ✅
  - [x] Develop or reuse UI components for stars, progress bars, module cards, etc.
    - Component: `components/ui/StarRating.tsx` ✅ (Completed)
    - Component: Module cards integrated into `components/job-readiness/ModuleNavigation.tsx` ✅

## 2. Job Readiness Dashboard Page ✅ COMPLETED

- [x] **Page Route:** `app/(app)/app/job-readiness/page.tsx` ✅
- [x] **Main Dashboard UI:**
  - [x] Display overall progress:
    - Component: `components/job-readiness/OverallProgressDisplay.tsx` ✅ (Completed)
      - Prominent visual display of the 5-star progress system (5 actual stars that fill up). ✅
      - Display current star color (Bronze, Silver, Gold) based on tier. ✅
      - Dynamic progress messages and next steps. ✅
  - [x] Display current/next module:
    - Component: `components/job-readiness/ModuleNavigation.tsx` ✅ (Completed)
      - Show cards for each module in the sequence (Assessments, Courses, Expert Sessions, Projects, Interviews). ✅
      - Clearly indicate locked and unlocked modules. Locked modules are visible but not interactive, with messages about prerequisites. ✅
      - Link to the active module. ✅
  - [x] Fetch initial Job Readiness product details and student progress.
    - API: `GET /api/app/job-readiness/products` ✅ (Implemented via useJobReadinessProgress hook)
- [x] **Module Locking/Unlocking Logic:**
  - [x] Implement client-side logic to reflect module lock/unlock status based on API response and student's star level. ✅
  - [x] Ensure UI updates dynamically as modules are unlocked. ✅ (TanStack Query handles real-time updates)

## 3. Module: Standard Assessments (Star 1) ✅ COMPLETED

The assessment module is now fully implemented and working with support for Multiple Choice Questions (MCQ), Multiple Select Questions (MSQ), and True/False (TF) questions.

### ✅ Features Implemented:
- **Assessment listing page** with tier display and progress tracking
- **Individual assessment taking interface** with timer, navigation, and adaptive question types
- **Results page** with tier feedback and star progression
- **Database constraints** enforcing one Job Readiness product per client
- **Full MCQ/MSQ support** with radio buttons for single-select and checkboxes for multi-select
- **Tier determination system** (Bronze/Silver/Gold based on scores)
- **Star progression system** (unlocks next modules)

- [x] **Page Routes:**
  - `app/(app)/app/job-readiness/assessments/page.tsx` - Assessment listing page ✅
  - `app/(app)/app/job-readiness/assessments/[moduleId]/page.tsx` - Individual assessment taking page ✅
  - `app/(app)/app/job-readiness/assessments/[moduleId]/results/page.tsx` - Assessment results page ✅

  - [x] **API Endpoints & Responses:**
    - **GET** `/api/app/job-readiness/assessments?productId={productId}` - List assessments ✅
    ```json
    {
      "assessments": [
        {
          "id": "946abf65-5852-4685-b225-c491c8fce2e8",
          "name": "Initial Assessment",
          "type": "Assessment",
          "configuration": { "pass_threshold": 60, "duration_minutes": 60 },
          "sequence": 1,
          "is_unlocked": true,
          "is_completed": true,
          "is_tier_determining": true,
          "questions_count": 10,
          "last_score": 100,
          "tier_achieved": "GOLD"
        }
      ],
      "tier_criteria": {
        "bronze": { "min_score": 0, "max_score": 60 },
        "silver": { "min_score": 61, "max_score": 80 },
        "gold": { "min_score": 81, "max_score": 100 }
      },
      "current_tier": "GOLD",
      "current_star_level": "FOUR"
    }
    ```
      - **GET** `/api/app/job-readiness/assessments/[moduleId]/details` - Assessment details with questions ✅
    ```json
    {
      "assessment": {
        "id": "946abf65-5852-4685-b225-c491c8fce2e8",
        "name": "Initial Assessment",
        "instructions": "This assessment determines your initial tier level.",
        "time_limit_minutes": 45,
        "passing_threshold": 60,
        "questions": [
          {
            "id": "q1-uuid",
            "question_text": "What is the primary purpose of version control?",
            "question_type": "MCQ",
            "options": [
              { "id": "opt1-uuid", "text": "To track changes in code" }
            ]
          }
        ],
        "tier_assessment_config": {
          "bronze_min_score": 0, "bronze_max_score": 60,
          "silver_min_score": 61, "silver_max_score": 80,
          "gold_min_score": 81, "gold_max_score": 100
        }
      }
    }
    ```
      - **POST** `/api/app/job-readiness/assessments/[moduleId]/submit` - Submit assessment ✅
    ```json
    {
      "success": true,
      "score": 8,
      "percentage": 80,
      "passed": true,
      "tier_achieved": "SILVER",
      "tier_changed": true,
      "star_level_unlocked": true,
      "feedback": "Assessment completed with 80% (8/10 correct)..."
    }
    ```

- [x] **Component Files:**
  - `components/job-readiness/AssessmentList.tsx` - Display available assessments ✅
  - `components/job-readiness/AssessmentCard.tsx` - Individual assessment card ✅
  - `components/job-readiness/TierDisplay.tsx` - Show tier criteria and current tier ✅
  - `components/job-readiness/AssessmentInterface.tsx` - Assessment taking interface with MCQ/MSQ support ✅
  - `components/job-readiness/AssessmentResults.tsx` - Results display with tier feedback ✅

- [x] **UI Integration:**
  - [x] Custom Job Readiness assessment UI with enhanced features beyond existing assessment components ✅
  - [x] This module is unlocked by default for students enrolled in a Job Readiness product ✅
  - [x] Handle assessment submission with proper error handling and validation ✅

- [x] **Post-Completion Flow:**
  - [x] After completion of assessments, the backend determines the tier (Bronze, Silver, Gold) based on score ✅
  - [x] Frontend updates the star progression and awards the 1st star when assessments are completed ✅
  - [x] Unlocks the "Courses" module in the Job Readiness dashboard automatically ✅

- [ ] **Post-Completion Flow:**
  - [ ] After completion of all required assessments, the backend determines the initial tier (Bronze, Silver, Gold).
  - [ ] Frontend should update the star color and award the 1st star visually.
  - [ ] Unlock the "Courses" module in the Job Readiness dashboard.

## 4. Module: Courses with AI-Generated Quizzes (Star 2) ✅ COMPLETED

The course module is now fully implemented and working with video lessons, progress tracking, and AI-generated quizzes that support MCQ, MSQ, and True/False questions.

### ✅ Features Implemented:
- **Course listing page** with progress tracking and tier-based access control
- **Individual course overview** with lesson list and overall completion percentage  
- **Video lesson viewer** with custom controls, progress tracking, and AI quiz integration
- **AI-generated quizzes** with multiple question types (MCQ/MSQ/TF)
- **Progress persistence** with automatic saving and restoration
- **Lesson completion tracking** based on video watch percentage (85% threshold) and quiz results
- **Course progression system** that unlocks Expert Sessions module

- [x] **Page Routes:**
  - `app/(app)/app/job-readiness/courses/page.tsx` - Course listing page ✅
  - `app/(app)/app/job-readiness/courses/[moduleId]/page.tsx` - Individual course content viewer ✅
  - `app/(app)/app/job-readiness/courses/[moduleId]/lessons/[lessonId]/page.tsx` - Individual lesson viewer ✅

  - [x] **API Endpoints & Responses:**
    - **GET** `/api/app/job-readiness/courses?productId={productId}` - List all Job Readiness courses ✅
    ```json
    {
      "courses": [
        {
          "id": "2f8e4b1a-9c7d-4e5f-8a6b-1c2d3e4f5a6b",
          "name": "Introduction to Programming",
          "type": "Course",
          "configuration": {
            "description": "Basic programming concepts and fundamentals",
            "estimated_duration_hours": 20,
            "difficulty_level": "Beginner",
            "required_tier": "BRONZE"
          },
          "sequence": 1,
          "is_unlocked": true,
          "is_completed": false,
          "progress": {
            "status": "InProgress",
            "progress_percentage": 65,
            "last_updated": "2024-01-15T14:30:00.000Z"
          },
          "lessons_count": 8,
          "completion_percentage": 65
        }
      ],
      "overall_progress": {
        "completed_courses_count": 2,
        "required_courses": 5,
        "progress_percentage": 40,
        "second_star_unlocked": false
      },
      "current_tier": "SILVER",
      "current_star_level": "TWO"
    }
    ```
  - **GET** `/api/app/job-readiness/courses/[moduleId]/content` - Course content with lessons ✅
    ```json
    {
      "module": {
        "id": "2f8e4b1a-9c7d-4e5f-8a6b-1c2d3e4f5a6b",
        "name": "Introduction to Programming",
        "description": "Basic programming concepts and fundamentals",
        "lessons": [
          {
            "id": "lesson-1-uuid",
            "title": "Variables and Data Types",
            "description": "Learn about different data types",
            "video_url": "https://example.com/video1.mp4",
            "sequence": 1,
            "enable_ai_quiz": true,
            "quiz_questions": [
              {
                "id": "quiz-q1-uuid",
                "question_text": "What is a variable in programming?",
                "options": [
                  {"id": "opt1-uuid", "text": "A container for storing data"}
                ],
                "question_type": "MCQ"
              }
            ],
            "quiz_already_passed": false
          }
        ]
      },
      "progress": {
        "last_viewed_lesson_sequence": 1,
        "video_playback_positions": { "lesson-1-uuid": 300 },
        "lesson_quiz_results": {
          "lesson-1-uuid": { "score": 80, "passed": true, "attempts": 1 }
        }
      }
    }
    ```
  - **POST** `/api/app/job-readiness/courses/[moduleId]/save-progress` - Save progress ✅
    ```json
    {
      "success": true,
      "message": "Course progress saved successfully (75%)",
      "progress_percentage": 75,
      "status": "InProgress",
      "updated_at": "2024-01-15T16:20:30.123Z"
    }
    ```
  - **POST** `/api/app/job-readiness/courses/[moduleId]/lessons/[lessonId]/submit-quiz` - Submit lesson quiz ✅

- [x] **Component Files:**
  - `components/job-readiness/CourseList.tsx` - Display available courses with progress tracking ✅
  - `components/job-readiness/CourseCard.tsx` - Individual course card with progress and tier requirements ✅
  - `components/job-readiness/CourseOverview.tsx` - Course overview with lesson list and completion tracking ✅
  - `components/job-readiness/LessonViewer.tsx` - Video player with progress tracking and AI quiz integration ✅
  - `components/job-readiness/AiQuiz.tsx` - AI-generated quiz component with MCQ/MSQ/TF support ✅

- [x] **Course Listing UI (courses/page.tsx):**
  - Display list of all available "Course" type modules for the student within the Job Readiness product ✅
  - Show course cards with progress, completion status, and unlock status ✅
  - Display overall progress: "X of Y courses completed" ✅
  - Similar layout and functionality to the assessments listing page ✅

- [x] **Course Content UI (courses/[moduleId]/page.tsx):**
  - Course overview page showing all lessons in the course ✅
  - List of lessons with video thumbnails, titles, duration, and completion status ✅
  - Click on lesson to navigate to individual lesson viewer ✅
  - Track overall course progress and completion percentage ✅

- [x] **Individual Lesson UI (courses/[moduleId]/lessons/[lessonId]/page.tsx):**
  - Video player with progress tracking and standard controls ✅
  - Lesson title, description, and sequence information ✅
  - AI-generated quiz section (if enabled for the lesson) ✅
  - Navigation between lessons within the course ✅

- [x] **AI-Generated Quiz UI:**
  - For each lesson with `has_quiz = true`: ✅
    - Fetch quiz questions from the lesson data ✅
    - Display quiz questions and options with proper question type handling (MCQ/MSQ/TF) ✅
    - 85% video watch threshold required to unlock quiz ✅
  - Handle quiz submission with proper validation ✅
  - Display quiz results (score, passed/failed with 70% threshold) ✅
  - Update lesson progress locally and sync with backend ✅
  - Require quiz completion before marking lesson as complete ✅

- [x] **Post-Completion Flow:**
  - [x] On completion of all required course modules (including passing quizzes), award the 2nd star ✅
  - [x] Update student's star level from ONE to TWO in the database ✅
  - [x] Unlock the "Expert Sessions" module in the Job Readiness dashboard ✅
  - [x] If eligible based on tier and star level, present the Promotion Exam option ✅

## 5. Module: Expert Sessions (Star 3) ✅ COMPLETED WITH OPTIMIZATIONS

- [x] **Page Routes:**
  - `app/(app)/app/job-readiness/expert-sessions/page.tsx` - Expert sessions listing page ✅
  - `app/(app)/app/job-readiness/expert-sessions/[sessionId]/page.tsx` - Individual session viewer ✅

- [x] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/expert-sessions?productId={productId}` - List expert sessions
    ```json
    {
      "sessions": [
        {
          "id": "79c71e78-8f1b-45bb-a38b-e467cbb1fa6a",
          "title": "Advanced React Patterns",
          "description": "Learn advanced React patterns and best practices",
          "video_url": "https://example.com/expert-session-video.mp4",
          "video_duration": 1800,
          "created_at": "2025-05-27T09:54:55.36486+00:00",
          "student_progress": {
            "watch_time_seconds": 900,
            "completion_percentage": 50,
            "is_completed": false,
            "completed_at": null
          }
        }
      ],
      "overall_progress": {
        "completed_sessions_count": 2,
        "required_sessions": 5,
        "progress_percentage": 40,
        "third_star_unlocked": false
      }
    }
    ```
      - **POST** `/api/app/job-readiness/expert-sessions/[sessionId]/watch-progress` - Update watch progress ✅
    ```json
    {
      "message": "Watch progress updated successfully",
      "progress": {
        "expert_session_id": "79c71e78-8f1b-45bb-a38b-e467cbb1fa6a",
        "watch_time_seconds": 450,
        "completion_percentage": 75,
        "is_completed": false,
        "completed_at": null,
        "session_just_completed": false
      },
      "overall_progress": {
        "completed_sessions_count": 2,
        "required_sessions": 5,
        "progress_percentage": 40,
        "third_star_unlocked": false
      }
    }
    ```

- [x] **Component Files:**
  - `components/job-readiness/ExpertSessionList.tsx` - Display list of expert sessions ✅
  - `components/job-readiness/ExpertSessionCard.tsx` - Individual session card with progress (integrated in ExpertSessionList) ✅
  - `components/job-readiness/ExpertSessionPlayer.tsx` - Video player with progress tracking ✅
  - `components/job-readiness/SessionProgress.tsx` - Progress indicator for sessions ✅
  - `components/job-readiness/OverallSessionProgress.tsx` - Overall progress (X of 5 completed) ✅

- [x] **Expert Sessions Listing UI:**
  - Display list of all available Expert Session videos ✅
    - Include title, description, video duration (if available) ✅
    - Show student's progress for each session (e.g., "Watched 50%", "Completed") ✅
  - Display overall progress: "X of 5 sessions completed" ✅

- [x] **Expert Session Video Player UI:**
  - Custom video player with standard controls (play, pause, seek, volume, fullscreen) ✅
  - Progress tracking with optimized API calls (every 30 seconds) ✅
  - **Manual Completion System**: "Mark as Completed" button appears when video is fully watched ✅
    - User-controlled completion instead of automatic thresholds ✅
    - Works for videos of any length (5 seconds to hours) ✅
    - Eliminates rapid API calls near completion ✅
  - Progress persistence and restoration on page reload ✅
  - Smart cache management to prevent excessive API calls ✅

- [x] **Post-Completion Flow:**
  - [x] Manual completion via "Mark as Completed" button when user reaches video end ✅
  - [x] Frontend updates UI to reflect completion with real-time cache updates ✅
  - [x] On completion of 5 distinct sessions, award the 3rd star ✅
  - [x] Unlock the "Projects" module ✅
  - [x] If eligible, present the Promotion Exam option ✅

- [x] **Performance Optimizations:**
  - [x] TanStack Query configuration optimized to prevent excessive API calls ✅
  - [x] Smart cache updates instead of full invalidations for progress updates ✅
  - [x] Memoized dependencies to prevent unnecessary re-renders ✅
  - [x] Debounced progress updates with strategic timing ✅

## 6. Module: AI-Generated Real-World Projects (Star 4)

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/projects/page.tsx` - Project generation and submission page
  - `app/(app)/app/job-readiness/projects/feedback/page.tsx` - Project feedback and results page

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/projects/generate?productId={productId}` - Generate or get existing project
    ```json
    {
      "success": true,
      "project": {
        "title": "Professional Portfolio Project",
        "description": "Build a professional portfolio showcasing your skills and achievements.",
        "tasks": [
          "Create a structured outline of your professional skills",
          "Develop a presentation format (document or website)",
          "Include at least 3 examples of your work"
        ],
        "deliverables": [
          "Complete portfolio document or website URL",
          "Brief explanation of how you approached the project"
        ],
        "submission_type": "text_input",
        "status": "new"
      },
      "message": "This is a newly generated project. It will change on refresh until you submit."
    }
    ```
  - **POST** `/api/app/job-readiness/projects/submit` - Submit project work
    ```json
    {
      "success": true,
      "submission": {
        "id": "5cdd63b1-5334-40b3-8cdf-f122599b4f07",
        "project_title": "Professional Portfolio Project",
        "submission_type": "url",
        "submission_content": "Portfolio content...",
        "submission_url": "https://my-portfolio-website.vercel.app",
        "score": 75,
        "passed": false
      },
      "feedback": {
        "summary": "The student has created a good professional portfolio...",
        "strengths": [
          "Well-structured and easy to navigate",
          "Clean and professional design"
        ],
        "weaknesses": [
          "Project descriptions lack detail",
          "Portfolio lacks personal touch"
        ],
        "improvements": [
          "Add a blog section to showcase expertise",
          "Include detailed case studies for projects"
        ]
      },
      "star_level_updated": false,
      "new_star_level": "FOUR",
      "passing_threshold": 80
    }
    ```

- [ ] **Component Files:**
  - `components/job-readiness/ProjectDisplay.tsx` - Display generated project details
  - `components/job-readiness/ProjectSubmissionForm.tsx` - Submission form (adaptive to background)
  - `components/job-readiness/ProjectFeedback.tsx` - Display AI feedback and results
  - `components/job-readiness/ProjectTasks.tsx` - Display project tasks and deliverables
  - `components/job-readiness/SubmissionTypeSelector.tsx` - Switch between text/URL submission
  - `components/job-readiness/RetryProject.tsx` - Retry mechanism for failed projects

- [ ] **Project Display UI:**
  - Fetch and display the AI-generated project description based on student's background and tier.
  - Emphasize that project details might change on refresh if not yet started/submitted.

- [ ] **Project Submission UI:**
  - Input mechanism adapting to student background:
    - Computer Science: Form field to submit GitHub repository URL.
    - Other backgrounds: Rich text editor for submitting text-based case study answers.

- [ ] **Feedback and Iteration:**
  - Display AI grading results/feedback from the API response.
  - UI to allow retries if the project is failed (based on backend rules).

- [ ] **Post-Completion Flow:**
  - [ ] On passing the project, award the 4th star.
  - [ ] Unlock the "Simulated Interview" module.
  - [ ] If eligible, present the Promotion Exam option.

## 7. Module: AI-Powered Simulated Interview (Star 5)

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/interviews/page.tsx` - Interview setup and recording page
  - `app/(app)/app/job-readiness/interviews/feedback/[submissionId]/page.tsx` - Interview feedback page

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/interviews/questions` - Get interview questions
    ```json
    {
      "questions": [
        {
          "id": "q1",
          "question_text": "Describe a complex distributed system you've designed or worked on. Detail the architectural patterns used, the trade-offs you considered, and how you addressed challenges like consistency, fault tolerance, and scalability."
        },
        {
          "id": "q2",
          "question_text": "Explain the CAP theorem. Describe a scenario where you had to make a trade-off between consistency, availability, and partition tolerance."
        },
        {
          "id": "q3",
          "question_text": "Discuss a time when you had to refactor a large, legacy codebase. What strategies did you employ to minimize risk?"
        }
      ],
      "cached": false
    }
    ```
  - **POST** `/api/app/job-readiness/interviews/submit` - Submit interview responses
    - Request: `{ "product_id": "uuid", "questions": [], "responses": [], "interview_type": "technical" }`
    - Response: Interview submission confirmation with analysis ID
  - **GET** `/api/app/job-readiness/interviews/analysis/[submissionId]` - Get interview analysis
    - Response: AI analysis results with feedback, scores, and pass/fail status

- [ ] **Component Files:**
  - `components/job-readiness/InterviewSetup.tsx` - Setup instructions and start button
  - `components/job-readiness/InterviewRecorder.tsx` - Main recording interface
  - `components/job-readiness/InterviewQuestions.tsx` - Display questions during recording
  - `components/job-readiness/WebcamRecorder.tsx` - Webcam recording functionality
  - `components/job-readiness/RecordingTimer.tsx` - 5-minute countdown timer
  - `components/job-readiness/InterviewFeedback.tsx` - Display AI analysis and feedback
  - `components/job-readiness/VideoUpload.tsx` - Handle video blob upload
  - `components/job-readiness/PermissionsCheck.tsx` - Camera/microphone permission handling

- [ ] **Interview Setup UI:**
  - Instructions for the interview process.
  - Button to initiate the simulated interview.

- [ ] **Interview Recorder Component:**
  - **Display Interview Questions:**
    - Fetch questions tailored to student's background and tier.
    - Display one question at a time, or all questions if preferred for the flow.
  - **Webcam Access and Recording:**
    - Request microphone and camera permissions.
    - Use `MediaRecorder` API for video/audio capture (WebM format).
    - Visual feedback of recording status.
  - **Recording Timer:**
    - Implement a 5-minute countdown timer.
    - Display remaining time.
    - Auto-finalize and submit on timer end.
  - **Manual Submission:**
    - Allow student to click "Submit" before timer ends.
  - **Video Processing (Client-side):**
    - Best-effort client-side check for video duration (max 5 mins).
    - Attempt compression if feasible, or aim for <20MB recording settings.
  - **Upload to API:**
    - Send WebM video blob to the backend.

- [ ] **Feedback UI:**
  - Display AI analysis feedback (pass/fail, detailed comments).
  - UI to allow retries if failed (subject to backend rules).

- [ ] **Post-Completion Flow:**
  - [ ] On passing the interview, award the 5th star.
  - [ ] Job Readiness product considered complete. Display a congratulatory message.

## 8. Optional: Promotion Exam

- [ ] **Page Routes:**
  - `app/(app)/app/job-readiness/promotion-exam/page.tsx` - Eligibility check and exam start
  - `app/(app)/app/job-readiness/promotion-exam/take/page.tsx` - Exam taking interface
  - `app/(app)/app/job-readiness/promotion-exam/results/page.tsx` - Exam results and feedback

- [ ] **API Endpoints & Responses:**
  - **GET** `/api/app/job-readiness/promotion-exam/eligibility` - Check exam eligibility
    ```json
    {
      "is_eligible": true,
      "star_level": "TWO",
      "current_tier": "BRONZE",
      "target_tier": "SILVER",
      "exam_config": {
        "id": "a3734024-c3de-4bf8-81ca-89c44ec86f77",
        "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
        "is_enabled": true,
        "question_count": 31,
        "pass_threshold": 76,
        "time_limit_minutes": 91
      },
      "previous_attempts": []
    }
    ```
  - **POST** `/api/app/job-readiness/promotion-exam/start` - Start exam session
    ```json
    {
      "message": "Promotion exam started successfully",
      "exam_session_id": "exam_a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8_1638360000000_x7k9m2n4q",
      "questions": [
        {
          "id": "q-1",
          "question": "What is the difference between a stack and a queue?",
          "options": [
            {"id": "a", "text": "Option A for question 1"},
            {"id": "b", "text": "Option B for question 1"}
          ]
        }
      ],
      "time_limit_minutes": 91,
      "pass_threshold": 76,
      "current_tier": "BRONZE",
      "target_tier": "SILVER"
    }
    ```
  - **POST** `/api/app/job-readiness/promotion-exam/submit` - Submit exam answers
    ```json
    {
      "message": "Promotion exam passed successfully!",
      "exam_results": {
        "score": 82,
        "correct_answers": 25,
        "total_questions": 31,
        "pass_threshold": 76,
        "passed": true
      },
      "feedback": [
        "Congratulations! You've passed the promotion exam with a score of 82%.",
        "You've been promoted to SILVER tier."
      ],
      "tier_updated": true,
      "previous_tier": "BRONZE",
      "current_tier": "SILVER"
    }
    ```

- [ ] **Component Files:**
  - `components/job-readiness/PromotionExamPrompt.tsx` - Eligibility notification and start prompt
  - `components/job-readiness/ExamEligibilityCheck.tsx` - Check and display eligibility status
  - `components/job-readiness/PromotionExamInterface.tsx` - Exam taking interface
  - `components/job-readiness/ExamTimer.tsx` - Countdown timer for exam
  - `components/job-readiness/ExamNavigation.tsx` - Question navigation controls
  - `components/job-readiness/ExamResults.tsx` - Display exam results and tier promotion
  - `components/job-readiness/TierPromotion.tsx` - Visual tier promotion celebration

- [ ] **Promotion Exam Modal/Notification:**
  - Triggered after achieving Star 2, Star 3 (and potentially Star 4 if applicable and not yet at Gold tier).
  - Check eligibility via API first.
  - Clearly state it's a one-time attempt (per star-level opportunity) to upgrade tier (e.g., Bronze to Silver, Silver to Gold).
  - Buttons: "Start Exam" or "Skip". Skipping does not hinder progression to the next content module.

- [ ] **Exam Interface UI:**
  - Fetch and display 25 AI-generated exam questions.
  - Standard exam controls (navigation, answer selection).

- [ ] **Submission and Feedback:**
  - Handle exam submission.
  - Display immediate feedback (pass/fail).
  - If promoted, visually update star color/tier on the Job Readiness dashboard and global state.

## 9. General UI Elements & Considerations

- [ ] **Error Handling:**
  - Consistent error messages for API failures, locked modules, etc.
  - Retry mechanisms where appropriate.
- [ ] **Loading States:**
  - Skeletons or loaders for data fetching.
- [ ] **Instructions & Tooltips:**
  - Clear instructions for all AI-powered components and complex interactions.
- [ ] **Responsiveness:**
  - Ensure all new components and pages are responsive for mobile and desktop.
- [ ] **Accessibility (a11y):**
  - Adhere to accessibility best practices (semantic HTML, ARIA attributes, keyboard navigation).
- [ ] **State Synchronization (TanStack Query):**
  - Use TanStack Query's invalidation and refetching mechanisms to ensure data consistency.
  - Invalidate relevant queries after significant actions (module completion, promotion exam, tier upgrades).
  - Implement optimistic updates where appropriate for better UX.
  - Use query keys strategically for efficient cache management and selective invalidation.

## 10. TanStack Query Implementation Details

- [ ] **Query Keys Strategy:**
  - [ ] Define consistent query key patterns:
    - `['job-readiness', 'products', productId]` for product data
    - `['job-readiness', 'progress', studentId]` for progress data
    - `['job-readiness', 'courses', moduleId]` for course content
    - `['job-readiness', 'expert-sessions', productId]` for expert sessions
    - `['job-readiness', 'interviews', 'questions']` for interview questions
- [ ] **Cache Configuration:**
  - [ ] Set appropriate `staleTime` and `cacheTime` for different data types:
    - Progress data: Shorter stale time (1-2 minutes) for real-time updates
    - Course content: Longer stale time (10-15 minutes) for static content
    - Expert sessions: Medium stale time (5 minutes) for semi-static content
- [ ] **Query Invalidation Patterns:**
  - [ ] Invalidate progress queries after module completion
  - [ ] Invalidate course queries after quiz submission
  - [ ] Invalidate expert session queries after watch progress updates
  - [ ] Use selective invalidation with specific query keys to avoid unnecessary refetches
- [ ] **Optimistic Updates:**
  - [ ] Implement optimistic updates for progress tracking (video progress, quiz attempts)
  - [ ] Implement rollback mechanisms for failed mutations
- [ ] **Error Handling:**
  - [ ] Create consistent error handling patterns for all Job Readiness queries
  - [ ] Implement retry logic for transient failures
  - [ ] Show appropriate error states in UI components

This plan provides a structured approach to developing the Job Readiness student frontend. Each section should be broken down further into smaller tasks during development sprints. 