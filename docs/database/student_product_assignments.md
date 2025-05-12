# Student Product Assignments Table

**Description**: Links students to products they are enrolled in.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| student_id | uuid | No | | Reference to the student user. |
| product_id | uuid | No | | Reference to the product. |
| created_at | timestamp with time zone | No | now() | Timestamp when the enrollment was created. |

## Primary Key

- Composite key of `student_id` and `product_id`

## Relationships

### References to other tables

- `student_product_assignments.product_id` → `products.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This is a junction table that implements a many-to-many relationship between students and products
- It determines which educational products each student can access
- When a student is enrolled in a program, an entry is created in this table
- A student can only see and access products in which they are enrolled
- The student dashboard displays only products that have entries in this table for the current student
- This table is essential for controlling student access to educational content
- The `created_at` field can be used to track when a student was enrolled in a product 