import { NextResponse } from 'next/server';

import { ClientIdSchema } from '@/lib/schemas/client';
import { ProductIdSchema } from '@/lib/schemas/product';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * DELETE handler to unassign a product from a client.
 * Accessible by Admins and Staff (for their assigned client).
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ clientId: string; productId: string }> }
) {
  // Properly await the params object
  const params = await context.params;
  
  // JWT-based authentication (0 database queries)
  const authResult = await authenticateApiRequest(['Staff', 'Admin']);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { user, claims, supabase } = authResult;

  // Get role and client_id from JWT claims
  const userRole = claims.user_role;
  const userClientId = claims.client_id;

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
  if (userRole === 'Staff') {
    if (!userClientId) {
      console.warn(`Staff user ${user.id} has no assigned client_id.`);
      return NextResponse.json({ error: 'Forbidden: Staff user not assigned to any client' }, { status: 403 });
    }
    if (userClientId !== validatedClientId) {
      console.warn(`Staff user ${user.id} attempted to access client ${validatedClientId} but is assigned to ${userClientId}.`);
      return NextResponse.json({ error: 'Forbidden: Access denied to this client' }, { status: 403 });
    }
  }

  try {
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
