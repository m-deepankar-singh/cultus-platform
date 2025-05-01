import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
// Import the correct schema for module updates
import { ModuleProgressUpdateSchema } from '@/lib/schemas/progress';

// Define a schema for UUID validation
const UuidSchema = z.string().uuid({ message: 'Invalid Module ID format' });

// Define PATCH handler
export async function PATCH(
  request: Request,
  { params }: { params: { moduleId: string } },
) {
  try {
    // 1. Validate Route Parameter (moduleId)
    const { moduleId } = await params;
    const moduleIdValidation = UuidSchema.safeParse(moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 },
      );
    }

    // 2. Parse and Validate Request Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Bad Request: Invalid JSON body' }, { status: 400 });
    }

    // Use the imported schema for validation
    const bodyValidation = ModuleProgressUpdateSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid request body for module update', details: bodyValidation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const updateData = bodyValidation.data; // Use validated data

    // 3. Authentication & Authorization
    const supabase = await createClient(); 

    // 1. Authentication: Get user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth Error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized: No active session' },
        { status: 401 },
      );
    }

    // 2. Authorization: Get student record and check status
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students') // Query the students table
      .select('client_id, is_active') // Select relevant fields
      .eq('id', user.id)
      .single();

    if (studentFetchError) {
      console.error('Student Fetch Error:', studentFetchError);
      if (studentFetchError.code === 'PGRST116') { // No student record found for this user ID
        return NextResponse.json(
          { error: 'Forbidden: Student record not found' }, // More specific error
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: 'Internal Server Error: Could not fetch student record' },
        { status: 500 },
      );
    }

    // Check if student account is active
    if (!studentRecord.is_active) {
        return NextResponse.json(
            { error: 'Forbidden: Student account is inactive' },
            { status: 403 },
        );
    }

    // Ensure the student is associated with a client
    if (!studentRecord.client_id) { 
      console.error(`Student ${user.id} has no assigned client_id in students table.`);
      return NextResponse.json(
        { error: 'Forbidden: Student not associated with a client' },
        { status: 403 },
      );
    }
    const studentId = user.id;
    const clientId = studentRecord.client_id; // Use client_id from the student record

    // 4. Verify Enrollment
    // 4a. Get product_id from module
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('product_id')
      .eq('id', moduleId)
      .maybeSingle(); // Use maybeSingle as module might not exist

    if (moduleError) {
      console.error('Error fetching module:', moduleError);
      return NextResponse.json({ error: 'Internal Server Error fetching module data' }, { status: 500 });
    }
    if (!moduleData || !moduleData.product_id) {
      return NextResponse.json({ error: 'Not Found: Module does not exist or has no product associated' }, { status: 404 });
    }
    const productId = moduleData.product_id;

    // 4b. Check client assignment to the product
    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true }) // Select doesn't matter with head:true, just need count
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (assignmentError) {
      console.error('Error checking product assignment:', assignmentError);
      return NextResponse.json({ error: 'Internal Server Error checking enrollment' }, { status: 500 });
    }
    // If count is null (error before count) or 0, the assignment doesn't exist.
    if (count === null || count === 0) {
      return NextResponse.json(
        { error: 'Forbidden: Student is not enrolled in the product containing this module' },
        { status: 403 },
      );
    }

    console.log('Enrollment Verified for student:', studentId, 'on module:', moduleId);
    console.log('Validated Update Data:', updateData);

    // 5. Upsert Progress
    const progressRecord: {
      student_id: string;
      module_id: string;
      status?: 'NotStarted' | 'InProgress' | 'Completed';
      score?: number | null;
      progress_percentage?: number | null;
      completed_at: string | null;
      last_updated: string;
    } = {
      student_id: studentId,
      module_id: moduleId,
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(updateData.score !== undefined && { score: updateData.score }),
      ...(updateData.progress_percentage !== undefined && { progress_percentage: updateData.progress_percentage }),
      completed_at: updateData.status === 'Completed' ? new Date().toISOString() : null,
      last_updated: new Date().toISOString(),
    };

    const { data: upsertedProgress, error: upsertError } = await supabase
      .from('student_module_progress')
      .upsert(progressRecord, {
        onConflict: 'student_id, module_id', // Specify composite primary/unique key
        // defaultToNull: false // Consider setting this based on your table defaults
      })
      .select() // Return the full upserted row
      .single(); // Expecting one row back

    if (upsertError) {
      console.error('Error upserting progress:', upsertError);
      // TODO: Add more specific error handling (e.g., FK violation if moduleId doesn't exist)
      return NextResponse.json(
        { error: 'Internal Server Error: Could not update progress' },
        { status: 500 },
      );
    }

    // 6. Return Success Response
    return NextResponse.json(upsertedProgress, { status: 200 });
  } catch (error) {
    console.error('Unexpected Error in PATCH handler:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

/**
 * GET handler for fetching a student's progress on a specific module.
 * - Validates moduleId.
 * - Authenticates and authorizes the student.
 * - Verifies student enrollment in the module's product.
 * - Fetches the progress record from student_module_progress.
 * - Returns the progress or a default 'NotStarted' state.
 */
export async function GET(
  request: Request, // Keep request parameter for consistency, though not used directly
  { params }: { params: { moduleId: string } },
) {
  try {
    // 1. Validate Route Parameter (moduleId)
    const { moduleId } = await params;
    const moduleIdValidation = UuidSchema.safeParse(moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 },
      );
    }

    // 2. Authentication & Authorization (Similar to PATCH)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
       return NextResponse.json({ error: 'Forbidden: Profile not found' }, { status: 403 });
    }
    if (profile.role !== 'Student') {
       return NextResponse.json({ error: 'Forbidden: User is not a Student' }, { status: 403 });
    }
    if (!profile.client_id) {
      return NextResponse.json({ error: 'Forbidden: Student not linked to a client' }, { status: 403 });
    }
    const studentId = user.id;
    const clientId = profile.client_id;

    // 3. Verify Enrollment (Similar to PATCH)
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('product_id')
      .eq('id', moduleId)
      .maybeSingle();

    if (moduleError) {
      console.error('GET Progress - Error fetching module:', moduleError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (!moduleData || !moduleData.product_id) {
      return NextResponse.json({ error: 'Not Found: Module does not exist' }, { status: 404 });
    }
    const productId = moduleData.product_id;

    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productId);

    if (assignmentError) {
      console.error('GET Progress - Error checking assignment:', assignmentError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (count === null || count === 0) {
      return NextResponse.json({ error: 'Forbidden: Not enrolled' }, { status: 403 });
    }

    // 4. Fetch Progress
    const { data: progress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('status, score, completed_at, updated_at')
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .maybeSingle(); // Use maybeSingle as progress might not exist

    if (progressError) {
      console.error('GET Progress - Error fetching progress:', progressError);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // 5. Return Progress or Default State
    if (progress) {
      return NextResponse.json(progress, { status: 200 });
    } else {
      // Return a default 'NotStarted' state if no record exists
      return NextResponse.json(
        {
          status: 'NotStarted',
          score: null,
          completed_at: null,
          updated_at: null, // Or maybe current time? Null seems cleaner
        },
        { status: 200 }, // 200 OK is appropriate even if not started
      );
    }

  } catch (error) {
    console.error('Unexpected Error in GET /progress/course/[moduleId]:', error);
    if (error instanceof z.ZodError) { // Catch Zod errors specifically if needed
        return NextResponse.json(
          { error: 'Bad Request: Validation failed', details: error.flatten() },
          { status: 400 },
        );
      }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
