import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assuming this path is correct, adjust if needed
import { ClientIdSchema, UpdateClientSchema } from '@/lib/schemas/client';

export async function GET(request: Request, { params }: { params: { clientId: string } }) {
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
        console.error('Forbidden GET [clientId] attempt or profile issue:', profileError || 'Profile not found or not Admin');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and is an Admin, proceed ---

    // 2. Validate route parameter
    const validationResult = ClientIdSchema.safeParse(params);
    if (!validationResult.success) {
        console.error('Validation Error (clientId):', validationResult.error.errors);
        return NextResponse.json({ error: 'Invalid Client ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { clientId } = validationResult.data;

    // 3. Fetch client details
    const { data: client, error: dbError } = await supabase
      .from('clients')
      .select('*') // Adjust columns as needed
      .eq('id', clientId)
      .single();

    if (dbError) {
        // Check if the error is because the client was not found
        if (dbError.code === 'PGRST116') { // PostgREST code for "Fetched row contains unexpected number of rows"
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }
        // Otherwise, it's a different database error
        console.error('Supabase DB Error (Fetch Client):', dbError);
        return NextResponse.json({ error: 'Failed to fetch client', details: dbError.message }, { status: 500 });
    }

    // Double-check if client is null even without an error (should be caught by PGRST116, but belt-and-suspenders)
    if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 4. Return client data
    return NextResponse.json(client, { status: 200 });

  } catch (error) {
    console.error('GET /api/admin/clients/[clientId] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { clientId: string } }) {
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
            console.error('Forbidden PUT [clientId] attempt or profile issue:', profileError || 'Profile not found or not Admin');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- User is authenticated and is an Admin, proceed ---

        // 2. Validate route parameter
        const paramValidation = ClientIdSchema.safeParse(params);
        if (!paramValidation.success) {
            console.error('Validation Error (clientId):', paramValidation.error.errors);
            return NextResponse.json({ error: 'Invalid Client ID format', details: paramValidation.error.flatten() }, { status: 400 });
        }
        const { clientId } = paramValidation.data;

        // 3. Parse and validate request body
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

        // 4. Update client in database
        const { data: updatedClient, error: dbError } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', clientId)
            .select()
            .single();

        if (dbError) {
            // Check if the error is because the client was not found to update
            if (dbError.code === 'PGRST116') { // Should catch if .eq finds 0 rows
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }
            // Other database errors (e.g., constraints)
            console.error('Supabase DB Error (Update Client):', dbError);
            return NextResponse.json({ error: 'Failed to update client', details: dbError.message }, { status: 500 });
        }

        // If Supabase returns null even without error (though PGRST116 should cover this)
        if (!updatedClient) {
             return NextResponse.json({ error: 'Client not found after update attempt' }, { status: 404 });
        }

        // 5. Return the updated client
        return NextResponse.json(updatedClient, { status: 200 });

    } catch (error) {
        console.error('PUT /api/admin/clients/[clientId] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { clientId: string } }) {
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
            console.error('Forbidden DELETE [clientId] attempt or profile issue:', profileError || 'Profile not found or not Admin');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- User is authenticated and is an Admin, proceed ---

        // 2. Validate route parameter
        const paramValidation = ClientIdSchema.safeParse(params);
        if (!paramValidation.success) {
            console.error('Validation Error (clientId):', paramValidation.error.errors);
            return NextResponse.json({ error: 'Invalid Client ID format', details: paramValidation.error.flatten() }, { status: 400 });
        }
        const { clientId } = paramValidation.data;

        // 3. Perform deletion
        // Note: Dependencies (users, assignments etc.) should ideally be handled
        // by database constraints (ON DELETE CASCADE/SET NULL) or specific cleanup logic elsewhere.
        // This handler only attempts to delete the client record itself.
        const { error: dbError } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId);

        if (dbError) {
            // We don't typically expect a 404 equivalent on DELETE unless checking existence first.
            // Supabase delete doesn't error if the row doesn't exist, it just affects 0 rows.
            // Handle potential foreign key constraint errors or other DB issues.
            console.error('Supabase DB Error (Delete Client):', dbError);
            // Check for specific constraint violation codes if needed
            // if (dbError.code === '23503') { // foreign_key_violation
            //     return NextResponse.json({ error: 'Cannot delete client due to existing dependencies.', details: dbError.message }, { status: 409 }); // 409 Conflict
            // }
            return NextResponse.json({ error: 'Failed to delete client', details: dbError.message }, { status: 500 });
        }

        // 4. Return success (204 No Content)
        return new Response(null, { status: 204 });

    } catch (error) {
        console.error('DELETE /api/admin/clients/[clientId] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 