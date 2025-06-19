import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { authenticateApiRequest } from '@/lib/auth/api-auth';

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
    
    // In a real implementation, we'd:
    // 1. Verify the user has access to this specific client's data (now done above)
    // 2. Query the database for real client progress data
    // 3. Generate an Excel file with proper formatting
    
    // For demo purposes, we'll create a simple CSV
    // In production, use a proper Excel library (exceljs, xlsx, etc.)
    
    // Get client data to determine file name
    const clientName = "Acme-Corporation"; // In real impl, fetch from DB based on targetClientId
    const csvData = generateDummyClientProgressCsv(targetClientId);
    
    // Convert string to Blob
    const bytes = new TextEncoder().encode(csvData);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    
    // Create response with the appropriate headers
    const response = new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${clientName.toLowerCase()}-progress-report.xlsx"`,
      },
    });
    
    return response;
  } catch (error) {
    console.error("Error generating client progress export:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}

// Simulated data generator
function generateDummyClientProgressCsv(clientId: string) {
  const header1 = ["Client Progress Report", "", "", "", ""];
  const header2 = ["Client ID:", clientId, "", "Generated:", new Date().toLocaleString()];
  const header3 = ["", "", "", "", ""];
  const separator = ["", "", "", "", ""];
  
  const learnerHeaders = ["Learner Progress", "", "", "", ""];
  const learnerColumns = ["Learner Name", "Assigned Modules", "Average Progress", "Assessments Passed", "Last Activity"];
  const learnerData = [
    ["Alex Johnson", "3", "85%", "2", "2023-10-28"],
    ["Maria Garcia", "2", "62%", "1", "2023-10-30"],
    ["David Chen", "4", "95%", "4", "2023-11-01"],
    ["Sarah Williams", "2", "42%", "0", "2023-10-25"],
    ["Michael Brown", "1", "28%", "0", "2023-10-29"]
  ];
  
  const moduleHeaders = ["Module Progress", "", "", "", ""];
  const moduleColumns = ["Module Name", "Type", "Enrolled Learners", "Average Completion", "Status Breakdown"];
  const moduleData = [
    ["Introduction to Sales", "Course", "32", "78%", "18 Completed, 10 In Progress, 4 Not Started"],
    ["Customer Service Excellence", "Course", "28", "65%", "12 Completed, 14 In Progress, 2 Not Started"],
    ["Sales Assessment", "Assessment", "22", "82% (avg score)", "15 Passed, 3 Failed, 4 Not Started"]
  ];
  
  // Combine all the data
  const allRows = [
    header1.join(","),
    header2.join(","),
    header3.join(","),
    separator.join(","),
    learnerHeaders.join(","),
    learnerColumns.join(","),
    ...learnerData.map(row => row.join(",")),
    separator.join(","),
    moduleHeaders.join(","),
    moduleColumns.join(","),
    ...moduleData.map(row => row.join(","))
  ];
  
  return allRows.join("\n");
} 