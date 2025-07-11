# Job Readiness Frontend API Documentation

## Base URL
All endpoints are prefixed with: `/api/app/job-readiness`

---

## 1. Products

### GET /api/app/job-readiness/products
**Description:** Get assigned Job Readiness products and progress for the current student. Includes module lock/unlock status based on student's current star level and progress.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Query Parameters:** None

**Request Body:** None

**Response:** 
```json
{
    "student": {
        "id": "a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8",
        "name": "Deepankar Singh",
        "email": "deepankar@test.com",
        "job_readiness_star_level": "FOUR",
        "job_readiness_tier": "GOLD",
        "job_readiness_background_type": "COMPUTER_SCIENCE",
        "job_readiness_promotion_eligible": false
    },
    "products": [
        {
            "modules": [
                {
                    "id": "0eb52579-4f27-4cfe-b59c-db9a3467374a",
                    "name": "sdfgfvb",
                    "type": "Assessment",
                    "configuration": {
                        "description": "dfghhgfds",
                        "pass_threshold": 100,
                        "time_limit_minutes": 60
                    },
                    "product_id": "3f9a1ea0-5942-4ef1-bdb6-183d5add4b52",
                    "student_module_progress": [],
                    "is_unlocked": false,
                    "progress": null
                },
                {
                    "id": "9b6f7e8d-1c2b-3a4d-5e6f-7a8b9c0d1e2f",
                    "name": "Quiz 1",
                    "type": "Assessment",
                    "configuration": null,
                    "product_id": "3f9a1ea0-5942-4ef1-bdb6-183d5add4b52",
                    "student_module_progress": [
                        {
                            "status": "Completed",
                            "module_id": "9b6f7e8d-1c2b-3a4d-5e6f-7a8b9c0d1e2f",
                            "student_id": "a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8",
                            "completed_at": "2025-05-08T11:16:27.789+00:00",
                            "last_updated": "2025-05-08T11:16:27.789+00:00",
                            "progress_details": null,
                            "progress_percentage": 100
                        }
                    ],
                    "is_unlocked": false,
                    "progress": {
                        "status": "Completed",
                        "module_id": "9b6f7e8d-1c2b-3a4d-5e6f-7a8b9c0d1e2f",
                        "student_id": "a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8",
                        "completed_at": "2025-05-08T11:16:27.789+00:00",
                        "last_updated": "2025-05-08T11:16:27.789+00:00",
                        "progress_details": null,
                        "progress_percentage": 100
                    }
                }
            ]
        }
    ]
}
```

---

## 2. Assessments

### GET /api/app/job-readiness/assessments
**Description:** Get assessments for the Job Readiness product using the module-based system. These are tier-determining assessments that work with the unified module system.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Query Parameters:**
- `productId` (required): UUID of the Job Readiness product

**Example URL:**
```
/api/app/job-readiness/assessments?productId=c34ab292-8966-40a2-990f-e8957b833db9
```

**Request Body:** None

**Response:** 
```json
{
    "assessments": [
        {
            "id": "946abf65-5852-4685-b225-c491c8fce2e8",
            "name": "Initial Assessment",
            "type": "Assessment",
            "configuration": {
                "pass_threshold": 60,
                "duration_minutes": 60
            },
            "sequence": 1,
            "is_unlocked": true,
            "is_completed": true,
            "is_tier_determining": true,
            "assessment_type": "initial_tier",
            "progress": {
                "status": "Completed",
                "module_id": "946abf65-5852-4685-b225-c491c8fce2e8",
                "student_id": "a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8",
                "completed_at": null,
                "last_updated": "2025-05-20T07:10:09.45+00:00",
                "progress_details": {
                    "score": 85,
                    "passed": true,
                    "submitted": true,
                    "correct_answers": 2,
                    "total_questions": 2
                },
                "progress_percentage": 100
            },
            "questions_count": 0,
            "last_score": 100,
            "tier_achieved": null
        }
    ],
    "tier_criteria": {
        "bronze": {
            "min_score": 0,
            "max_score": 60
        },
        "silver": {
            "min_score": 61,
            "max_score": 80
        },
        "gold": {
            "min_score": 81,
            "max_score": 100
        }
    },
    "current_tier": "GOLD",
    "current_star_level": "FOUR",
    "completed_assessments_count": 1,
    "total_assessments_count": 1,
    "product": {
        "id": "c34ab292-8966-40a2-990f-e8957b833db9",
        "name": "Job Readiness Program",
        "type": "JOB_READINESS"
    }
}
```

