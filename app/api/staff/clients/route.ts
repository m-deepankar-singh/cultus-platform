import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assuming this path is correct, adjust if needed
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';

export async function GET(request: Request) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Staff', 'Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // --- User is authenticated and has an allowed role (Staff or Admin), proceed --- 

    // 3. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const isActiveFilter = searchParams.get('isActive');

    // 4. Build Supabase Query (RLS Enforced)
    // RLS policies will automatically scope the results based on the user's role.
    // Admins should see all clients (if RLS allows), Staff should only see their assigned clients.
    let query = supabase.from('clients').select(SELECTORS.CLIENT.LIST); // 📊 OPTIMIZED: Specific fields only

    // Apply optional filters
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    if (isActiveFilter !== null) {
      const isActive = isActiveFilter.toLowerCase() === 'true';
      query = query.eq('is_active', isActive);
    }

    // Add ordering
    query = query.order('name', { ascending: true });

    // 5. Execute Query & Handle Response
    const { data: clients, error: dbError } = await query;

    if (dbError) {
      console.error('Supabase DB Error (Staff Get Clients):', dbError);
      return NextResponse.json({ error: 'Failed to fetch clients', details: dbError.message }, { status: 500 });
    }

    // Return the (potentially RLS-filtered) list of clients
    return NextResponse.json(clients || [], { status: 200 });

  } catch (error) {
    console.error('GET /api/staff/clients Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 