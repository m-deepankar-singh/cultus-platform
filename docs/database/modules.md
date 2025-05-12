# Modules Table

**Description**: Stores individual learning modules (e.g., courses, assessments) that belong to a product.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Unique identifier for the module. |
| created_at | timestamp with time zone | No | now() | Timestamp when the module was created. |
| updated_at | timestamp with time zone | No | now() | Timestamp when the module was last updated. |
| product_id | uuid | No | | Reference to the product this module belongs to. |
| type | text | No | | Type of the learning module (e.g., 'course', 'assessment'). |
| name | text | No | | Name of the module. |
| sequence | integer | No | 0 | Order of the module within its product. |
| configuration | jsonb | Yes | | JSONB field to store configuration specific to the module type (e.g., time limits, video URLs). |
| created_by | uuid | Yes | | Identifier of the admin user (profile) who created the module. |

## Primary Key

- `id`: uuid

## Relationships

### References to other tables

- `modules.product_id` → `products.id`
- `modules.created_by` → `profiles.id`

### References from other tables

- `student_module_progress.module_id` → `modules.id`
- `assessment_module_questions.module_id` → `modules.id`
- `assessment_progress.module_id` → `modules.id`
- `lessons.module_id` → `modules.id`
- `assessment_submissions.assessment_id` → `modules.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- Modules are the building blocks of educational content in the platform
- They can be either courses (with lessons) or assessments (with questions)
- The `type` field determines what kind of module it is
- The `configuration` field contains module-specific settings in JSON format
- For course modules, the related lessons are stored in the `lessons` table
- For assessment modules, questions are linked via the `assessment_module_questions` table
- Student progress on modules is tracked in `student_module_progress` and `assessment_progress` tables
- The `sequence` field determines the order in which modules appear within a product 