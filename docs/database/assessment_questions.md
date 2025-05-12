# Assessment Questions Table

**Description**: Stores individual questions for assessments.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Unique identifier for the question. |
| created_at | timestamp with time zone | No | now() | Timestamp when the question was created. |
| updated_at | timestamp with time zone | No | now() | Timestamp when the question was last updated. |
| question_text | text | No | | The text content of the question. |
| options | jsonb | Yes | | Possible answer choices. Recommended structure: [{ "id": "opt1", "text": "Option 1 Text" }, ...] |
| correct_answer | jsonb | No | | The correct answer(s). Recommended structure depends on question_type: MCQ/TF: { "answer": "correct_option_id \| boolean" }, MSQ: { "answers": ["id1", "id2"] } |
| created_by | uuid | Yes | | The user who created the question. |
| difficulty | text | Yes | | Difficulty level of the question (e.g., easy, medium, hard). |
| topic | text | Yes | | Subject/topic the question belongs to. |
| question_type | question_type_enum | No | | Type of question (MCQ: Multiple Choice, MSQ: Multiple Select, TF: True/False). |

## Primary Key

- `id`: uuid

## Relationships

### References to other tables

- `assessment_questions.created_by` → `profiles.id`

### References from other tables

- `assessment_module_questions.question_id` → `assessment_questions.id`

## Enums

- `question_type_enum`: Allowed values are 'MCQ', 'MSQ', 'TF'

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table stores the question bank for assessments
- Questions can be of different types as indicated by the `question_type` field:
  - MCQ (Multiple Choice Question): Single correct answer
  - MSQ (Multiple Select Question): Multiple correct answers
  - TF (True/False): Boolean answer
- The `options` field contains the possible answers in JSON format
- The `correct_answer` field stores the correct answer(s) in JSON format
- Questions are assigned to assessment modules via the `assessment_module_questions` table
- Questions can be categorized by `difficulty` and `topic` for easier management
- The `created_by` field tracks which admin created the question 