### GET /api/app/job-readiness/assessments/[moduleId]/details
**Description:** Get detailed information for a specific Job Readiness assessment module, including questions, tier configuration, and student progress.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**URL Parameters:**
- `moduleId` (required): UUID of the assessment module

**Example URL:**
```
/api/app/job-readiness/assessments/946abf65-5852-4685-b225-c491c8fce2e8/details
```

**Request Body:** None

**Response:** 
```json
{
    "assessment": {
        "id": "946abf65-5852-4685-b225-c491c8fce2e8",
        "name": "Initial Assessment",
        "instructions": "This assessment determines your initial tier level. Answer all questions to the best of your ability.",
        "time_limit_minutes": 45,
        "passing_threshold": 60,
        "questions": [
            {
                "id": "q1-uuid",
                "question_text": "What is the primary purpose of version control in software development?",
                "question_type": "MCQ",
                "options": [
                    {
                        "id": "opt1-uuid",
                        "text": "To track changes in code"
                    },
                    {
                        "id": "opt2-uuid", 
                        "text": "To compile code"
                    },
                    {
                        "id": "opt3-uuid",
                        "text": "To deploy applications"
                    },
                    {
                        "id": "opt4-uuid",
                        "text": "To test code"
                    }
                ]
            }
        ],
        "is_submitted": false,
        "retakes_allowed": true,
        "tier_assessment_config": {
            "bronze_min_score": 0,
            "bronze_max_score": 60,
            "silver_min_score": 61,
            "silver_max_score": 80,
            "gold_min_score": 81,
            "gold_max_score": 100
        },
        "current_student_tier": "BRONZE",
        "current_star_level": null
    },
    "in_progress_attempt": null
}
```

### POST /api/app/job-readiness/assessments/[moduleId]/submit
**Description:** Submit answers for a Job Readiness assessment module. Automatically determines tier based on score and updates student progression.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
- `moduleId` (required): UUID of the assessment module

**Example URL:**
```
/api/app/job-readiness/assessments/946abf65-5852-4685-b225-c491c8fce2e8/submit
```

**Request Body:**
```json
{
  "answers": {
    "question-uuid-1": "option-uuid-a",
    "question-uuid-2": ["option-uuid-1", "option-uuid-2"],
    "question-uuid-3": "option-uuid-b"
  },
  "time_spent_seconds": 1800,
  "started_at": "2024-01-15T10:00:00.000Z"
}
```

**Example Request Body:**
```json
{
  "answers": {
    "q1-uuid": "opt1-uuid",
    "q2-uuid": "opt3-uuid",
    "q3-uuid": ["opt1-uuid", "opt2-uuid"],
    "q4-uuid": "opt2-uuid"
  },
  "time_spent_seconds": 2100,
  "started_at": "2024-01-15T10:00:00.000Z"
}
```

