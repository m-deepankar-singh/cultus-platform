import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { LearnerListQuerySchema } from '@/lib/schemas/learner';
import { UserRole } from '@/lib/schemas/user';

/**
 * GET /api/staff/learners
 * 
 * Retrieves a list of learners (users with the 'Student' role).
 * Accessible by users with 'Admin' or 'Staff' roles.
 * Staff users will only see learners associated with their assigned client.
 * Admins can see all learners or filter by client ID.
 * Supports filtering by search term, client ID (Admin only), and active status.
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization (Admin or Staff)
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
      console.error('Session Error:', sessionError?.message);
      const status = sessionError?.message.includes('No active user session') ? 401 : 403;
      return new NextResponse(
        JSON.stringify({ error: sessionError?.message || 'Unauthorized or profile missing' }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the role is allowed
    const allowedRoles: UserRole[] = ['Admin', 'Staff'];
    if (!allowedRoles.includes(role as UserRole)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Determine Client Scope (for Staff)
    let staffClientId: string | null = null;
    if (role === 'Staff') {
      staffClientId = profile.client_id;
      if (!staffClientId) {
        console.warn(`Staff user ${user.id} has no client_id assigned.`);
        // Return empty list if staff has no client assigned
        return NextResponse.json([]);
      }
    }

    // 3. Parse & Validate Query Parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = LearnerListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid query parameters', details: validationResult.error.flatten() }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Note: We use validated clientId *only* if the user is Admin.
    const { search, clientId: validatedClientId, isActive } = validationResult.data;

    // Get Supabase client
    const supabase = await createClient();

    // 4. Build Supabase Query
    let query = supabase
      .from('profiles')
      .select('id, updated_at, role, client_id, is_active, is_enrolled, full_name, status, client:clients(id, name)');

    // Filter by role='Student'
    query = query.eq('role', 'Student' as UserRole);

    // Apply Scoping based on user role
    if (role === 'Staff') {
      query = query.eq('client_id', staffClientId);
      // Ignore any clientId passed in query params for Staff
    } else if (role === 'Admin' && validatedClientId) {
      // Admin can filter by a specific client ID if provided
      query = query.eq('client_id', validatedClientId);
    }
    // If Admin doesn't provide clientId, no client filter is applied (sees all)

    // Apply search filter (case-insensitive)
    if (search) {
      query = query.or(`full_name.ilike.%${search}%`);
    }

    // Apply active filter
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Add ordering
    query = query.order('full_name', { ascending: true });

    // 5. Execute Query & Handle Response
    const { data: learners, error: dbError } = await query;

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return new NextResponse(JSON.stringify({ error: 'Database error fetching learners' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(learners || []);

  } catch (error) {
    console.error('API Error:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
