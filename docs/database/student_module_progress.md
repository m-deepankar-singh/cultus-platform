# Student Module Progress Table

**Description**: Tracks individual student progress within specific modules.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| student_id | uuid | No | | Reference to the student user. |
| module_id | uuid | No | | Reference to the module. |
| status | progress_status | No | 'NotStarted' | Current completion status of the student for the module. |
| score | numeric | Yes | | Score achieved by the student (primarily for assessments). |
| progress_details | jsonb | Yes | | JSONB field to store module-type specific progress data. |
| last_updated | timestamp with time zone | No | now() | Timestamp when the progress was last updated. |
| completed_at | timestamp with time zone | Yes | | Timestamp when the module was completed. |
| progress_percentage | integer | Yes | | Percentage completion of the module (0-100). |

## Primary Key

- Composite key of `student_id` and `module_id`

## Relationships

### References to other tables

- `student_module_progress.module_id` → `modules.id`
- `student_module_progress.student_id` → `auth.users.id`

## Enums

- `progress_status`: Allowed values are 'NotStarted', 'InProgress', 'Completed'

## Check Constraints

- `progress_percentage >= 0 AND progress_percentage <= 100`: Ensures progress percentage is between 0 and 100

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table is the central record of student progress across all module types
- The `status` field uses an enum type to ensure consistent status values
- Progress is tracked differently depending on module type:
  - For course modules, progress might be based on lesson completion
  - For assessment modules, progress is based on assessment completion and scores
- The `progress_details` JSONB field allows for storing module-type specific progress information
- The `progress_percentage` provides a normalized way to display progress across different module types
- Progress reporting and analytics features rely heavily on this table 