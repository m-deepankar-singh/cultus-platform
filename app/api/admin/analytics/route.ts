import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/api-auth";

// Simulated database query - replace with actual database query in production
async function fetchAnalyticsData() {
  // Simulated data
  const statsData = {
    totalLearners: {
      value: 1284,
      trend: { value: 12.5, direction: "up" }
    },
    activeModules: {
      value: 32,
      trend: { value: 4.0, direction: "up" }
    },
    overallCompletionRate: {
      value: 78.5,
      trend: { value: -2.1, direction: "down" }
    },
    overallAverageScore: {
      value: 82.3
    },
    totalClients: {
      value: 15,
      trend: { value: 1.0, direction: "up" }
    }
  };

  const progressOverTime = [
    { periodLabel: "Jan", completions: 38, enrollments: 65 },
    { periodLabel: "Feb", completions: 42, enrollments: 59 },
    { periodLabel: "Mar", completions: 55, enrollments: 80 },
    { periodLabel: "Apr", completions: 62, enrollments: 75 },
    { periodLabel: "May", completions: 78, enrollments: 90 },
    { periodLabel: "Jun", completions: 84, enrollments: 101 }
  ];

  const assessmentScoreDistribution = [
    { rangeLabel: "0-50%", count: 150 },
    { rangeLabel: "51-70%", count: 250 },
    { rangeLabel: "71-85%", count: 400 },
    { rangeLabel: "86-100%", count: 200 }
  ];

  const moduleCompletions = [
    { 
      moduleId: "uuid-module-1", 
      moduleName: "Introduction to Sales", 
      completedCount: 920, 
      inProgressCount: 450 
    },
    { 
      moduleId: "uuid-module-2", 
      moduleName: "Customer Service Excellence", 
      completedCount: 780, 
      inProgressCount: 620 
    },
    { 
      moduleId: "uuid-module-3", 
      moduleName: "Leadership Fundamentals", 
      completedCount: 650, 
      inProgressCount: 350 
    },
    { 
      moduleId: "uuid-module-4", 
      moduleName: "Digital Marketing", 
      completedCount: 450, 
      inProgressCount: 580 
    },
    { 
      moduleId: "uuid-module-5", 
      moduleName: "Project Management", 
      completedCount: 350, 
      inProgressCount: 290 
    }
  ];

  const recentActivity = [
    { 
      activityId: "uuid-activity-1",
      learnerName: "Alex Johnson",
      clientName: "Acme Corp",
      moduleName: "Leadership Fundamentals",
      activityType: "completion",
      timestamp: "2023-11-01T10:30:00Z",
      score: 95
    },
    { 
      activityId: "uuid-activity-2",
      learnerName: "Samantha Wells",
      clientName: "TechSolutions",
      moduleName: "Digital Marketing",
      activityType: "enrollment",
      timestamp: "2023-11-02T14:15:00Z"
    },
    { 
      activityId: "uuid-activity-3",
      learnerName: "Derek Miller",
      clientName: "Global Industries",
      moduleName: "Customer Service Excellence",
      activityType: "completion",
      timestamp: "2023-11-03T09:45:00Z",
      score: 88
    },
    { 
      activityId: "uuid-activity-4",
      learnerName: "Emily Chen",
      clientName: "Acme Corp",
      moduleName: "Project Management",
      activityType: "completion",
      timestamp: "2023-11-03T16:20:00Z",
      score: 75
    },
    { 
      activityId: "uuid-activity-5",
      learnerName: "Jason Parker",
      clientName: "NextGen Inc",
      moduleName: "Introduction to Sales",
      activityType: "assessment_failed",
      timestamp: "2023-11-04T11:10:00Z",
      score: 45
    }
  ];

  return {
    stats: statsData,
    progressOverTime,
    assessmentScoreDistribution,
    moduleCompletions,
    recentActivity
  };
}

export async function GET() {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, supabase } = authResult;
    
    // In a real implementation, we'd:
    // 1. ✅ User authentication and authorization completed (Admin/Staff roles verified)
    // 2. Query the database for real analytics data based on user permissions
    // 3. Process and aggregate the data as needed
    
    const analyticsData = await fetchAnalyticsData();

    return NextResponse.json(analyticsData, { status: 200 });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
} 