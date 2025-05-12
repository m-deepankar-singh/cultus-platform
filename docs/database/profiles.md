# Profiles Table

**Description**: Stores public profile information for each user, extending auth.users.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | | User ID, references the id field in auth.users. |
| updated_at | timestamp with time zone | No | now() | Timestamp when the profile was last updated. |
| full_name | text | No | | Full name of the user (Mandatory). |
| role | text | No | 'student' | Role assigned to the user (e.g., admin, staff, student). Determines permissions. |
| client_id | uuid | Yes | | Identifier for the client (university) the user belongs to (if applicable). |
| is_active | boolean | No | true | Flag indicating if the user account is currently active. |
| is_enrolled | boolean | No | false | Flag indicating if the user (specifically a student) is currently enrolled and allowed access to the Main App. |
| status | text | No | 'active' | Current status of the user. Must be either 'active' or 'inactive'. |

## Primary Key

- `id`: uuid

## Relationships

### References to other tables

- `profiles.id` → `auth.users.id`
- `profiles.client_id` → `clients.id`

### References from other tables

- `products.created_by` → `profiles.id`
- `modules.created_by` → `profiles.id`
- `assessment_questions.created_by` → `profiles.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table extends the Supabase Auth system with application-specific user data
- The `role` field is critical for access control throughout the application
- For students, there is also additional information stored in the `students` table
- `is_active` can be used to disable individual user accounts
- `is_enrolled` specifically applies to student access to the Main App 