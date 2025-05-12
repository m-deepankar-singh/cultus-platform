# Assessment Module Questions Table

**Description**: Links assessment modules to their constituent questions.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| module_id | uuid | No | | Reference to the assessment module. |
| question_id | uuid | No | | Reference to the question. |
| sequence | integer | No | 0 | Order of the question within the assessment module. |
| created_at | timestamp with time zone | No | now() | Timestamp when the question was added to the module. |

## Primary Key

- Composite key of `module_id` and `question_id`

## Relationships

### References to other tables

- `assessment_module_questions.module_id` → `modules.id`
- `assessment_module_questions.question_id` → `assessment_questions.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This is a junction table that links assessment modules to their questions
- The many-to-many relationship allows:
  - One question to be used in multiple assessment modules
  - One assessment module to contain multiple questions
- The `sequence` field determines the order in which questions appear within an assessment
- When assembling an assessment, the application should query this table to get the questions in the correct order
- When adding new questions to an assessment, the `sequence` field should be carefully managed to maintain the desired order 