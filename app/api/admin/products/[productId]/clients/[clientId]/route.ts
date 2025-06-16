import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * DELETE handler to unassign a client from a specific product.
 * Accessible by Admins and Staff.
 */
export async function DELETE(
  request: Request,
  context: { params: { productId: string, clientId: string } }
) {
  // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
  const authResult = await authenticateApiRequest(['Admin', 'Staff']);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { user, claims, supabase } = authResult;

  // Properly await the params object
  const params = await context.params;
  
  // Validate ids
  const idSchema = z.object({
    productId: z.string().uuid(),
    clientId: z.string().uuid(),
  });

  const validationResult = idSchema.safeParse({
    productId: params.productId,
    clientId: params.clientId
  });

  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid ID format',
      details: validationResult.error.flatten()
    }, { status: 400 });
  }

  const { productId, clientId } = validationResult.data;

  try {
    // Delete the assignment record
    const { error: deleteError } = await supabase
      .from('client_product_assignments')
      .delete()
      .eq('product_id', productId)
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error unassigning client from product:', deleteError);
      return NextResponse.json({ error: 'Database error while unassigning client' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Client unassigned from product' });
    
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/products/[productId]/clients/[clientId]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 