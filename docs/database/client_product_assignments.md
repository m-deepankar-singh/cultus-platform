# Client Product Assignments Table

**Description**: Links clients to the products assigned to them.

## Schema

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| client_id | uuid | No | | Reference to the client. |
| product_id | uuid | No | | Reference to the product. |
| created_at | timestamp with time zone | No | now() | Timestamp when the assignment was created. |

## Primary Key

- Composite key of `client_id` and `product_id`

## Relationships

### References to other tables

- `client_product_assignments.client_id` → `clients.id`
- `client_product_assignments.product_id` → `products.id`

## Row Level Security (RLS)

RLS is enabled for this table.

## Usage Notes

- This is a junction table that implements a many-to-many relationship between clients and products
- It determines which educational products are available to which client institutions
- When a new client is onboarded, entries should be created in this table for each product they have access to
- Client administrators can only see and manage products that have been assigned to their institution
- This table is critical for maintaining proper access control in the multi-tenant system
- The platform's product catalog displayed to a client is filtered based on records in this table 