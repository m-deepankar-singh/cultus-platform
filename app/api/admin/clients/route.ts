import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assuming this path is correct, adjust if needed
import { ClientSchema } from '@/lib/schemas/client'; // Import the Zod schema
import { getUserSessionAndRole } from '@/lib/supabase/utils';

/**
 * GET /api/admin/clients
 * 
 * Retrieves a list of all clients
 * Accessible only by users with 'Admin' or 'Staff' roles
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization
    const { user, profile, role, error: authError } = await getUserSessionAndRole();

    if (authError || !user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow Admins and Staff to access client list
    if (!role || !["Admin", "Staff"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Get Supabase client
    const supabase = await createClient();

    // 3. Fetch all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .order('name', { ascending: true });

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
    }

    // 4. Return client list
    return NextResponse.json(clients || []);
    
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/clients:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Get user session and role (Admin check)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'Admin') {
        // Log details for non-admin attempts if desired, but keep error generic
        console.error('Forbidden POST attempt or profile issue:', profileError || 'Profile not found or not Admin');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // --- User is authenticated and is an Admin, proceed with POST ---

    // 2. Parse and validate request body
    let body;
    try {
        body = await request.json();
    } catch (parseError) {
        console.error('JSON Parsing Error:', parseError);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const validationResult = ClientSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.errors);
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }

    const clientData = validationResult.data;

    // 3. Insert client into database
    const { data: newClient, error: dbError } = await supabase
      .from('clients')
      .insert(clientData)
      .select() // Select the newly created record
      .single(); // Expecting a single record back

    if (dbError) {
      console.error('Supabase DB Error (Insert):', dbError);
      // Consider more specific error checking (e.g., unique constraint violation)
      return NextResponse.json({ error: 'Failed to create client', details: dbError.message }, { status: 500 });
    }

    // 4. Return the newly created client
    return NextResponse.json(newClient, { status: 201 }); // 201 Created status

  } catch (error) {
    console.error('POST /api/admin/clients Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 