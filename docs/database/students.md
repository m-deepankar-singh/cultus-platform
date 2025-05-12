# Students Table

**Description**: Stores information specific to student users accessing the Main App.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | | Student User ID, references the id field in auth.users. |
| created_at | timestamp with time zone | No | now() | Timestamp when the student record was created. |
| updated_at | timestamp with time zone | No | now() | Timestamp when the student record was last updated. |
| client_id | uuid | No | | Identifier of the client (university) the student belongs to. |
| full_name | text | No | | Full name of the student (Mandatory). |
| is_active | boolean | No | true | Flag indicating if the student account is active and allowed access to the Main App. |
| email | text | Yes | | Student's email address (synced with auth.users). |
| phone_number | text | Yes | | Student's phone number. |
| star_rating | smallint | Yes | | Student rating on a scale from 0-5. |
| last_login_at | timestamp with time zone | Yes | | Timestamp of the student's last successful login. |
| temporary_password | text | Yes | | Temporarily stores the initial password when a new learner is created. For admin reference only. |

## Primary Key

- `id`: uuid

## Relationships

### References to other tables

- `students.id` → `auth.users.id`
- `students.client_id` → `clients.id`

## Check Constraints

- `star_rating >= 0 AND star_rating <= 5`: Ensures star rating is between 0 and 5

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table stores detailed information about students (learners)
- The `id` field links to the Supabase Auth system
- The `client_id` field establishes the university/institution the student belongs to
- Student access to the platform can be controlled with the `is_active` flag
- The `temporary_password` field is only used during account creation and should be cleared after the student's first login
- The `star_rating` field can be used for student performance metrics or faculty ratings 