import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assuming this path is correct, adjust if needed
import { ClientIdSchema, UpdateClientSchema } from '@/lib/schemas/client';

export async function GET(request: Request, { params }: { params: { clientId: string } }) {
  try {
    const supabase = await createClient();

    // 1. Get user session and role
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role') // Fetch role from profiles table
      .eq('id', user.id)
      .single();

    if (profileError) {
        console.error('Profile Fetch Error:', profileError);
        return NextResponse.json({ error: 'Forbidden or Profile Not Found' }, { status: 403 });
    }

    if (!profile) {
        console.error('Profile not found for user:', user.id);
        return NextResponse.json({ error: 'Forbidden: User profile not found.' }, { status: 403 });
    }

    const role = profile.role;

    // 2. Check if the role is allowed (Staff or Admin)
    if (!['Staff', 'Admin'].includes(role)) {
      console.warn(`User ${user.id} with role ${role} attempted to access staff route for client ${params.clientId}.`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and has an allowed role (Staff or Admin), proceed ---

    // 3. Validate route parameter
    const validationResult = ClientIdSchema.safeParse(params);
    if (!validationResult.success) {
        console.error('Validation Error (clientId):', validationResult.error.errors);
        return NextResponse.json({ error: 'Invalid Client ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { clientId } = validationResult.data;

    // 4. Fetch Client Details (RLS Enforced)
    // RLS policies will automatically prevent Staff from accessing clients they aren't assigned to.
    // This will result in either an error or null data, which is handled as 404 Not Found.
    const { data: client, error: dbError } = await supabase
      .from('clients')
      .select('*') // Adjust columns as needed
      .eq('id', clientId)
      .single();

    if (dbError) {
        // RLS policy violation or actual row not found will likely trigger PGRST116
        if (dbError.code === 'PGRST116') { 
            // Log appropriately for debugging if needed, but return 404 to the user
            console.log(`Client not found or RLS prevented access for user ${user.id} to client ${clientId}`);
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }
        // Handle other potential database errors
        console.error('Supabase DB Error (Staff Fetch Client):', dbError);
        return NextResponse.json({ error: 'Failed to fetch client', details: dbError.message }, { status: 500 });
    }

    // If client is null even without a specific dbError code (unlikely with .single() but possible)
    if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 5. Return client data
    return NextResponse.json(client, { status: 200 });

  } catch (error) {
    console.error('GET /api/staff/clients/[clientId] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { clientId: string } }) {
  try {
    const supabase = await createClient();

    // 1. Get user session and role
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role') // Fetch role from profiles table
      .eq('id', user.id)
      .single();

    if (profileError) {
        console.error('Profile Fetch Error:', profileError);
        return NextResponse.json({ error: 'Forbidden or Profile Not Found' }, { status: 403 });
    }

    if (!profile) {
        console.error('Profile not found for user:', user.id);
        return NextResponse.json({ error: 'Forbidden: User profile not found.' }, { status: 403 });
    }

    const role = profile.role;

    // 2. Check if the role is allowed (Staff or Admin)
    if (!['Staff', 'Admin'].includes(role)) {
      console.warn(`User ${user.id} with role ${role} attempted to PUT staff route for client ${params.clientId}.`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and has an allowed role (Staff or Admin), proceed ---

    // 3. Validate route parameter
    const paramValidation = ClientIdSchema.safeParse(params);
    if (!paramValidation.success) {
        console.error('Validation Error (clientId):', paramValidation.error.errors);
        return NextResponse.json({ error: 'Invalid Client ID format', details: paramValidation.error.flatten() }, { status: 400 });
    }
    const { clientId } = paramValidation.data;

    // 4. Parse and validate request body
    let body;
    try {
        body = await request.json();
    } catch (parseError) {
        console.error('JSON Parsing Error:', parseError);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const bodyValidation = UpdateClientSchema.safeParse(body);
    if (!bodyValidation.success) {
        console.error('Validation Error (body):', bodyValidation.error.errors);
        return NextResponse.json({ error: 'Invalid input', details: bodyValidation.error.flatten() }, { status: 400 });
    }
    const updateData = bodyValidation.data;

    // Check if there's actually any data to update
    if (Object.keys(updateData).length === 0) {
         return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    // 5. Update Client (RLS Enforced)
    // RLS policies (USING and WITH CHECK clauses on UPDATE) will automatically:
    // - Prevent Staff from updating clients they don't have access to (USING clause check).
    // - Prevent updates that would violate policy conditions (WITH CHECK clause check).
    // This results in an error or affects 0 rows, handled as 404 Not Found.
    const { data: updatedClient, error: dbError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId)
        .select()
        .single();

    if (dbError) {
        // RLS policy violation or row not found will likely trigger PGRST116
        if (dbError.code === 'PGRST116') { 
            // Log appropriately for debugging if needed, but return 404 to the user
            console.log(`Update failed: Client not found or RLS prevented access for user ${user.id} to client ${clientId}`);
            return NextResponse.json({ error: 'Client not found or update forbidden' }, { status: 404 });
        }
        // Handle other potential database errors (e.g., constraint violations)
        console.error('Supabase DB Error (Staff Update Client):', dbError);
        return NextResponse.json({ error: 'Failed to update client', details: dbError.message }, { status: 500 });
    }

    // If Supabase returns null even without error (unlikely with .single())
    if (!updatedClient) {
        return NextResponse.json({ error: 'Client not found after update attempt' }, { status: 404 });
    }

    // 6. Return the updated client
    return NextResponse.json(updatedClient, { status: 200 });

  } catch (error) {
    console.error('PUT /api/staff/clients/[clientId] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 