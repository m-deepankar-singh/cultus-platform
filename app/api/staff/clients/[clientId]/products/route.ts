import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { ClientIdSchema } from '@/lib/schemas/client';
import { ProductAssignmentSchema } from '@/lib/schemas/assignment';
import type { Product, ClientProductAssignment } from '@/lib/types/supabase';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Define the expected structure of the assignment data including the joined product
type AssignmentWithProduct = {
  created_at: string;
  product: Product | null;
};

/**
 * GET handler to list products assigned to a specific client.
 * Accessible by Admins and Staff (for any client).
 */
export async function GET(
  request: Request,
  context: { params: { clientId: string } }
) {
  // Properly await the params object
  const params = await context.params;

  // JWT-based authentication (0 database queries)
  const authResult = await authenticateApiRequest(['Staff', 'Admin']);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { user, claims, supabase } = authResult;

  // Validate clientId from route params
  const validationResult = ClientIdSchema.safeParse({ clientId: params.clientId });

  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid Client ID format', details: validationResult.error.flatten() }, { status: 400 });
  }

  const validatedClientId = validationResult.data.clientId;

  // Note: We're removing the client_id restriction for Staff users
  // Staff can now view products for any client

  // Admin or Staff can proceed
  try {
    // Verify client exists first (good practice)
    const { data: clientExists, error: clientCheckError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', validatedClientId)
      .single();
    
    if (clientCheckError || !clientExists) {
      console.error('Client not found or error checking client:', clientCheckError);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Explicitly type the expected return data from Supabase
    const { data: assignments, error: dbError } = await supabase
      .from('client_product_assignments')
      .select('created_at, product:products(*)')
      .eq('client_id', validatedClientId);

    if (dbError) {
      console.error('Error fetching client product assignments:', dbError);
      return NextResponse.json({ error: 'Database error fetching assignments' }, { status: 500 });
    }

    // Extract just the product details from the assignments with proper typing
    const assignedProducts = assignments
        ?.map((a: AssignmentWithProduct) => a.product)
        .filter((p: Product | null): p is Product => p !== null)
        ?? [];

    return NextResponse.json(assignedProducts);

  } catch (error) {
    console.error('Unexpected error in GET /api/staff/clients/[clientId]/products:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * POST handler to assign a product to a client.
 * Accessible by Admins and Staff (for any client).
 */
export async function POST(
  request: Request,
  context: { params: { clientId: string } }
) {
  // Properly await the params object
  const params = await context.params;
  
  // JWT-based authentication (0 database queries)
  const authResult = await authenticateApiRequest(['Staff', 'Admin']);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { user, claims, supabase } = authResult;
  
  // Validate clientId from route params
  const validationResult = ClientIdSchema.safeParse({ clientId: params.clientId });

  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid Client ID format',
      details: validationResult.error.flatten() 
    }, { status: 400 });
  }

  const validatedClientId = validationResult.data.clientId;

  // Note: We're removing the client_id restriction for Staff users
  // Staff can now assign products to any client

  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Validate request body against schema
    const bodyValidation = ProductAssignmentSchema.safeParse(body);
    
    if (!bodyValidation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: bodyValidation.error.flatten()
      }, { status: 400 });
    }
    
    const { product_id } = bodyValidation.data;
    
    // Supabase client already available from authResult
    
    // Verify product exists first (optional but good practice)
    const { data: productExists, error: productCheckError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();
    
    if (productCheckError || !productExists) {
      console.error('Product not found or error checking product:', productCheckError);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Verify client exists first (good practice)
    const { data: clientExists, error: clientCheckError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validatedClientId)
      .single();
    
    if (clientCheckError || !clientExists) {
      console.error('Client not found or error checking client:', clientCheckError);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    // Insert assignment
    const { data: newAssignment, error } = await supabase
      .from('client_product_assignments')
      .insert({
        client_id: validatedClientId,
        product_id: product_id,
        // The database will automatically set created_at with the default value
      })
      .select()
      .single();
    
    if (error) {
      // Handle conflict (already assigned) case
      if (error.code === '23505') { // PostgreSQL unique violation error code
        return NextResponse.json({
          error: 'Product already assigned to this client',
          details: error.message
        }, { status: 409 }); // Conflict
      }
      
      console.error('Error assigning product to client:', error);
      return NextResponse.json({ error: 'Database error assigning product' }, { status: 500 });
    }
    
    return NextResponse.json(newAssignment, { status: 201 }); // Created
    
  } catch (error) {
    console.error('Unexpected error in POST /api/staff/clients/[clientId]/products:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