**Response:** 
```json
{
    "success": true,
    "score": 8,
    "percentage": 80,
    "passed": true,
    "tier_achieved": "SILVER",
    "tier_changed": true,
    "star_level_unlocked": true,
    "feedback": "Assessment completed with 80% (8/10 correct). Congratulations! You passed the assessment. You achieved SILVER tier performance. Your Job Readiness tier has been upgraded to SILVER! You've unlocked Star Level ONE!",
    "correct_answers": 8,
    "total_questions": 10,
    "submission_id": "progress-record-uuid"
}

---

## 3. Courses

### GET /api/app/job-readiness/courses
**Description:** Lists available Course modules for the Job Readiness product using the module-based system. Includes progress tracking, completion status, and Job Readiness specific features.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Query Parameters:**
- `productId` (required): UUID of the Job Readiness product

**Example URL:**
```
/api/app/job-readiness/courses?productId=c34ab292-8966-40a2-990f-e8957b833db9
```

**Request Body:** None

**Response:** 
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
                "required_tier": "BRONZE",
                "unlocks_at_star_level": "ONE"
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
            "description": "Basic programming concepts and fundamentals",
            "completion_percentage": 65
        },
        {
            "id": "3a9f5c2b-8d6e-4f7a-9b8c-2d3e4f5a6b7c",
            "name": "Web Development Basics",
            "type": "Course",
            "configuration": {
                "description": "HTML, CSS, and JavaScript fundamentals",
                "estimated_duration_hours": 30,
                "difficulty_level": "Intermediate",
                "required_tier": "SILVER"
            },
            "sequence": 2,
            "is_unlocked": true,
            "is_completed": true,
            "progress": {
                "status": "Completed",
                "progress_percentage": 100,
                "completed_at": "2024-01-10T16:45:00.000Z",
                "last_updated": "2024-01-10T16:45:00.000Z"
            },
            "lessons_count": 12,
            "description": "HTML, CSS, and JavaScript fundamentals",
            "completion_percentage": 100
        }
    ],
    "current_tier": "SILVER",
    "current_star_level": "THREE",
    "completed_courses_count": 1,
    "total_courses_count": 2,
    "product": {
        "id": "c34ab292-8966-40a2-990f-e8957b833db9",
        "name": "Job Readiness Program",
        "type": "JOB_READINESS"
    }
}
```

### GET /api/app/job-readiness/courses/[moduleId]/content
**Description:** Get detailed content for a specific Job Readiness course module, including lessons, videos, quizzes, and student progress.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**URL Parameters:**
- `moduleId` (required): UUID of the course module

**Example URL:**
```
/api/app/job-readiness/courses/2f8e4b1a-9c7d-4e5f-8a6b-1c2d3e4f5a6b/content
```

**Request Body:** None

**Response:** 
```json
{
    "module": {
        "id": "2f8e4b1a-9c7d-4e5f-8a6b-1c2d3e4f5a6b",
        "name": "Introduction to Programming",
        "description": "Basic programming concepts and fundamentals for beginners",
        "lessons": [
            {
                "id": "lesson-1-uuid",
                "title": "Variables and Data Types",
                "description": "Learn about different data types and how to declare variables",
                "video_url": "https://example.com/video1.mp4",
                "sequence": 1,
                "enable_ai_quiz": true,
                "quiz_questions": [
                    {
                        "id": "quiz-q1-uuid",
                        "question_text": "What is a variable in programming?",
                        "options": [
                            {"id": "opt1-uuid", "text": "A container for storing data"},
                            {"id": "opt2-uuid", "text": "A mathematical formula"},
                            {"id": "opt3-uuid", "text": "A type of loop"},
                            {"id": "opt4-uuid", "text": "A function parameter"}
                        ],
                        "question_type": "MCQ"
                    }
                ],
                "quiz_already_passed": false
            },
            {
                "id": "lesson-2-uuid",
                "title": "Control Structures",
                "description": "Understanding if statements, loops, and conditional logic",
                "video_url": "https://example.com/video2.mp4",
                "sequence": 2,
                "enable_ai_quiz": true,
                "quiz_questions": [],
                "quiz_already_passed": false
            }
        ]
    },
    "progress": {
        "last_viewed_lesson_sequence": 1,
        "video_playback_positions": {
            "lesson-1-uuid": 300
        },
        "fully_watched_video_ids": [],
        "lesson_quiz_results": {
            "lesson-1-uuid": {
                "score": 80,
                "passed": true,
                "attempts": 1
            }
        }
    }
}
```

### POST /api/app/job-readiness/courses/[moduleId]/save-progress
**Description:** Save progress for a Job Readiness course module with enhanced tracking capabilities.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
- `moduleId` (required): UUID of the course module

