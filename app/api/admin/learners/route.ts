import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Correct path and function
import { getUserSessionAndRole } from '@/lib/supabase/utils'; // Correct path
import { LearnerListQuerySchema } from '@/lib/schemas/learner';
import { UserRole } from '@/lib/schemas/user';

/**
 * GET /api/admin/learners
 * 
 * Retrieves a list of learners (users with the 'Student' role).
 * Accessible only by users with the 'Admin' role.
 * Supports filtering by search term, client ID, and active status.
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization (using the utility)
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
        console.error('Session Error:', sessionError?.message);
        const status = sessionError?.message.includes('No active user session') ? 401 : 403;
        return new NextResponse(JSON.stringify({ error: sessionError?.message || 'Unauthorized or profile missing' }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (role !== 'Admin') {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse & Validate Query Parameters
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

    const { search, clientId, isActive } = validationResult.data;

    // Get Supabase client *after* auth check
    const supabase = await createClient();

    // 3. Build Supabase Query
    let query = supabase
      .from('students')
      .select('id, created_at, updated_at, client_id, is_active, full_name, email, phone_number, star_rating, last_login_at, client:clients(id, name)');
      
    // Apply search filter (case-insensitive on full_name and email)
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply client filter
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    // Apply active filter
    if (isActive !== undefined) { // Check if the parameter was provided
      query = query.eq('is_active', isActive === 'true');
    }

    // Add ordering
    query = query.order('full_name', { ascending: true });

    // 4. Execute Query & Handle Response
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
