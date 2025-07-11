import { NextRequest, NextResponse } from 'next/server';
import { CreateUserSchema } from '@/lib/schemas/user'; // Adjust path
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';
// We likely don't need a separate getUserSession utility here, 
// as createClient provides a client that can get the user via cookies.

export async function GET(request: NextRequest) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequestSecure(['Admin']);
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

    // Use authenticated client - api-auth already verified Admin role
    
    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // 🚀 PHASE 1 OPTIMIZATION: Single RPC call replaces multiple queries
    // This replaces:
    // 1. profiles count query
    // 2. profiles data query with join
    // 3. auth.users query
    // Total: 3 database calls → 1 database call (67% reduction)
    const { data: usersData, error: rpcError } = await authResult.supabase
      .rpc('get_users_with_auth_details', {
        p_search_query: searchQuery,
        p_role_filter: roleFilter,
        p_client_id_filter: clientIdFilter ? clientIdFilter : null,
        p_limit: pageSize,
        p_offset: from
      });

    if (rpcError) {
      console.error('Error fetching users via RPC:', rpcError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Extract total count from first record (all records have same total_count)
    const totalCount = usersData?.[0]?.total_count || 0;

    // Create standardized paginated response
    const paginatedResponse = createPaginatedResponse(
      usersData || [],
      Number(totalCount),
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
    const authResult = await authenticateApiRequestSecure(['Admin']);
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

    // Dynamically import and create the admin client only when needed
    const { createAdminClient } = await import('@/lib/supabase/admin');
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