**Request Body:**
```json
{
  "progress_percentage": "number (0-100, required)",
  "status": "string (InProgress/Completed, default: InProgress)",
  "progress_details": "object (optional, any additional progress data)",
  "lesson_id": "string (optional, UUID of current lesson)",
  "video_playback_position": "number (optional, seconds)",
  "lesson_completed": "boolean (optional, mark lesson as completed)"
}
```

**Example Request Body:**
```json
{
  "progress_percentage": 75,
  "status": "InProgress",
  "progress_details": {
    "notes": "Completed variables and data types section",
    "quiz_attempt_count": 1
  },
  "lesson_id": "lesson-1-uuid",
  "video_playback_position": 420,
  "lesson_completed": true
}
```

**Response:** 
```json
{
    "success": true,
    "message": "Course progress saved successfully (75%)",
    "progress_percentage": 75,
    "status": "InProgress",
    "updated_at": "2024-01-15T16:20:30.123Z"
}
```



---

## 4. Expert Sessions

### GET /api/app/job-readiness/expert-sessions
**Description:** List all available Expert Session videos with student's progress for each.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Query Parameters:**
- `productId` (required): UUID of the product

**Example URL:**
```
/api/app/job-readiness/expert-sessions?productId=c34ab292-8966-40a2-990f-e8957b833db9
```

**Request Body:** None

**Response:** 
```json
{
    "sessions": [
        {
            "id": "79c71e78-8f1b-45bb-a38b-e467cbb1fa6a",
            "title": "test apiv",
            "description": "efef",
            "video_url": "https://meizvwwhasispvfbprck.supabase.co/storage/v1/object/public/expert-session-videos-public/products/c34ab292-8966-40a2-990f-e8957b833db9/expert-sessions/937f5065-0157-43f2-ad26-4d41dbf641a1.mp4",
            "video_duration": 5,
            "created_at": "2025-05-27T09:54:55.36486+00:00",
            "student_progress": {
                "watch_time_seconds": 0,
                "completion_percentage": 0,
                "is_completed": false,
                "completed_at": null
            }
        }
    ],
    "overall_progress": {
        "completed_sessions_count": 0,
        "required_sessions": 5,
        "progress_percentage": 0,
        "third_star_unlocked": false
    }
}
```

### POST /api/app/job-readiness/expert-sessions/[sessionId]/watch-progress
**Description:** Track watching progress for an expert session video.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
- `sessionId` (required): UUID of the expert session

**Example URL:**
```
/api/app/job-readiness/expert-sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/watch-progress
```

**Request Body:**
```json
{
  "watch_time_seconds": "number (seconds watched)",
  "completion_percentage": "number (0-100)",
  "video_duration": "number (total video duration in seconds)"
}
```

**Example Request Body:**
```json
{
  "watch_time_seconds": 450,
  "completion_percentage": 75,
  "video_duration": 600
}
```

**Response:** 
```json
{
  "message": "Watch progress updated successfully",
  "progress": {
    "expert_session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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

---

## 5. Projects

### GET /api/app/job-readiness/projects/generate
**Description:** Generates a real-world project for a student or returns existing submitted project.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Query Parameters:**
- `productId` (required): UUID of the product

**Example URL:**
```
/api/app/job-readiness/projects/generate?productId=c34ab292-8966-40a2-990f-e8957b833db9
```

**Request Body:** None

**Response:** 
```json
{
    "success": true,
    "project": {
        "title": "Professional Portfolio Project",
        "description": "Build a professional portfolio showcasing your skills and achievements. This project will help you create a compelling presentation of your work for potential employers.",
        "tasks": [
            "Create a structured outline of your professional skills and experience",
            "Develop a presentation format (document or website)",
            "Include at least 3 examples of your work or case studies"
        ],
        "deliverables": [
            "Complete portfolio document or website URL",
            "Brief explanation of how you approached the project"
        ],
        "submission_type": "text_input",
        "status": "new"
    },
    "message": "This is a newly generated project. It will change on refresh until you submit your answer."
}
```

### POST /api/app/job-readiness/projects/submit
**Description:** Submit a project completion.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "product_id": "string (UUID)",
  "project_title": "string",
  "project_description": "string",
  "submission_content": "string (project submission text)",
  "submission_url": "string (optional, URL to project if applicable)",
  "submission_type": "string (text_input/url/file)"
}
```

