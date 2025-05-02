import { NextResponse } from 'next/server';

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
  context: { params: { clientId: string; productId: string } }
) {
  // Properly await the params object
  const params = await context.params;
  
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

  // Validate clientId from route params
  const clientIdValidation = ClientIdSchema.safeParse({ clientId: params.clientId });
  if (!clientIdValidation.success) {
    return NextResponse.json({
      error: 'Invalid Client ID format',
      details: clientIdValidation.error.flatten() 
    }, { status: 400 });
  }

  // Validate productId from route params
  const productIdValidation = ProductIdSchema.safeParse({ productId: params.productId });
  if (!productIdValidation.success) {
    return NextResponse.json({ 
      error: 'Invalid Product ID format',
      details: productIdValidation.error.flatten() 
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
    
    // Delete the assignment
    const { error } = await supabase
      .from('client_product_assignments')
      .delete()
      .match({
        client_id: validatedClientId,
        product_id: validatedProductId
      });

    if (error) {
      console.error('Error unassigning product from client:', error);
      return NextResponse.json({ error: 'Database error unassigning product' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error('Unexpected error in DELETE /api/staff/clients/[clientId]/products/[productId]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
