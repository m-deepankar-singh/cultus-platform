# Progress & Analytics API Plan

This plan outlines the expected data and structure from backend API endpoints needed to populate the frontend progress monitoring and analytics views.

## Overview

The goal is to provide the necessary data for:
1.  **Platform-Wide Analytics Dashboard (`/app/(dashboard)/dashboard/page.tsx`)**: Primarily for Viewer roles (potentially Admin/Staff too).
2.  **Client-Specific Reports (`/app/(dashboard)/clients/[clientId]/reports/page.tsx`)**: Primarily for Client Staff roles (potentially Staff/Admin too).

We will use the components `DataCard`, `ChartCard`, `CourseProgress`, `AssessmentStatus`, and various tables/lists to display this data.

## 1. Platform-Wide Analytics API

**Endpoint:** `/api/admin/analytics` (To be created, accessible by Viewer/Admin/Staff)
**Method:** `GET`
**Purpose:** Provide aggregated data for the main dashboard view.

**Required Data Points & Structure:**

```json
{
  "stats": {
    "totalLearners": {
      "value": 1284, // Integer
      "trend": { 
        "value": 12.5, // Float (percentage change)
        "direction": "up" | "down" | "neutral" 
      }
    },
    "activeModules": {
      "value": 32, // Integer
      "trend": { "value": 4.0, "direction": "up" } 
    },
    "overallCompletionRate": {
      "value": 78.5, // Float (percentage)
      "trend": { "value": -2.1, "direction": "down" } 
    },
    "overallAverageScore": {
      "value": 82.3, // Float (percentage)
      // Trend is optional here, might be less meaningful
    },
    "totalClients": {
      "value": 15, // Integer
      "trend": { "value": 1.0, "direction": "up" } 
    }
  },
  "progressOverTime": [
    // Array of data points for line/bar chart (e.g., last 6 months)
    { "periodLabel": "Jan", "completions": 38, "enrollments": 65 },
    { "periodLabel": "Feb", "completions": 42, "enrollments": 59 },
    // ... more periods
  ],
  "assessmentScoreDistribution": [
    // Array of data points for pie chart
    { "rangeLabel": "0-50%", "count": 150 },
    { "rangeLabel": "51-70%", "count": 250 },
    { "rangeLabel": "71-85%", "count": 400 },
    { "rangeLabel": "86-100%", "count": 200 }
  ],
  "moduleCompletions": [
     // Array for bar chart/table showing top modules
    { 
      "moduleId": "uuid-module-1", 
      "moduleName": "Introduction to Sales", 
      "completedCount": 920, 
      "inProgressCount": 450 
    },
    // ... more modules
  ],
  "recentActivity": [
     // Array for activity feed (limit to e.g., last 10-20 activities)
    {
      "activityId": "uuid-activity-1",
      "learnerName": "Alex Johnson",
      "clientName": "Acme Corp",
      "moduleName": "Leadership Fundamentals",
      "activityType": "completion" | "assessment_passed" | "assessment_failed" | "enrollment", // More granular status
      "timestamp": "2023-11-01T10:30:00Z", // ISO 8601 date string
      "score": 95 // Optional: Float/Integer (percentage)
    },
    // ... more activities
  ]
}
```

## 2. Client-Specific Progress API

**Endpoint:** `/api/client-staff/progress`
**Method:** `GET`
**Query Parameter:** `clientId` (UUID)
**Purpose:** Provide detailed progress data for learners belonging to a specific client.

**Required Data Points & Structure:**

```json
{
  "clientInfo": {
    "id": "uuid-client-1",
    "name": "Acme Corporation",
    "totalLearners": 42,
    "activeLearners": 35, // Learners with recent activity
    "assignedModulesCount": 5 // Modules assigned via products to this client
  },
  "overviewStats": {
      "averageCompletionRate": 72.4, // Float (percentage, for courses within this client)
      "averageAssessmentScore": 84.2 // Float (percentage, for assessments within this client)
  },
  "weeklyActivity": [
    // Array of data points for bar chart (e.g., last 5 weeks)
    { "weekLabel": "Oct 2-8", "courseCompletions": 4, "assessmentsTaken": 2 },
    { "weekLabel": "Oct 9-15", "courseCompletions": 6, "assessmentsTaken": 3 },
    // ... more weeks
  ],
  "moduleBreakdown": [
    // Array detailing progress for each module assigned to this client
    {
      "moduleId": "uuid-module-1",
      "moduleName": "Introduction to Sales",
      "moduleType": "course", // "course" | "assessment"
      "enrolledLearnerCount": 32,
      "averageCompletion": 78, // Float (percentage, only for course type)
      "averageScore": null, // Float (percentage, only for assessment type)
      "statusCounts": { // Counts of learners in each status for this module
        "completed": 18, 
        "in_progress": 10,
        "not_started": 4,
        "passed": null, // Only for assessment type
        "failed": null  // Only for assessment type
      }
    },
    {
      "moduleId": "uuid-module-3",
      "moduleName": "Sales Assessment",
      "moduleType": "assessment",
      "enrolledLearnerCount": 22,
      "averageCompletion": null, 
      "averageScore": 82,
      "statusCounts": {
        "completed": null,
        "in_progress": null,
        "not_started": 4, 
        "passed": 15,
        "failed": 3
      }
    },
    // ... more modules
  ],
  "learnerProgress": [
    // Array detailing progress for each learner in this client
    {
      "learnerId": "uuid-learner-1",
      "learnerName": "Alex Johnson",
      "assignedModulesCount": 3,
      "averageProgressPercent": 85, // Float (overall course progress average)
      "assessmentsPassedCount": 2,
      "lastActivityTimestamp": "2023-10-28T15:00:00Z" // ISO 8601 date string
    },
    // ... more learners (potentially paginated)
  ]
}
```

## 3. Export APIs

*   **`/api/admin/analytics/export`**: Should generate an Excel file containing data similar to the Platform-Wide Analytics API response, but likely in a more tabular format suitable for export (e.g., detailed learner lists, module breakdowns). Response should have appropriate `Content-Type` (e.g., `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) and `Content-Disposition` headers.
*   **`/api/client-staff/progress/export?clientId={uuid}`**: Should generate an Excel file containing data similar to the Client-Specific Progress API response, focusing on the learners and modules for that specific client. Response should have appropriate `Content-Type` and `Content-Disposition` headers.

This plan provides a target for the backend development team to ensure the frontend receives the necessary data to populate the analytics and reporting views effectively. 