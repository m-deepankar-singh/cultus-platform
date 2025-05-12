# Enum Types

This document describes the custom enumeration types defined in the Cultus database.

## module_type

Defines the types of learning modules in the system.

**Values**:
- `Course`: A module containing lessons for learning content
- `Assessment`: A module containing questions for evaluation

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