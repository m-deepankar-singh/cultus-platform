import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Assuming this path is correct, adjust if needed
import { ClientSchema } from '@/lib/schemas/client'; // Import the Zod schema

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Get the user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the user's role from the profiles table (assuming role is stored there)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role') // Select only the role column
      .eq('id', user.id)
      .single();

    if (profileError) {
        console.error('Profile Fetch Error:', profileError);
        // If RLS prevents access, it might appear as a profile error or profile being null
        return NextResponse.json({ error: 'Forbidden or Profile Not Found' }, { status: 403 });
    }

    if (!profile) {
        console.error('Profile not found for user:', user.id);
        return NextResponse.json({ error: 'Forbidden: User profile not found.' }, { status: 403 });
    }

    const role = profile.role;

    // 3. Check if the role is Admin
    if (role !== 'Admin') {
      console.warn(`User ${user.id} with role ${role} attempted to access admin route.`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- User is authenticated and is an Admin, proceed --- 

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const isActiveFilter = searchParams.get('isActive');

    let query = supabase.from('clients').select('*'); // Adjust columns as needed, e.g., 'id, name, contact_email, is_active'

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    if (isActiveFilter !== null) {
      const isActive = isActiveFilter.toLowerCase() === 'true';
      query = query.eq('is_active', isActive);
    }

    query = query.order('name', { ascending: true });

    const { data: clients, error: dbError } = await query;

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch clients', details: dbError.message }, { status: 500 });
    }

    return NextResponse.json(clients || [], { status: 200 });

  } catch (error) {
    console.error('GET /api/admin/clients Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Get user session and role (Admin check)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'Admin') {
        // Log details for non-admin attempts if desired, but keep error generic
        console.error('Forbidden POST attempt or profile issue:', profileError || 'Profile not found or not Admin');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // --- User is authenticated and is an Admin, proceed with POST ---

    // 2. Parse and validate request body
    let body;
    try {
        body = await request.json();
    } catch (parseError) {
        console.error('JSON Parsing Error:', parseError);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const validationResult = ClientSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.errors);
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }

    const clientData = validationResult.data;

    // 3. Insert client into database
    const { data: newClient, error: dbError } = await supabase
      .from('clients')
      .insert(clientData)
      .select() // Select the newly created record
      .single(); // Expecting a single record back

    if (dbError) {
      console.error('Supabase DB Error (Insert):', dbError);
      // Consider more specific error checking (e.g., unique constraint violation)
      return NextResponse.json({ error: 'Failed to create client', details: dbError.message }, { status: 500 });
    }

    // 4. Return the newly created client
    return NextResponse.json(newClient, { status: 201 }); // 201 Created status

  } catch (error) {
    console.error('POST /api/admin/clients Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 