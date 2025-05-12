# Roles Table

**Description**: Defines the set of user roles available in the platform.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| role_name | text | No | | Unique identifier and name for the role. |
| description | text | Yes | | A brief description of what the role entails. |

## Primary Key

- `role_name`: text

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table defines the available roles in the system
- Common roles might include:
  - `admin`: Platform administrators with full access
  - `staff`: Staff members who can manage content but have limited administrative access
  - `client_admin`: Administrators for specific client institutions
  - `student`: Learners who access educational content
- The `role_name` values are referenced in the `profiles.role` field
- This table primarily serves as a reference table and is typically not modified during normal operation
- Changes to this table should be carefully considered as they affect system-wide permissions
- Documentation for each role should be maintained in the `description` field 