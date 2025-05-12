# Cultus Database Entity Relationship Diagram

This document describes the entity relationships in the Cultus platform database.

## Core Entities

### Users and Authentication

- **auth.users**: Supabase Auth system table (not documented separately)
- **profiles**: Extends auth.users with application-specific user data
- **roles**: Defines the available roles in the system
- **students**: Stores additional information specific to student users

### Educational Content Structure

- **products**: Top-level container for educational content
- **modules**: Individual course or assessment units within products
- **lessons**: Individual lessons within course modules
- **assessment_questions**: Question bank for assessments
- **assessment_module_questions**: Links questions to assessment modules

### Client Management

- **clients**: Stores information about university clients
- **client_product_assignments**: Links clients to products they can access

### Progress Tracking

- **student_product_assignments**: Links students to products they are enrolled in
- **student_module_progress**: Tracks student progress on all module types
- **assessment_progress**: Tracks detailed assessment progress
- **assessment_submissions**: Records completed assessment submissions

## Key Relationships

1. **Product Organization**:
   - Products contain Modules
   - Modules are either courses (contain Lessons) or assessments (linked to Questions)

2. **Multi-tenant Structure**:
   - Clients are assigned Products
   - Users (Profiles) belong to Clients

3. **Student Journey**:
   - Students are assigned to Products
   - Students progress through Modules
   - Student progress is tracked at the Module level

4. **Assessment Flow**:
   - Assessment Modules contain Questions
   - Students progress through Assessments
   - Assessment results are stored in Submissions

## Simplified View

```
auth.users <── profiles <── roles
     │           │
     │           │
     └─────┬─────┘
           │
           ▼
        students <────────────── clients
           │                        │
           │                        │
           ▼                        ▼
student_product_assignments  client_product_assignments
           │                        │
           │                        │
           └───────────┬────────────┘
                       │
                       ▼
                    products
                       │
                       │
                       ▼
                    modules
           ┌───────────┴────────────┐
           │                        │
           ▼                        ▼
       (courses)               (assessments)
           │                        │
           │                        │
           ▼                        ▼
       lessons           assessment_module_questions
                                    │
                                    │
                                    ▼
                         assessment_questions
                                    │
                                    │
        student_module_progress     │
                  │                 │
                  └────────┬────────┘
                           │
                           ▼
                  assessment_progress
                           │
                           │
                           ▼
                 assessment_submissions
```

## Notes

- The database uses UUIDs for primary keys across all tables
- Most tables have timestamps for creation and updates
- Row Level Security (RLS) is enabled on all tables for proper access control
- Many tables use JSONB fields for flexible data storage 