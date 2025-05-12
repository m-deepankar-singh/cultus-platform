# Assessment Progress Table

**Description**: Tracks student progress and submissions for assessment modules.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| student_id | uuid | No | | Reference to the student user. |
| module_id | uuid | No | | Reference to the assessment module. |
| submitted_at | timestamp with time zone | Yes | | Timestamp when the assessment was submitted. Null if not submitted. |
| score | numeric | Yes | | Score achieved by the student (0-100 or similar). |
| passed | boolean | Yes | | Indicates if the student passed the assessment based on criteria. |
| answers | jsonb | Yes | | The answers submitted by the student (JSONB). |
| duration_seconds | integer | Yes | | Time taken by the student to complete the assessment. |
| saved_answers | jsonb | Yes | | Partial answers saved by the student before final submission. |
| started_at | timestamp with time zone | Yes | now() | Timestamp when the student started the assessment. |
| last_updated | timestamp with time zone | Yes | now() | Timestamp when the progress was last updated. |
| remaining_time_seconds | integer | Yes | | Time remaining for timed assessments. |
| timer_paused | boolean | Yes | false | Indicates if the assessment timer is currently paused. |

## Primary Key

- Composite key of `student_id` and `module_id`

## Relationships

### References to other tables

- `assessment_progress.module_id` → `modules.id`
- `assessment_progress.student_id` → `auth.users.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table tracks detailed student progress on assessments
- It stores both in-progress data (`saved_answers`) and completed assessment data (`answers`, `score`)
- The `submitted_at` field being null indicates the assessment is still in progress
- For timed assessments, the `remaining_time_seconds` and `timer_paused` fields help manage the time constraints
- The relationship between `student_id` and `module_id` ensures each student has only one progress record per assessment
- This table is primarily used during the assessment-taking process, while final results are stored in `assessment_submissions` 