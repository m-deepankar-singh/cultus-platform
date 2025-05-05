import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';

/**
 * DELETE handler to unassign a client from a specific product.
 * Accessible by Admins and Staff.
 */
export async function DELETE(
  request: Request,
  context: { params: { productId: string, clientId: string } }
) {
  // Properly await the params object
  const params = await context.params;
  const { profile, role, error: authError } = await getUserSessionAndRole();

  if (authError || !profile || !role) {
    console.error('DELETE /api/admin/products/[productId]/clients/[clientId] Auth Error:', authError?.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admins and Staff are allowed
  if (!['Admin', 'Staff'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: Access denied for this role' }, { status: 403 });
  }
  
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
    // Create supabase client for this request
    const supabase = await createClient();
    
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