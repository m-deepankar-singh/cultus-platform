# Clients Table

**Description**: Stores information about university clients.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Unique identifier for the client. |
| created_at | timestamp with time zone | No | now() | Timestamp when the client was created. |
| updated_at | timestamp with time zone | No | now() | Timestamp when the client was last updated. |
| name | text | No | | Name of the university or client organization. |
| contact_email | text | Yes | | Primary contact email for the client. |
| address | text | Yes | | Physical address of the client. |
| logo_url | text | Yes | | URL pointing to the client's logo image. |
| is_active | boolean | No | true | Flag indicating if the client account is active (true) or inactive (false). |

## Primary Key

- `id`: uuid

## Relationships

### References from other tables

- `profiles.client_id` → `clients.id`
- `client_product_assignments.client_id` → `clients.id`
- `students.client_id` → `clients.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This table is central to the multi-tenant structure of the application
- Each client represents a university or educational institution
- The `is_active` flag can be used to temporarily disable access for an entire institution 