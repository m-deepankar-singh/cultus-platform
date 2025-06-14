import { NextResponse } from 'next/server';
import { utils, write } from 'xlsx';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { createClient } from '@/lib/supabase/server';

// Define types for the data we're working with
interface Student {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  is_active: boolean;
  client_id: string;
  created_at?: string;
  last_login_at?: string;
}

interface Module {
  id: string;
  name: string;
  type: string;
  product_id: string;
}

interface ModuleProgress {
  student_id: string;
  module_id: string;
  status: string;
  progress_percentage: number;
  completed_at?: string;
  module?: Module;
}

// Constants for pagination and performance
const BATCH_SIZE = 1000; // Process 1000 students at a time
const MAX_TOTAL_RECORDS = 10000; // Cap at 10,000 records for safety
const EXPORT_TIMEOUT = 120000; // 2-minute timeout for large exports

/**
 * GET /api/admin/learners/export
 * 
 * Generates and returns an Excel file with learner data.
 * Can be filtered by client_id or return all learners.
 * Only accessible by Admin and Staff roles.
 * Optimized for large datasets with pagination and batching.
 */
export async function GET(request: Request) {
  // Set a longer timeout for large exports
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXPORT_TIMEOUT);
  
  try {
    // 1. Authentication & Authorization (reused from bulk-upload endpoints)
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
      const status = sessionError?.message.includes('No active user session') ? 401 : 403;
      return new NextResponse(JSON.stringify({ error: sessionError?.message || 'Unauthorized or profile missing' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!role || !["Admin", "Staff"].includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse query parameters
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');
    
    // 3. Initialize Supabase client (reused pattern)
    const supabase = await createClient();
    
    // 4. First count the total number of students to export
    let countQuery = supabase
      .from('students')
      .select('id', { count: 'exact', head: true });
    
    if (clientId) {
      countQuery = countQuery.eq('client_id', clientId);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting students:', countError);
      return new NextResponse(JSON.stringify({ error: 'Failed to count learners' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Check if we have too many records
    if (!count || count === 0) {
      return new NextResponse(JSON.stringify({ error: 'No learners found to export' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (count > MAX_TOTAL_RECORDS) {
      return new NextResponse(JSON.stringify({ 
        error: `Export exceeds maximum allowed records (${MAX_TOTAL_RECORDS}). Please filter your export criteria.` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Fetch clients for mapping client IDs to names (smaller table, fetch all at once)
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');
    
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch clients' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Create a map of client IDs to client names
    const clientMap = (clients || []).reduce((map, client) => {
      map[client.id] = client.name;
      return map;
    }, {} as Record<string, string>);
    
    // 6. Process students in batches to avoid memory issues
    const totalBatches = Math.ceil(count / BATCH_SIZE);
    let allExportRows: any[] = [];
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Abort if the request has timed out
      if (controller.signal.aborted) {
        throw new Error('Request timed out due to large dataset');
      }
      
      const offset = batchIndex * BATCH_SIZE;
      
      // Fetch a batch of students with pagination
      let studentsQuery = supabase
        .from('students')
        .select('id, full_name, email, phone_number, is_active, client_id, created_at, last_login_at, job_readiness_background_type')
        .order('id', { ascending: true }) // Consistent ordering for pagination
        .range(offset, offset + BATCH_SIZE - 1); // Zero-based ranges
      
      if (clientId) {
        studentsQuery = studentsQuery.eq('client_id', clientId);
      }
      
      const { data: students, error: studentsError } = await studentsQuery;
      
      if (studentsError) {
        console.error(`Error fetching students batch ${batchIndex + 1}/${totalBatches}:`, studentsError);
        return new NextResponse(JSON.stringify({ error: 'Failed to fetch learners' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      if (!students || students.length === 0) {
        continue; // Skip empty batches
      }
      
      // Transform this batch for Excel export
      const batchExportRows = students.map(student => ({
        'Learner Full Name': student.full_name,
        'Learner Email': student.email,
        'Learner Phone Number': student.phone_number || '',
        'Client Name': clientMap[student.client_id] || 'Unknown',
        'Learner Active Status': student.is_active ? 'Active' : 'Inactive',
        'Enrollment Date': student.created_at ? new Date(student.created_at).toLocaleDateString() : '',
        'Last Login Date': student.last_login_at ? new Date(student.last_login_at).toLocaleDateString() : 'Never',
        'Job Readiness Background Type': student.job_readiness_background_type || 'Unknown'
      }));
      
      // Add this batch to our results
      allExportRows = [...allExportRows, ...batchExportRows];
    }
    
    // Clear the timeout as we've successfully processed all batches
    clearTimeout(timeoutId);
    
    // 7. Generate Excel file
    const wb = utils.book_new();
    
    // Add the main data sheet
    const sheet = utils.json_to_sheet(allExportRows);
    utils.book_append_sheet(wb, sheet, "Learners");
    
    // Add an information sheet
    const infoData = [
      { field: 'Field', description: 'Description' },
      { field: 'Learner Full Name', description: 'Full name of the learner' },
      { field: 'Learner Email', description: 'Email address of the learner' },
      { field: 'Learner Phone Number', description: 'Phone number of the learner (no + prefix)' },
      { field: 'Client Name', description: 'Name of the client the learner belongs to' },
      { field: 'Learner Active Status', description: 'Whether the learner is active (Active/Inactive)' },
      { field: 'Enrollment Date', description: 'Date the learner was enrolled in the system' },
      { field: 'Last Login Date', description: 'Date the learner last logged in' },
      { field: 'Job Readiness Background Type', description: 'Type of job readiness background' }
    ];
    
    const infoSheet = utils.json_to_sheet(infoData);
    utils.book_append_sheet(wb, infoSheet, "Field Descriptions");
    
    // Generate Excel file buffer
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // Determine filename
    let filename = "learner_export";
    if (clientId) {
      const clientName = clientMap[clientId]?.replace(/[^a-zA-Z0-9]/g, '_') || clientId;
      filename += `_${clientName}`;
    }
    filename += `.xlsx`;
    
    // Return the Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
    
  } catch (error) {
    console.error('API Error exporting learner data:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new NextResponse(JSON.stringify({ 
      error: 'An unexpected error occurred while generating the export', 
      details: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    // Always clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
  }
} 