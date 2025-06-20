import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { UserIdSchema } from '@/lib/schemas/user';
import { UserRole } from '@/lib/schemas/user';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';

/**
 * GET /api/admin/learners/[studentId]
 * 
 * Retrieves detailed information for a specific learner (user with 'Student' role),
 * including their profile and a summary of their course progress.
 * Accessible by users with the 'Admin' or 'Staff' role.
 */
export async function GET(
  request: Request, // Keep request param even if unused for potential future use (e.g., headers)
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return new NextResponse(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const { user, claims, supabase } = authResult;

    // 2. Validate Route Parameter (studentId)
    const { studentId } = await params;
    const validationResult = UserIdSchema.safeParse({ userId: studentId });

    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid student ID format', details: validationResult.error.flatten() }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Supabase client already available from authResult

    // 3. Fetch Learner Profile
    const { data: learnerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*, client:clients(id, name), job_readiness_background_type')
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

    // 3.5 Fetch Student Data (including temporary_password)
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(SELECTORS.STUDENT.DETAIL)
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('Student Data Fetch Error:', studentError);
      // Continue with profile data even if student data fetch fails
    }

    // 4. Fetch Progress Summary (High-Level - Adapted for available tables)
    // TODO: Define the exact structure and logic for the progress summary.
    // Example: Fetch course progress from 'student_course_progress'
    const { data: courseProgress, error: progressError } = await supabase
        .from('student_course_progress') // Using existing table
        .select(SELECTORS.STUDENT_MODULE_PROGRESS.DETAIL) // Select relevant fields: course_id, status, completed_at, percentage_complete etc.
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
      ...(studentData || {}), // Include student data if available
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

// Schema for updating a learner
const UpdateLearnerSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone_number: z.string().optional().nullable(),
  client_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  job_readiness_background_type: z.enum([
    'ECONOMICS', 
    'COMPUTER_SCIENCE', 
    'MARKETING', 
    'DESIGN', 
    'HUMANITIES', 
    'BUSINESS_ADMINISTRATION', 
    'DATA_SCIENCE',
    'ENGINEERING',
    'HEALTHCARE',
    'OTHER'
  ]).optional(),
});

/**
 * PATCH /api/admin/learners/[studentId]
 * 
 * Updates a learner's information
 * Note: Email changes are not allowed to avoid sync issues with auth.users
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // 2. Validate studentId
    const { studentId } = await params;
    const validationResult = UserIdSchema.safeParse({ userId: studentId });

    if (!validationResult.success) {
      return NextResponse.json({
        error: "Invalid student ID format",
        details: validationResult.error.flatten()
      }, { status: 400 });
    }

    // 3. Parse and validate request body
    const body = await request.json();
    
    // Check if email is being attempted to be updated
    if (body.email !== undefined) {
      return NextResponse.json({ 
        error: "Changing email is not supported", 
        details: "Email updates are not allowed to maintain consistency with authentication systems."
      }, { status: 400 });
    }
    
    const validation = UpdateLearnerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Validation error", 
        details: validation.error.format() 
      }, { status: 400 });
    }
    
    const updateData = validation.data;
    
    // 4. Get service client (supabase client from authResult)
    const serviceClient = await createServiceClient();
    
    // 5. Check if the student exists - query the students table directly
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('id, email')
      .eq('id', studentId)
      .single();
    
    if (checkError || !existingStudent) {
      console.error('Error checking if student exists:', checkError);
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    
    // If client_id is being updated, check if it exists
    if (updateData.client_id) {
      const { data: clientExists, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', updateData.client_id)
        .single();
      
      if (clientError || !clientExists) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
    }
    
    // 7. Update the student
    console.log(`[PATCH /api/admin/learners/${studentId}] Preparing update. User ID: ${user.id}`);
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString()
    };
    console.log(`[PATCH /api/admin/learners/${studentId}] Update Payload:`, JSON.stringify(updatePayload, null, 2));

    // Start transaction for atomic updates
    const tx = await serviceClient.rpc('begin_transaction'); // Assuming a custom RPC or use supabase transaction method if available

    try {
      // Update the student record
      const { data: updateResult, error: updateError, count } = await serviceClient
        .from('students')
        .update(updatePayload)
        .eq('id', studentId);
      
      if (updateError) {
        throw updateError; // Throw to rollback transaction
      }
      
      if (count === 0) {
        console.log(`[PATCH /api/admin/learners/${studentId}] No rows updated - possible no change or concurrency issue`);
        throw new Error('No rows updated');
      }
      
      // Commit transaction
      await serviceClient.rpc('commit_transaction');
      
      // Fetch and return updated student
      const { data: updatedStudent, error: fetchError } = await serviceClient
        .from('students')
        .select(SELECTORS.STUDENT.DETAIL)
        .eq('id', studentId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching updated student:', fetchError);
        return NextResponse.json({ error: "Failed to retrieve updated student data" }, { status: 500 });
      }
      
      return NextResponse.json(updatedStudent);
    } catch (txError) {
      console.error('Transaction Error:', txError);
      await serviceClient.rpc('rollback_transaction');
      return NextResponse.json({
        error: "Failed to update student",
        details: txError instanceof Error ? txError.message : 'Unknown error during transaction'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/learners/[studentId]:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/learners/[studentId]
 * 
 * Deletes a learner (both auth user and student record)
 * This can only be done by an Admin
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // 2. Validate studentId
    const { studentId } = await params;
    const validationResult = UserIdSchema.safeParse({ userId: studentId });

    if (!validationResult.success) {
      return NextResponse.json({
        error: "Invalid student ID format",
        details: validationResult.error.flatten()
      }, { status: 400 });
    }

    // 3. Get service client (supabase client from authResult)
    const serviceClient = await createServiceClient();
    
    // 4. Check if the student exists
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .single();
    
    if (checkError || !existingStudent) {
      console.error('Error checking if student exists:', checkError);
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    
    // 5. Start a transaction - depends on Supabase's transaction support
    try {
      // First delete the student record
      const { error: deleteStudentError } = await serviceClient
        .from('students')
        .delete()
        .eq('id', studentId);
      
      if (deleteStudentError) {
        throw deleteStudentError;
      }
      
      // Delete all progress data associated with the student
      // For student_module_progress
      const { error: deleteProgressError } = await serviceClient
        .from('student_module_progress')
        .delete()
        .eq('student_id', studentId);
      
      if (deleteProgressError) {
        console.warn('Error deleting student module progress:', deleteProgressError);
        // Consider whether this should be a hard failure
      }
      
      // Delete the auth user
      const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(studentId);
      
      if (deleteAuthError) {
        throw deleteAuthError;
      }
      
      return NextResponse.json({ message: "Student successfully deleted" });
    } catch (txError) {
      console.error('Error during student deletion:', txError);
      return NextResponse.json({
        error: "Failed to delete student",
        details: txError instanceof Error ? txError.message : 'Unknown error during deletion'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/learners/[studentId]:', error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
