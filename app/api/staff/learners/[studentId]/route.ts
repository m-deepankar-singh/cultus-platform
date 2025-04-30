import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { UserIdSchema } from '@/lib/schemas/user';
import { UserRole } from '@/lib/schemas/user';

/**
 * GET /api/staff/learners/[studentId]
 * 
 * Retrieves detailed information for a specific learner (user with 'Student' role),
 * including their profile and a summary of their course progress.
 * Accessible by 'Admin' and 'Staff' roles.
 * Staff users can only access learners belonging to their assigned client.
 */
export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    // 1. Authentication & Authorization (Admin or Staff)
    const { user, profile: sessionProfile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !sessionProfile) {
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

    // Store Staff's client ID for later check
    const sessionClientId = sessionProfile.client_id;

    // 2. Validate Route Parameter (studentId)
    const validationResult = UserIdSchema.safeParse({ userId: params.studentId });

    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid student ID format', details: validationResult.error.flatten() }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { userId: studentId } = validationResult.data;

    // Get Supabase client
    const supabase = await createClient();

    // 3. Fetch Learner Profile
    const { data: learnerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*, client:clients(id, name)')
      .eq('id', studentId)
      .eq('role', 'Student' as UserRole)
      .single();

    if (profileError || !learnerProfile) {
      const status = profileError && profileError.code !== 'PGRST116' ? 500 : 404;
      const errorMsg = status === 404 ? 'Learner not found or is not a student' : 'Database error fetching profile';
      if (status === 500) console.error('Learner Profile Fetch Error:', profileError);
      return new NextResponse(JSON.stringify({ error: errorMsg }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Verify Staff Access (Crucial Step)
    if (role === 'Staff') {
      if (!sessionClientId) {
         console.warn(`Staff user ${user.id} accessing learner ${studentId} has no client_id assigned.`);
         return new NextResponse(JSON.stringify({ error: 'Forbidden: Staff user not assigned to a client' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
         });
      }
      if (learnerProfile.client_id !== sessionClientId) {
        console.warn(`Staff user ${user.id} (client: ${sessionClientId}) attempted to access learner ${studentId} (client: ${learnerProfile.client_id}).`);
        return new NextResponse(JSON.stringify({ error: 'Forbidden: Access denied to this learner' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    // Admins pass through this check

    // 5. Fetch Progress Summary (Adapted for available tables)
    const { data: courseProgress, error: progressError } = await supabase
        .from('student_course_progress')
        .select('*')
        .eq('student_id', studentId);

    if (progressError) {
        console.error('Progress Fetch Error:', progressError);
        return new NextResponse(JSON.stringify({ error: 'Database error fetching course progress' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const progressSummary = {
        courses: courseProgress || [],
        // assessments: [], // Placeholder
    };

    // 6. Combine and Return Response
    const learnerDetails = {
      ...learnerProfile,
      progressSummary,
    };

    return NextResponse.json(learnerDetails);

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