**Example Request Body:**
```json
{
  "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
  "project_title": "E-commerce Web Application",
  "project_description": "A full-stack e-commerce application with user authentication, product catalog, and shopping cart functionality.",
  "submission_content": "I built a React/Node.js e-commerce application with the following features: 1. User registration and login, 2. Product browsing with search functionality, 3. Shopping cart management, 4. Order processing. The application uses MongoDB for data storage and implements JWT authentication. GitHub repository: https://github.com/username/ecommerce-app",
  "submission_url": "https://github.com/username/ecommerce-app",
  "submission_type": "url"
}
```

**Response:** 
```json
{
    "success": true,
    "submission": {
        "id": "5cdd63b1-5334-40b3-8cdf-f122599b4f07",
        "project_title": "Professional Portfolio Project",
        "project_description": "Build a professional portfolio showcasing your skills and achievements. This project will help you create a compelling presentation of your work for potential employers.",
        "tasks": null,
        "deliverables": null,
        "submission_type": "url",
        "submission_content": "I have successfully completed my professional portfolio project. Here's my approach and deliverables:\n\n1. **Structured Outline**: I created a comprehensive outline covering my technical skills (React, Node.js, Python), soft skills (communication, teamwork), and professional experience (3 years in web development).\n\n2. **Presentation Format**: I developed a responsive portfolio website using React and deployed it on Vercel. The site includes sections for About Me, Skills, Projects, and Contact.\n\n3. **Work Examples**: I included three detailed case studies:\n   - E-commerce Platform: Full-stack application with payment integration\n   - Task Management App: React-based SPA with real-time updates\n   - Data Visualization Dashboard: Python/Flask backend with D3.js frontend\n\nEach case study includes project overview, technologies used, challenges faced, and outcomes achieved.\n\n**Portfolio Website**: https://my-portfolio-website.vercel.app\n\n**Approach**: I focused on creating a clean, professional design that effectively showcases my technical abilities while maintaining excellent user experience. The portfolio demonstrates both my coding skills and attention to design principles.",
        "submission_url": "https://my-portfolio-website.vercel.app",
        "score": 75,
        "passed": false
    },
    "feedback": {
        "summary": "The student has created a good professional portfolio that effectively showcases their skills and projects. The portfolio is well-structured, visually appealing, and easy to navigate. However, there are some areas that could be improved to make the portfolio even more compelling and informative.",
        "strengths": [
            "The portfolio is well-structured and easy to navigate, providing a user-friendly experience.",
            "The design is clean and professional, creating a positive first impression.",
            "The portfolio effectively showcases the student's skills and projects, demonstrating their technical abilities."
        ],
        "weaknesses": [
            "The project descriptions lack detail and don't fully explain the student's contributions or the technologies used.",
            "The portfolio lacks a personal touch and doesn't fully convey the student's personality or passion for computer science."
        ],
        "improvements": [
            "Add a blog section to showcase your thoughts and expertise in specific areas of computer science. Regularly updating this section will demonstrate your continuous learning and engagement with the field.",
            "Incorporate a more detailed project showcase with case studies. For each project, include the problem statement, your approach, technologies used, challenges faced, and quantifiable results. This will provide a deeper understanding of your skills and problem-solving abilities.",
            "Implement a contact form instead of just displaying your email address. This will make it easier for potential employers to reach out to you directly from your portfolio."
        ]
    },
    "star_level_updated": false,
    "new_star_level": "FOUR",
    "passing_threshold": 80
}
```

---

## 6. Interviews

### GET /api/app/job-readiness/interviews/questions
**Description:** Get AI-generated interview questions for the student. Questions are cached for 30 minutes to ensure consistency during a session.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Request Body:** None

