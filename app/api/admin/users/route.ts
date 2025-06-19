import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin'; // Adjust path
import { CreateUserSchema } from '@/lib/schemas/user'; // Adjust path
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';
// We likely don't need a separate getUserSession utility here, 
// as createClient provides a client that can get the user via cookies.

export async function GET(request: NextRequest) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get pagination and filter parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const searchQuery = searchParams.get('search');
    const roleFilter = searchParams.get('role');
    const clientIdFilter = searchParams.get('clientId');

    // Role is Admin, proceed to fetch the list of users
    // Use admin client to bypass RLS completely for admin operations
    const supabaseAdmin = createAdminClient();
    
    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // First get total count with filters
    let countQuery = supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Apply filters to count query
    if (searchQuery) {
      countQuery = countQuery.ilike('full_name', `%${searchQuery}%`);
    }

    if (roleFilter) {
      countQuery = countQuery.ilike('role', roleFilter);
    }

    if (clientIdFilter) {
      countQuery = countQuery.eq('client_id', clientIdFilter);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting users:', countError);
      return NextResponse.json({ error: 'Failed to count users' }, { status: 500 });
    }

    // Then fetch paginated data
    let query = supabaseAdmin
      .from('profiles')
      .select(`${SELECTORS.USER.LIST}, client:clients(${SELECTORS.CLIENT.DROPDOWN})`); // 📊 OPTIMIZED: Specific fields only

    // Apply the same filters to data query
    if (searchQuery) {
      query = query.ilike('full_name', `%${searchQuery}%`);
    }

    if (roleFilter) {
      query = query.ilike('role', roleFilter);
    }

    if (clientIdFilter) {
      query = query.eq('client_id', clientIdFilter);
    }

    // Apply sorting and pagination
    const { data: profilesData, error: dbError } = await query
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (dbError) {
      console.error('Error fetching users:', dbError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Now we need to fetch auth users to get emails and other auth data
    // Get user IDs from profiles
    const userIds = profilesData?.map(profile => profile.id) || [];

    // Early return if no users found
    if (userIds.length === 0) {
      return NextResponse.json(createPaginatedResponse([], count || 0, page, pageSize));
    }
    
    // Fetch auth users using the admin API
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: userIds.length,
      page: 1
    });
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
      return NextResponse.json({ error: 'Failed to fetch user email data' }, { status: 500 });
    }
    
    // Combine profile data with auth user data
    const enrichedProfiles = profilesData?.map(profile => {
      // Find matching auth user
      const authUser = authUsersData?.users?.find(user => user.id === profile.id);
      return {
        ...profile,
        email: authUser?.email,
        last_sign_in_at: authUser?.last_sign_in_at,
        banned_until: authUser ? (authUser as any).banned_until : null,
        user_metadata: authUser?.user_metadata,
        app_metadata: authUser?.app_metadata
      };
    });

    // Create standardized paginated response
    const paginatedResponse = createPaginatedResponse(
      enrichedProfiles || [],
      count || 0,
      page,
      pageSize
    );

    return NextResponse.json(paginatedResponse);

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse & Validate Request Body
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const validationResult = CreateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { email, password, role, client_id, full_name } = validationResult.data;

    // Create Auth User (using Admin Client)
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name,
        role
      }
    });

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError);
      return NextResponse.json({ error: 'Failed to create user account', details: createAuthError.message }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    const newUserId = authData.user.id;

    // Create Profile Record
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        full_name,
        role,
        client_id,
        is_active: true
      })
      .select(`${SELECTORS.USER.DETAIL}, client:clients(${SELECTORS.CLIENT.DROPDOWN})`) // 📊 OPTIMIZED: Specific fields only
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Cleanup: delete the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Failed to create user profile', details: profileError.message }, { status: 500 });
    }

    // Note: Students should be created via the learners API (/api/admin/learners/)
    // This users API is only for creating Admin, Staff, and other non-student profiles

    // Return the created user data
    const responseData = {
      ...profileData,
      email: authData.user.email
    };

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 