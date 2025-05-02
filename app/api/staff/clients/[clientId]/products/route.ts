import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { ClientIdSchema } from '@/lib/schemas/client';
import { ProductAssignmentSchema } from '@/lib/schemas/assignment';
import type { Product, ClientProductAssignment } from '@/lib/types/supabase';

// Define the expected structure of the assignment data including the joined product
type AssignmentWithProduct = {
  created_at: string;
  product: Product | null;
};

/**
 * GET handler to list products assigned to a specific client.
 * Accessible by Admins and Staff (for their assigned client).
 */
export async function GET(
  request: Request,
  context: { params: { clientId: string } }
) {
  // Properly await the params object
  const params = await context.params;
  const { profile, role, error: authError } = await getUserSessionAndRole();

  if (authError || !profile || !role) {
    console.error('GET /api/staff/clients/[clientId]/products Auth Error:', authError?.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admins and Staff are allowed
  if (!['Admin', 'Staff'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: Access denied for this role.' }, { status: 403 });
  }

  // Validate clientId from route params
  const validationResult = ClientIdSchema.safeParse({ clientId: params.clientId });

  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid Client ID format', details: validationResult.error.flatten() }, { status: 400 });
  }

  const validatedClientId = validationResult.data.clientId;

  // Staff can only access their assigned client's products
  if (role === 'Staff') {
    if (!profile.client_id) {
        console.warn(`Staff user ${profile.id} has no assigned client_id.`);
        return NextResponse.json({ error: 'Forbidden: Staff user not assigned to any client' }, { status: 403 });
    }
    if (profile.client_id !== validatedClientId) {
        console.warn(`Staff user ${profile.id} attempted to access client ${validatedClientId} but is assigned to ${profile.client_id}.`);
        return NextResponse.json({ error: 'Forbidden: Access denied to this client' }, { status: 403 });
    }
  }

  // Admin or authorized Staff can proceed
  try {
    // Create supabase client for this request
    const supabase = await createClient();

    // Explicitly type the expected return data from Supabase
    const { data: assignments, error: dbError } = await supabase
      .from('client_product_assignments')
      .select('created_at, product:products(*)')
      .eq('client_id', validatedClientId)
      .returns<AssignmentWithProduct[]>();

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
 * Accessible by Admins and Staff (for their assigned client).
 */
export async function POST(
  request: Request,
  context: { params: { clientId: string } }
) {
  // Properly await the params object
  const params = await context.params;
  
  // Authenticate and authorize the user
  const { profile, role, error: authError } = await getUserSessionAndRole();

  if (authError || !profile || !role) {
    console.error('POST /api/staff/clients/[clientId]/products Auth Error:', authError?.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admins and Staff are allowed
  if (!['Admin', 'Staff'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: Access denied for this role' }, { status: 403 });
  }
  
  // Validate clientId from route params
  const validationResult = ClientIdSchema.safeParse({ clientId: params.clientId });

  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid Client ID format',
      details: validationResult.error.flatten() 
    }, { status: 400 });
  }

  const validatedClientId = validationResult.data.clientId;

  // Staff can only access their assigned client
  if (role === 'Staff') {
    if (!profile.client_id) {
      console.warn(`Staff user ${profile.id} has no assigned client_id.`);
      return NextResponse.json({ error: 'Forbidden: Staff user not assigned to any client' }, { status: 403 });
    }
    if (profile.client_id !== validatedClientId) {
      console.warn(`Staff user ${profile.id} attempted to access client ${validatedClientId} but is assigned to ${profile.client_id}.`);
      return NextResponse.json({ error: 'Forbidden: Access denied to this client' }, { status: 403 });
    }
  }

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
    
    // Create Supabase client
    const supabase = await createClient();
    
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
