// lib/types/index.ts

/**
 * Defines the possible user roles within the application.
 */
export enum Role {
  Admin = 'Admin', // Super administrator with full access
  ClientAdmin = 'ClientAdmin', // Administrator for a specific client organization
  ClientStaff = 'ClientStaff', // Staff member for a specific client organization (e.g., manager, instructor)
  Student = 'Student', // End-user participating in courses/assessments
  Viewer = 'Viewer', // Role with read-only access to reports/analytics
  // Add other roles as needed, ensuring they match database constraints
}

// Export other shared application-wide types below
