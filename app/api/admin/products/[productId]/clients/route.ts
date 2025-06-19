import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

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
  context: { params: Promise<{ productId: string }> }
) {
  // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
  const authResult = await authenticateApiRequest(['Admin', 'Staff']);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const { user, claims, supabase } = authResult;

  // Properly await the params object
  const params = await context.params;

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