import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Adjust path as necessary
import { createAdminClient } from '@/lib/supabase/admin'; // Adjust path
import { CreateUserSchema } from '@/lib/schemas/user'; // Adjust path
import { calculatePaginationRange, createPaginatedResponse } from '@/lib/pagination';
// We likely don't need a separate getUserSession utility here, 
// as createClient provides a client that can get the user via cookies.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user's profile to check their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Improved error handling - if no profile or error fetching profile, return 403 Forbidden
    if (profileError || !profile) {
        console.error('Error fetching user profile or profile not found:', profileError);
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Authorize based on role
    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
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
      .select('*, client:clients(id, name)'); // Fetch profile and related client name

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
    // 1. Authentication & Authorization (using Server Client for requesting user)
    const supabase = await createClient();
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !requestingUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    // Improved error handling for profile fetch
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 2. Parse & Validate Request Body
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

    // 3. Create Auth User (using Admin Client)
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Or false depending on desired flow
      user_metadata: { full_name: full_name },
    });

    if (createAuthError) {
      console.error('Auth user creation error:', createAuthError);
      // Check for specific errors, e.g., user already exists
      if (createAuthError.message.includes('User already exists')) {
           return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 }); // Conflict
      }
      return NextResponse.json({ error: createAuthError.message || 'Failed to create user in auth' }, { status: 500 });
    }

    if (!authData || !authData.user) {
      console.error('Auth user creation failed silently.');
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }
    const userId = authData.user.id;

    // 4. Create Profile Entry (using Admin Client for consistency or Server Client if RLS allows)
    const { data: profileData, error: createProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        role: role,
        client_id: client_id,
        full_name: full_name,
        // Add any other fields from CreateUserSchema here
      })
      .select() // Select the created profile
      .single();

    // 5. Handle Profile Creation Errors & Cleanup (Atomicity Concern)
    if (createProfileError) {
      console.error('Profile creation error:', createProfileError);
      // Attempt to delete the orphaned auth user (best effort)
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log(`Cleaned up orphaned auth user: ${userId}`);
      } catch (deleteError) {
        console.error(`Failed to clean up orphaned auth user ${userId}:`, deleteError);
        // Log this critical state - manual intervention might be needed
      }
      return NextResponse.json({ error: createProfileError.message || 'Failed to create user profile' }, { status: 500 });
    }

    // 6. Return Success Response
    return NextResponse.json(profileData, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 