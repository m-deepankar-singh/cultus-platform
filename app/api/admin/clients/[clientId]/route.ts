import { NextResponse } from 'next/server';
import { ClientIdSchema, UpdateClientSchema } from '@/lib/schemas/client';
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';

/**
 * GET /api/admin/clients/[clientId]
 * 
 * Retrieves a specific client by ID
 * Accessible only by users with 'Admin' role
 * 
 * OPTIMIZATIONS APPLIED:
 * ✅ JWT-based authentication (eliminates 1 DB query per request)
 * ✅ Specific column selection (reduces data transfer)
 * ✅ Performance monitoring
 */
export async function GET(request: Request, context: { params: Promise<{ clientId: string }> }) {
  const startTime = Date.now();
  
  try {
    // 1. Authentication & Authorization (OPTIMIZED - 0 DB queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase } = authResult;

    // 2. Await params before using
    const params = await context.params;

    // 3. Validate route parameter
    const validationResult = ClientIdSchema.safeParse({ clientId: params.clientId });
    if (!validationResult.success) {
        console.error('Validation Error (clientId):', validationResult.error.errors);
        return NextResponse.json({ error: 'Invalid Client ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { clientId } = validationResult.data;

    // 4. Fetch client details (OPTIMIZED - specific column selection)
    const { data: client, error: dbError } = await supabase
      .from('clients')
      .select(SELECTORS.CLIENT.DETAIL) // Instead of select('*')
      .eq('id', clientId)
      .single();

    if (dbError) {
        // Check if the error is because the client was not found
        if (dbError.code === 'PGRST116') {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }
        console.error('Supabase DB Error (Fetch Client):', dbError);
        return NextResponse.json({ error: 'Failed to fetch client', details: dbError.message }, { status: 500 });
    }

    if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // 5. Performance monitoring
    const responseTime = Date.now() - startTime;
    console.log(`[OPTIMIZED] GET /api/admin/clients/${clientId} completed in ${responseTime}ms (JWT auth + selective fields)`);

    // 6. Return client data
    return NextResponse.json(client, { status: 200 });

  } catch (error) {
    console.error('GET /api/admin/clients/[clientId] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/clients/[clientId]
 * 
 * Updates a specific client by ID
 * Accessible only by users with 'Admin' role
 * 
 * OPTIMIZATIONS APPLIED:
 * ✅ JWT-based authentication (eliminates 1 DB query per request)
 * ✅ Specific column selection for response
 * ✅ Performance monitoring
 */
export async function PUT(request: Request, context: { params: Promise<{ clientId: string }> }) {
    const startTime = Date.now();
    
    try {
        // 1. Authentication & Authorization (OPTIMIZED - 0 DB queries for auth)
        const authResult = await authenticateApiRequest(['Admin']);
        
        if ('error' in authResult) {
          return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { supabase } = authResult;

        // 2. Await params before using
        const params = await context.params;

        // 3. Validate route parameter
        const paramValidation = ClientIdSchema.safeParse({ clientId: params.clientId });
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

        // 5. Update client in database (OPTIMIZED - specific column selection)
        const { data: updatedClient, error: dbError } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', clientId)
            .select(SELECTORS.CLIENT.DETAIL) // Instead of select()
            .single();

        if (dbError) {
            if (dbError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }
            console.error('Supabase DB Error (Update Client):', dbError);
            return NextResponse.json({ error: 'Failed to update client', details: dbError.message }, { status: 500 });
        }

        if (!updatedClient) {
             return NextResponse.json({ error: 'Client not found after update attempt' }, { status: 404 });
        }

        // 6. Performance monitoring
        const responseTime = Date.now() - startTime;
        console.log(`[OPTIMIZED] PUT /api/admin/clients/${clientId} completed in ${responseTime}ms (JWT auth + selective fields)`);

        // 7. Return the updated client
        return NextResponse.json(updatedClient, { status: 200 });

    } catch (error) {
        console.error('PUT /api/admin/clients/[clientId] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/clients/[clientId]
 * 
 * Deletes a specific client by ID
 * Accessible only by users with 'Admin' role
 * 
 * OPTIMIZATIONS APPLIED:
 * ✅ JWT-based authentication (eliminates 1 DB query per request)
 * ✅ Performance monitoring
 */
export async function DELETE(request: Request, context: { params: Promise<{ clientId: string }> }) {
    const startTime = Date.now();
    
    try {
        // 1. Authentication & Authorization (OPTIMIZED - 0 DB queries for auth)
        const authResult = await authenticateApiRequest(['Admin']);
        
        if ('error' in authResult) {
          return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { supabase } = authResult;

        // 2. Await params before using
        const params = await context.params;

        // 3. Validate route parameter
        const validationResult = ClientIdSchema.safeParse({ clientId: params.clientId });
        if (!validationResult.success) {
            console.error('Validation Error (clientId):', validationResult.error.errors);
            return NextResponse.json({ error: 'Invalid Client ID format', details: validationResult.error.flatten() }, { status: 400 });
        }
        const { clientId } = validationResult.data;

        // 4. Perform deletion
        const { error: dbError } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId);

        if (dbError) {
            console.error('Supabase DB Error (Delete Client):', dbError);
            return NextResponse.json({ error: 'Failed to delete client', details: dbError.message }, { status: 500 });
        }

        // 5. Performance monitoring
        const responseTime = Date.now() - startTime;
        console.log(`[OPTIMIZED] DELETE /api/admin/clients/${clientId} completed in ${responseTime}ms (JWT auth)`);

        // 6. Return success (204 No Content)
        return new Response(null, { status: 204 });

    } catch (error) {
        console.error('DELETE /api/admin/clients/[clientId] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 