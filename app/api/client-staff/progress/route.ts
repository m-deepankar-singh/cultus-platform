import { NextResponse } from 'next/server';
import { type NextRequest } from "next/server";
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Define types for cleaner data handling

/**
 * GET /api/client-staff/progress
 * Fetches progress data for students associated with the authenticated Client Staff's client,
 * or for a specific client if requested by an Admin.
 * Allows filtering by studentId, productId, moduleId.
 */
export async function GET(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['client_staff', 'admin', 'staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { claims } = authResult;

    // Get role and client_id from JWT claims
    const userRole = claims.user_role;
    const userClientId = claims.client_id;

    // Get clientId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get("clientId");
    
    // If no clientId provided, use the user's client_id (for client staff)
    const targetClientId = clientId || userClientId;
    
    if (!targetClientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Authorization check: Client Staff can only access their own client's data
    if (userRole === 'Client Staff' && targetClientId !== userClientId) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to this client's data" },
        { status: 403 }
      );
    }
    
    // In a real implementation, we'd query the database for real client progress data
    // For now, simulate data with the authenticated client context
    const clientProgressData = fetchClientProgressData(targetClientId);
    
    return NextResponse.json(clientProgressData, { status: 200 });
  } catch (error) {
    console.error("Error fetching client progress data:", error);
    return NextResponse.json(
      { error: "Failed to fetch client progress data" },
      { status: 500 }
    );
  }
}

// Simulated database query - replace with actual database query in production
function fetchClientProgressData(clientId: string) {
  // This is simulated data - in a real implementation, 
  // you'd fetch this from your database based on the clientId
  
  const clientInfo = {
    id: clientId,
    name: "Acme Corporation",
    totalLearners: 42,
    activeLearners: 35,
    assignedModulesCount: 5
  };
  
  const overviewStats = {
    averageCompletionRate: 72.4,
    averageAssessmentScore: 84.2
  };
  
  const weeklyActivity = [
    { weekLabel: "Oct 2-8", courseCompletions: 4, assessmentsTaken: 2 },
    { weekLabel: "Oct 9-15", courseCompletions: 6, assessmentsTaken: 3 },
    { weekLabel: "Oct 16-22", courseCompletions: 8, assessmentsTaken: 5 },
    { weekLabel: "Oct 23-29", courseCompletions: 5, assessmentsTaken: 3 },
    { weekLabel: "Oct 30-Nov 5", courseCompletions: 7, assessmentsTaken: 4 }
  ];
  
  const moduleBreakdown = [
    { 
      moduleId: "m1", 
      moduleName: "Introduction to Sales", 
      moduleType: "course",
      enrolledLearnerCount: 32,
      averageCompletion: 78,
      averageScore: null,
      statusCounts: {
        completed: 18, 
        in_progress: 10,
        not_started: 4,
        passed: null,
        failed: null
      }
    },
    { 
      moduleId: "m2", 
      moduleName: "Customer Service Excellence", 
      moduleType: "course",
      enrolledLearnerCount: 28,
      averageCompletion: 65,
      averageScore: null,
      statusCounts: {
        completed: 12,
        in_progress: 14,
        not_started: 2,
        passed: null,
        failed: null
      }
    },
    { 
      moduleId: "m3", 
      moduleName: "Sales Assessment", 
      moduleType: "assessment",
      enrolledLearnerCount: 22,
      averageCompletion: null,
      averageScore: 82,
      statusCounts: {
        completed: null,
        in_progress: null,
        not_started: 4,
        passed: 15,
        failed: 3
      }
    }
  ];
  
  const learnerProgress = [
    { 
      learnerId: "1", 
      learnerName: "Alex Johnson", 
      assignedModulesCount: 3, 
      averageProgressPercent: 85, 
      assessmentsPassedCount: 2, 
      lastActivityTimestamp: "2023-10-28T15:00:00Z" 
    },
    { 
      learnerId: "2", 
      learnerName: "Maria Garcia", 
      assignedModulesCount: 2, 
      averageProgressPercent: 62, 
      assessmentsPassedCount: 1, 
      lastActivityTimestamp: "2023-10-30T09:45:00Z" 
    },
    { 
      learnerId: "3", 
      learnerName: "David Chen", 
      assignedModulesCount: 4, 
      averageProgressPercent: 95, 
      assessmentsPassedCount: 4, 
      lastActivityTimestamp: "2023-11-01T14:30:00Z" 
    },
    { 
      learnerId: "4", 
      learnerName: "Sarah Williams", 
      assignedModulesCount: 2, 
      averageProgressPercent: 42, 
      assessmentsPassedCount: 0, 
      lastActivityTimestamp: "2023-10-25T11:15:00Z" 
    },
    { 
      learnerId: "5", 
      learnerName: "Michael Brown", 
      assignedModulesCount: 1, 
      averageProgressPercent: 28, 
      assessmentsPassedCount: 0, 
      lastActivityTimestamp: "2023-10-29T16:20:00Z" 
    }
  ];
  
  return {
    clientInfo,
    overviewStats,
    weeklyActivity,
    moduleBreakdown,
    learnerProgress
  };
}
