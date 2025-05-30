import { NextResponse } from 'next/server';
import { utils, write } from 'xlsx';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/learners/bulk-upload-template
 * 
 * Generates and returns an Excel template for bulk learner upload.
 * Only accessible by Admin and Staff roles.
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization
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

    // 2. Get client list for the template
    const supabase = await createClient();
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
      
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch clients for template' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Create workbook with sample data and instructions
    const wb = utils.book_new();
    
    // Create the main template sheet
    const templateData = [
      {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone_number: '1234567890',
        client_id: clients && clients.length > 0 ? clients[0]?.id : '',
        is_active: true
      },
      {
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone_number: '', // Example of optional field
        client_id: clients && clients.length > 0 ? clients[0]?.id : '',
        is_active: true
      }
    ];
    
    const templateSheet = utils.json_to_sheet(templateData);
    utils.book_append_sheet(wb, templateSheet, 'Learners');
    
    // Add client reference sheet
    const clientsReferenceData = clients ? clients.map((client) => ({
      client_id: client.id,
      client_name: client.name
    })) : [];
    
    const clientsSheet = utils.json_to_sheet(clientsReferenceData);
    utils.book_append_sheet(wb, clientsSheet, 'Clients Reference');
    
    // Add instructions sheet
    const instructionsData = [
      { field: 'Field', description: 'Description', required: 'Required', example: 'Example' },
      { field: 'full_name', description: 'Full name of the learner', required: 'Yes', example: 'John Doe' },
      { field: 'email', description: 'Email address of the learner', required: 'Yes', example: 'john.doe@example.com' },
      { field: 'phone_number', description: 'Phone number of the learner (no + prefix)', required: 'No', example: '1234567890' },
      { field: 'client_id', description: 'ID of the client (see Clients Reference sheet)', required: 'Yes', example: clients && clients.length > 0 ? clients[0]?.id : 'provide-a-valid-uuid' },
      { field: 'is_active', description: 'Whether the learner is active (true/false)', required: 'Yes', example: 'true' }
    ];
    
    const instructionsSheet = utils.json_to_sheet(instructionsData);
    utils.book_append_sheet(wb, instructionsSheet, 'Instructions');
    
    // 4. Generate Excel file
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // 5. Return the Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="learners_upload_template.xlsx"'
      }
    });
    
  } catch (error) {
    console.error('API Error getting template:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred while generating the template', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 