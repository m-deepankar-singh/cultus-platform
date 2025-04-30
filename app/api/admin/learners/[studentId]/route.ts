import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { UserIdSchema } from '@/lib/schemas/user';
import { UserRole } from '@/lib/schemas/user';

/**
 * GET /api/admin/learners/[studentId]
 * 
 * Retrieves detailed information for a specific learner (user with 'Student' role),
 * including their profile and a summary of their course progress.
 * Accessible only by users with the 'Admin' role.
 */
export async function GET(
  request: Request, // Keep request param even if unused for potential future use (e.g., headers)
  { params }: { params: { studentId: string } }
) {
  try {
    // 1. Authentication & Authorization (using the utility)
    const { user, profile: sessionProfile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !sessionProfile) {
        console.error('Session Error:', sessionError?.message);
        const status = sessionError?.message.includes('No active user session') ? 401 : 403;
        return new NextResponse(JSON.stringify({ error: sessionError?.message || 'Unauthorized or admin profile missing' }), {
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

    // Get Supabase client *after* auth check
    const supabase = await createClient();

    // 3. Fetch Learner Profile
    const { data: learnerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*, client:clients(id, name)')
      .eq('id', studentId)
      .eq('role', 'Student' as UserRole) // Ensure it's a student profile
      .single();

    if (profileError || !learnerProfile) {
        // Differentiate between DB error and not found/not a student
        const status = profileError && profileError.code !== 'PGRST116' ? 500 : 404; // PGRST116: Row not found
        const error = status === 404 ? 'Learner not found or is not a student' : 'Database error fetching profile';
        if(status === 500) console.error('Profile Fetch Error:', profileError);
        return new NextResponse(JSON.stringify({ error }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 4. Fetch Progress Summary (High-Level - Adapted for available tables)
    // TODO: Define the exact structure and logic for the progress summary.
    // Example: Fetch course progress from 'student_course_progress'
    const { data: courseProgress, error: progressError } = await supabase
        .from('student_course_progress') // Using existing table
        .select('*') // Select relevant fields: course_id, status, completed_at, percentage_complete etc.
        .eq('student_id', studentId);

    if (progressError) {
        console.error('Progress Fetch Error:', progressError);
        // Decide if this should be a hard error or just return profile without progress
        return new NextResponse(JSON.stringify({ error: 'Database error fetching course progress' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Placeholder for Assessment Progress when table exists
    // const assessmentProgress = []; // Replace with actual fetch logic

    const progressSummary = {
        courses: courseProgress || [],
        // assessments: assessmentProgress, // Uncomment when implemented
    };

    // 5. Combine and Return Response
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
