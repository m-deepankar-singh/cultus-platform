import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { ClientIdSchema } from '@/lib/schemas/client';
import { ProductIdSchema } from '@/lib/schemas/product';

/**
 * DELETE handler to unassign a product from a client.
 * Accessible by Admins and Staff (for their assigned client).
 */
export async function DELETE(
  request: Request,
  { params }: { params: { clientId: string; productId: string } }
) {
  // Authenticate and authorize the user
  const { profile, role, error: authError } = await getUserSessionAndRole();

  if (authError || !profile || !role) {
    console.error('DELETE /api/staff/clients/[clientId]/products/[productId] Auth Error:', authError?.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admins and Staff are allowed
  if (!['Admin', 'Staff'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: Access denied for this role' }, { status: 403 });
  }

  // Validate route parameters
  const clientIdValidation = ClientIdSchema.safeParse({ clientId: params.clientId });
  const productIdValidation = ProductIdSchema.safeParse({ productId: params.productId });

  // Check both validations
  if (!clientIdValidation.success || !productIdValidation.success) {
    const errors = {
      ...(clientIdValidation.success ? {} : { clientId: clientIdValidation.error.flatten() }),
      ...(productIdValidation.success ? {} : { productId: productIdValidation.error.flatten() }),
    };
    
    return NextResponse.json({ 
      error: 'Invalid route parameters', 
      details: errors 
    }, { status: 400 });
  }

  const validatedClientId = clientIdValidation.data.clientId;
  const validatedProductId = productIdValidation.data.productId;

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
    // Create Supabase client
    const supabase = await createClient();
    
    // Perform the deletion
    const { error, count } = await supabase
      .from('client_product_assignments')
      .delete({ count: 'exact' }) // Request count to check if row existed
      .eq('client_id', validatedClientId)
      .eq('product_id', validatedProductId);

    if (error) {
      console.error('Error unassigning product from client:', error);
      return NextResponse.json({ error: 'Database error unassigning product' }, { status: 500 });
    }

    // Check if any rows were deleted
    if (count === 0) {
      // Optional: decide if you want to return 404 or just success when the assignment doesn't exist
      return NextResponse.json({ 
        message: 'Product was not assigned to this client' 
      }, { status: 404 }); // Not Found
    }

    // Success - return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });
    
  } catch (error) {
    console.error('Unexpected error in DELETE /api/staff/clients/[clientId]/products/[productId]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
