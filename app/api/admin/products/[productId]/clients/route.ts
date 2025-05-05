import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';

// Define the expected structure of the client data
interface Client {
  id: string;
  name: string;
  type?: string;
  status?: string;
  created_at: string;
}

// Define the expected structure of the assignment data including the joined client
interface AssignmentWithClient {
  created_at: string;
  client: Client | null;
}

/**
 * GET handler to list clients assigned to a specific product.
 * Accessible by Admins and Staff.
 */
export async function GET(
  request: Request,
  context: { params: { productId: string } }
) {
  // Properly await the params object
  const params = await context.params;
  const { profile, role, error: authError } = await getUserSessionAndRole();

  if (authError || !profile || !role) {
    console.error('GET /api/admin/products/[productId]/clients Auth Error:', authError?.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admins and Staff are allowed
  if (!['Admin', 'Staff'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: Access denied for this role.' }, { status: 403 });
  }

  // Validate productId
  const productIdSchema = z.object({
    productId: z.string().uuid(),
  });

  const validationResult = productIdSchema.safeParse({ productId: params.productId });

  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid Product ID format',
      details: validationResult.error.flatten()
    }, { status: 400 });
  }

  const validatedProductId = validationResult.data.productId;

  // Admin or authorized Staff can proceed
  try {
    // Create supabase client for this request
    const supabase = await createClient();

    // Query to fetch clients assigned to this product via client_product_assignments
    const { data: assignments, error: dbError } = await supabase
      .from('client_product_assignments')
      .select('created_at, client:clients(*)')
      .eq('product_id', validatedProductId);

    if (dbError) {
      console.error('Error fetching product client assignments:', dbError);
      return NextResponse.json({ error: 'Database error fetching assignments' }, { status: 500 });
    }

    // Extract just the client details from the assignments
    const assignedClients = assignments
      ?.map((a: any) => a.client)
      .filter((c: any): c is Client => c !== null && c.id)
      ?? [];

    return NextResponse.json(assignedClients);

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/products/[productId]/clients:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 