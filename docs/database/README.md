# Cultus Database Documentation

This directory contains documentation for all tables in the Cultus database.

## Tables

1. [Clients](./clients.md) - Stores information about university clients
2. [Profiles](./profiles.md) - Stores public profile information for each user
3. [Roles](./roles.md) - Defines the set of user roles available in the platform
4. [Products](./products.md) - Stores learning products, containers for modules
5. [Modules](./modules.md) - Stores individual learning modules that belong to a product
6. [Lessons](./lessons.md) - Stores individual lessons that belong to course modules
7. [Students](./students.md) - Stores information specific to student users
8. [Assessment Questions](./assessment_questions.md) - Stores individual questions for assessments
9. [Assessment Module Questions](./assessment_module_questions.md) - Links assessment modules to questions
10. [Assessment Progress](./assessment_progress.md) - Tracks student progress on assessments
11. [Assessment Submissions](./assessment_submissions.md) - Records assessment submissions
12. [Student Module Progress](./student_module_progress.md) - Tracks student progress on modules
13. [Client Product Assignments](./client_product_assignments.md) - Links clients to products
14. [Student Product Assignments](./student_product_assignments.md) - Links students to products

## Enum Types

For information about the custom enumeration types used in the database, see the [Enum Types](./enum_types.md) document.

## Entity Relationship Diagram (ERD)

For a visual representation of how these tables relate to each other, see the [Database ERD](./database-erd.md) document.

## Relationships

The database uses a relational structure with foreign keys connecting tables. Each table documentation includes details about its relationships to other tables. 