# Lessons Table

**Description**: Stores individual lessons that belong to course modules.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Unique identifier for the lesson |
| created_at | timestamp with time zone | No | now() | Timestamp when the lesson was created |
| updated_at | timestamp with time zone | No | now() | Timestamp when the lesson was last updated |
| module_id | uuid | No | | ID of the course module this lesson belongs to |
| title | text | No | | Title of the lesson |
| description | text | Yes | | Description of the lesson contents |
| video_url | text | Yes | | URL to the video for this lesson |
| sequence | integer | No | 0 | Order of the lesson within the module |
| has_quiz | boolean | No | false | Whether this lesson has an associated quiz |
| quiz_data | jsonb | Yes | | JSON data for the quiz associated with this lesson |
| quiz_questions | jsonb | Yes | | JSON structure containing the quiz questions |

## Primary Key

- `id`: uuid

## Relationships

### References to other tables

- `lessons.module_id` → `modules.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- Lessons are the individual content units within course modules
- The `sequence` field determines the order in which lessons appear within a module
- Lessons can include embedded video content via the `video_url` field
- Lessons can optionally include a quiz (when `has_quiz` is true)
- For lessons with quizzes, the quiz data is stored directly in the `quiz_data` and `quiz_questions` JSONB fields
- Unlike assessments, lesson quizzes are typically simpler and stored directly with the lesson rather than in separate tables 