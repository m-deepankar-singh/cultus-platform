import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assuming this path is correct, adjust if needed

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Get user session and role
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role') // Fetch role from profiles table
      .eq('id', user.id)
      .single();

    if (profileError) {
        console.error('Profile Fetch Error:', profileError);
        return NextResponse.json({ error: 'Forbidden or Profile Not Found' }, { status: 403 });
    }

    if (!profile) {
        console.error('Profile not found for user:', user.id);
        return NextResponse.json({ error: 'Forbidden: User profile not found.' }, { status: 403 });
    }

    const role = profile.role;

    // 2. Check if the role is allowed (Staff or Admin)
    if (!['Staff', 'Admin'].includes(role)) {
      console.warn(`User ${user.id} with role ${role} attempted to access staff route.`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and has an allowed role (Staff or Admin), proceed --- 

    // 3. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const isActiveFilter = searchParams.get('isActive');

    // 4. Build Supabase Query (RLS Enforced)
    // RLS policies will automatically scope the results based on the user's role.
    // Admins should see all clients (if RLS allows), Staff should only see their assigned clients.
    let query = supabase.from('clients').select('*'); // Adjust columns as needed

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