**Response:** 
```json
{
    "questions": [
        {
            "id": "q1",
            "question_text": "Describe a complex distributed system you've designed or worked on. Detail the architectural patterns used, the trade-offs you considered, and how you addressed challenges like consistency, fault tolerance, and scalability."
        },
        {
            "id": "q2",
            "question_text": "Explain the CAP theorem. Describe a scenario where you had to make a trade-off between consistency, availability, and partition tolerance. What factors influenced your decision, and how did you implement the chosen strategy?"
        },
        {
            "id": "q3",
            "question_text": "Discuss a time when you had to refactor a large, legacy codebase. What strategies did you employ to minimize risk and ensure the refactoring was successful? How did you measure the impact of your changes?"
        },
        {
            "id": "q4",
            "question_text": "Describe a situation where you had to mentor or guide a junior developer on a challenging technical problem. How did you approach the situation, and what strategies did you use to help them learn and grow?"
        },
        {
            "id": "q5",
            "question_text": "Explain your approach to performance optimization. Describe a specific performance bottleneck you identified and resolved in a project. What tools and techniques did you use for profiling and optimization?"
        }
    ],
    "cached": false
}
```

### POST /api/app/job-readiness/interviews/submit
**Description:** Submit interview responses for AI analysis.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "product_id": "string (UUID)",
  "questions": "array (list of questions asked)",
  "responses": "array (student's responses to each question)",
  "interview_type": "string (optional, type of interview)"
}
```

**Example Request Body:**
```json
{
  "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
  "questions": [
    "Tell me about yourself and your background in software development.",
    "Describe a challenging project you've worked on recently.",
    "How do you handle working under tight deadlines?"
  ],
  "responses": [
    "I'm a full-stack developer with 3 years of experience in React and Node.js. I graduated with a Computer Science degree and have been working on various web applications.",
    "I recently built an e-commerce platform that required integrating multiple payment gateways and handling high traffic loads. The main challenge was optimizing database queries for performance.",
    "I prioritize tasks, break them into smaller components, and communicate frequently with team members to ensure we stay on track."
  ],
  "interview_type": "technical"
}
```

**Response:** 
```json
// Please test this endpoint in Postman and provide the actual response structure
```

### GET /api/app/job-readiness/interviews/analysis/[submissionId]
**Description:** Get AI analysis results for a submitted interview.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**URL Parameters:**
- `submissionId` (required): UUID of the interview submission

**Example URL:**
```
/api/app/job-readiness/interviews/analysis/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Request Body:** None

**Response:** 
```json
// Please test this endpoint in Postman and provide the actual response structure
```

---

## 7. Promotion Exam

### GET /api/app/job-readiness/promotion-exam/eligibility
**Description:** Check if student is eligible for promotion exam.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Request Body:** None

**Response:** 
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
        "created_at": "2025-05-26T10:02:13.493538+00:00",
        "updated_at": "2025-05-26T18:18:01.57712+00:00",
        "system_prompt": "You are an expert evaluator assessing candidates for promotion in their software engineering career path. Focus on advanced technical skills and leadership capabilities.",
        "time_limit_minutes": 91
    },
    "previous_attempts": []
}
```

### POST /api/app/job-readiness/promotion-exam/start
**Description:** Start a promotion exam session. Generates new questions each time called - questions are not stored until submission.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "product_id": "string (UUID)"
}
```

**Example Request Body:**
```json
{
  "product_id": "c34ab292-8966-40a2-990f-e8957b833db9"
}
```

