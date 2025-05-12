# Products Table

**Description**: Stores learning products, which act as containers for modules (courses, assessments).

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Unique identifier for the product. |
| created_at | timestamp with time zone | No | now() | Timestamp when the product was created. |
| updated_at | timestamp with time zone | No | now() | Timestamp when the product was last updated. |
| name | text | No | | Name of the learning product. |
| description | text | Yes | | Optional description of the product. |
| created_by | uuid | Yes | | Identifier of the admin user (profile) who created the product. |
| image_url | text | Yes | | URL to an image representing the product. |

## Primary Key

- `id`: uuid

## Relationships

### References to other tables

- `products.created_by` → `profiles.id`

### References from other tables

- `modules.product_id` → `products.id`
- `client_product_assignments.product_id` → `products.id`
- `student_product_assignments.product_id` → `products.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- Products represent the top-level container for educational content
- Each product can contain multiple modules (courses, assessments)
- Products are assigned to clients via the `client_product_assignments` table
- Students are assigned to products via the `student_product_assignments` table
- The `created_by` field records which admin user created the product
- The `image_url` can be used for displaying a thumbnail or banner image for the product 