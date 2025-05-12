# Assessment Submissions Table

**Description**: Records assessment submissions and final results for reporting and analytics.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Unique identifier for the submission. |
| student_id | uuid | No | | Reference to the student user. |
| assessment_id | uuid | No | | Reference to the assessment module. |
| score | integer | No | | Percentage score (0-100). |
| passed | boolean | No | | Whether the student passed the assessment. |
| total_questions | integer | No | | Total number of questions in the assessment. |
| correct_answers | integer | No | | Number of questions answered correctly. |
| submitted_at | timestamp with time zone | No | now() | Timestamp when the assessment was submitted. |
| created_at | timestamp with time zone | No | now() | Timestamp when the record was created. |
| updated_at | timestamp with time zone | No | now() | Timestamp when the record was last updated. |

## Primary Key

- `id`: uuid

## Relationships

### References to other tables

- `assessment_submissions.student_id` → `auth.users.id`
- `assessment_submissions.assessment_id` → `modules.id`

## Check Constraints

- `score >= 0 AND score <= 100`: Ensures score is between 0 and 100

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table stores the final submission data for completed assessments
- Unlike `assessment_progress`, this table can have multiple entries per student and assessment (for multiple attempts)
- Each record represents a complete assessment submission
- The detailed answers are not stored here (they remain in `assessment_progress`)
- This table is primarily used for reporting, analytics, and displaying student results
- The `passed` field is determined by whether the score meets or exceeds the passing threshold for the assessment 