**Response:** 
```json
{
  "message": "Promotion exam started successfully",
  "exam_session_id": "exam_a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8_1638360000000_x7k9m2n4q",
  "questions": [
    {
      "id": "q-1",
      "question": "What is the difference between a stack and a queue? (Question 1)",
      "options": [
        {"id": "a", "text": "Option A for question 1"},
        {"id": "b", "text": "Option B for question 1"},
        {"id": "c", "text": "Option C for question 1"},
        {"id": "d", "text": "Option D for question 1"}
      ]
    },
    {
      "id": "q-2",
      "question": "Explain the concept of inheritance in object-oriented programming. (Question 2)",
      "options": [
        {"id": "a", "text": "Option A for question 2"},
        {"id": "b", "text": "Option B for question 2"},
        {"id": "c", "text": "Option C for question 2"},
        {"id": "d", "text": "Option D for question 2"}
      ]
    }
  ],
  "time_limit_minutes": 91,
  "pass_threshold": 76,
  "current_tier": "BRONZE",
  "target_tier": "SILVER",
  "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
  "star_level": "TWO"
}
```

### POST /api/app/job-readiness/promotion-exam/submit
**Description:** Submit promotion exam answers. Creates the exam attempt record in database upon submission.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "exam_session_id": "string (session ID from start endpoint)",
  "product_id": "string (UUID)",
  "star_level": "string (TWO/THREE)",
  "current_tier": "string (BRONZE/SILVER)",
  "target_tier": "string (SILVER/GOLD)",
  "questions": "array (questions that were shown)",
  "answers": "array (student's answers)"
}
```

**Example Request Body:**
```json
{
  "exam_session_id": "exam_a9ff4edc-5c2b-4ef9-b66c-76c96ca870a8_1638360000000_x7k9m2n4q",
  "product_id": "c34ab292-8966-40a2-990f-e8957b833db9",
  "star_level": "TWO",
  "current_tier": "BRONZE",
  "target_tier": "SILVER",
  "questions": [
    {
      "id": "q-1",
      "question": "What is the difference between a stack and a queue?",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ]
    }
  ],
  "answers": [
    {"question_id": "q-1", "selected_option": "a"},
    {"question_id": "q-2", "selected_option": "b"}
  ]
}
```

**Response:** 
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
    "You've been promoted to SILVER tier.",
    "Your future modules will now reflect this higher difficulty level."
  ],
  "tier_updated": true,
  "previous_tier": "BRONZE",
  "current_tier": "SILVER",
  "current_star_level": "TWO"
}
```

---

## 8. Test/Utility

### GET /api/app/job-readiness/test/module-access
**Description:** Test endpoint to check module access for debugging purposes.

**Headers:**
```json
{
  "Authorization": "Bearer <auth_token>"
}
```

**Request Body:** None

**Response:** 
```json
// Please test this endpoint in Postman and provide the actual response structure
```

---

## Authentication Notes

All endpoints require valid authentication. The system uses Supabase Auth:
- Include the Authorization header with a valid bearer token
- The student ID is derived from the authenticated user ID
- Access control is based on client assignments and student progress

## Error Responses

Common error response format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `500`: Internal Server Error

---

## Testing Instructions

For each endpoint:

1. **Set up your environment:**
   - Use Postman or similar tool
   - Set the base URL: `http://localhost:3000/api/app/job-readiness` (or your deployed URL)
   - Add the Authorization header with a valid bearer token

2. **Sample bearer token format:**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Sample test data:**
   - Product ID: `c34ab292-8966-40a2-990f-e8957b833db9`
   - Student email: `deepankar@test.com`

4. **For each endpoint:**
   - Send the request with the specified parameters/body
   - Copy the response and replace the placeholder in this document
   - Test both success and error scenarios when possible

5. **When testing:**
   - Start with GET endpoints first to understand the data structure
   - Use actual UUIDs from your database for module_id, product_id, etc.
   - Test with valid authenticated user tokens
   - Document any additional query parameters or special behavior observed

**Example Postman Collection Setup:**
1. Create a new collection named "Job Readiness Frontend APIs"
2. Add environment variables for:
   - `base_url`: `http://localhost:3000`
   - `auth_token`: `your_bearer_token`
   - `product_id`: `c34ab292-8966-40a2-990f-e8957b833db9`
3. Use `{{base_url}}/api/app/job-readiness/...` format in your requests
4. Add `Authorization: Bearer {{auth_token}}` to all requests 