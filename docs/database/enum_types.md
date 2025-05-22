# Enum Types

This document describes the custom enumeration types defined in the Cultus database.

## module_type

Defines the types of learning modules in the system.

**Values**:
- `Course`: A module containing lessons for learning content
- `Assessment`: A module containing questions for evaluation
- `Project`: A module for AI-generated real-world projects
- `Interview`: A module for simulated interview sessions
- `Expert_Session`: A module for tracking expert-led training sessions

**Used in**:
- Not directly used in a column, but referenced in application logic to differentiate between module types (the `modules.type` column uses text, not this enum)

## progress_status

Tracks the status of a student's progress on a module.

**Values**:
- `NotStarted`: The student has not begun the module
- `InProgress`: The student has started but not completed the module
- `Completed`: The student has finished the module

**Used in**:
- `student_module_progress.status`: Current completion status of the student for the module

## question_type_enum

Defines the types of questions available in assessments.

**Values**:
- `MCQ` (Multiple Choice Question): A question with a single correct answer
- `MSQ` (Multiple Select Question): A question with multiple correct answers
- `TF` (True/False): A binary choice question

**Used in**:
- `assessment_questions.question_type`: Indicates the type of assessment question 

## job_readiness_difficulty_tier

Defines the difficulty tiers for the Job Readiness product.

**Values**:
- `BRONZE`: The entry-level tier
- `SILVER`: The intermediate tier
- `GOLD`: The advanced tier

**Used in**:
- `students.job_readiness_tier`: Student's current tier in Job Readiness
- `job_readiness_promotion_exam_attempts.current_tier`: Student's tier when attempting promotion exam
- `job_readiness_promotion_exam_attempts.target_tier`: Target tier for promotion exam

## job_readiness_star_level

Tracks student progress through the Job Readiness 5-star system.

**Values**:
- `ONE`: Completed initial assessments
- `TWO`: Completed courses with AI quizzes
- `THREE`: Completed expert sessions
- `FOUR`: Completed real-world project
- `FIVE`: Completed simulated interview

**Used in**:
- `students.job_readiness_star_level`: Student's current star level
- `job_readiness_promotion_exam_attempts.star_level`: Star level when attempting promotion exam

## student_background_type

Classifies students by academic/professional background for tailored content.

**Values**:
- `ECONOMICS`: Economics background
- `COMPUTER_SCIENCE`: Computer Science background
- `MARKETING`: Marketing background
- `DESIGN`: Design background
- `HUMANITIES`: Humanities background
- `BUSINESS`: Business background
- `ENGINEERING`: Engineering background

**Used in**:
- `students.job_readiness_background_type`: Student's academic/professional background
- `job_readiness_background_project_types.background_type`: Background for project type mapping
- `job_readiness_background_interview_types.background_type`: Background for interview type mapping

## job_readiness_project_type

Defines types of projects generated for different student backgrounds.

**Values**:
- `CASE_STUDY`: Analysis of business scenarios
- `CODING_PROJECT`: Software development projects
- `MARKETING_PLAN`: Marketing campaign planning
- `DESIGN_CONCEPT`: Design concept creation
- `RESEARCH_OUTLINE`: Academic/business research planning
- `BUSINESS_PLAN`: Business plan development

**Used in**:
- `job_readiness_background_project_types.project_type`: Type of project for a background
- `job_readiness_ai_project_submissions.project_type`: Type of submitted project 