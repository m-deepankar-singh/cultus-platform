import { NextResponse } from 'next/server';
import { ClientIdSchema } from '@/lib/schemas/client';
import { EnrollStudentSchema } from '@/lib/schemas/enrollment';
import { USER_ROLES } from '@/lib/schemas/user';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Staff', 'Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get role and client_id from JWT claims
    const userRole = claims.user_role;
    const userClientId = claims.client_id;

    // Await params before validation
    const awaitedParams = await params;
    const validationResult = ClientIdSchema.safeParse({ clientId: awaitedParams.clientId });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid Client ID format', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    const validatedClientId = validationResult.data.clientId;

    const isAdmin = userRole === 'Admin'; 
    const isStaffForClient = userRole === 'Staff' && userClientId === validatedClientId;

    if (!isAdmin && !isStaffForClient) {
      console.warn(`GET /students AuthZ Failed: User ${user.id} (${userRole}) attempted access to client ${validatedClientId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: students, error: dbError } = await supabase
      .from('students')
      .select('id, full_name, email, created_at, is_active, last_login_at') 
      .eq('client_id', validatedClientId)
      .order('full_name', { ascending: true });

    if (dbError) {
      console.error('GET /students DB Error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch students', details: dbError.message }, { status: 500 });
    }

    return NextResponse.json(students || []);

  } catch (error) {
    console.error('GET /students Unexpected Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Staff', 'Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get role and client_id from JWT claims
    const userRole = claims.user_role;
    const userClientId = claims.client_id;

    // 2. Validate clientId route parameter
    // Await params before validation
    const awaitedParams = await params;
    const clientIdValidation = ClientIdSchema.safeParse({ clientId: awaitedParams.clientId });
    if (!clientIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Client ID format', details: clientIdValidation.error.flatten() },
        { status: 400 }
      );
    }
    const validatedClientId = clientIdValidation.data.clientId;

    // 3. Authorization Check: Admin or Staff associated with the client
    const isAdmin = userRole === 'Admin';
    const isStaffForClient = userRole === 'Staff' && userClientId === validatedClientId;

    if (!isAdmin && !isStaffForClient) {
      console.warn(`POST /students AuthZ Failed: User ${user.id} (${userRole}) attempted access to client ${validatedClientId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Parse & Validate Request Body
    const body = await request.json();
    const bodyValidation = EnrollStudentSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyValidation.error.flatten() },
        { status: 400 }
      );
    }
    const { email, full_name, send_invite } = bodyValidation.data;

    // 5. Core Enrollment Logic
    // Use supabase from authResult

    // First, check if a profile with this email already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, client_id, is_active, role')
      .eq('email', email)
      .maybeSingle(); // Use maybeSingle to handle null or one row

    if (profileCheckError) {
      console.error(`POST /students Error checking profile by email ${email}:`, profileCheckError);
      return NextResponse.json({ error: 'Failed to check existing profile by email', details: profileCheckError.message }, { status: 500 });
    }

    let userId: string;
    let profileResponse: any; // To hold the final profile data to return
    let responseStatus = 200; // Default OK status

    if (existingProfile) {
      // --- Scenario 1: Profile with this Email EXISTS --- //
      userId = existingProfile.id;
      console.log(`POST /students: Profile for email ${email} found (ID: ${userId}, Client: ${existingProfile.client_id}, Active: ${existingProfile.is_active})`);

      if (existingProfile.client_id === validatedClientId) {
        // Profile belongs to the *correct* client
        if (existingProfile.is_active) {
          // Already active and enrolled in this client
          console.log(`POST /students: User ${userId} already active in client ${validatedClientId}`);
          profileResponse = existingProfile;
          responseStatus = 200; // OK
        } else {
          // Inactive profile for this client - reactivate
          console.log(`POST /students: Reactivating inactive user ${userId} for client ${validatedClientId}`);
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select('id, client_id, is_active, role, email, full_name') // Select fields to return
            .single();

          if (updateError) {
            console.error(`POST /students: Error reactivating profile ${userId}:`, updateError);
            return NextResponse.json({ error: 'Failed to reactivate student', details: updateError.message }, { status: 500 });
          }
          profileResponse = updatedProfile;
          responseStatus = 200; // OK (updated)
        }
      } else {
        // Profile exists but belongs to a DIFFERENT client
        console.warn(`POST /students: User ${email} (ID: ${userId}) already belongs to client ${existingProfile.client_id}`);
        return NextResponse.json(
          { error: `User with this email already exists and belongs to a different client.` },
          { status: 409 } // Conflict
        );
      }
    } else {
      // --- Scenario 2: Profile with this Email Does NOT Exist --- //
      console.log(`POST /students: No profile found for email ${email}. Attempting invite/create Auth user...`);

      // ---> Refactored Logic: Remove pre-check, attempt invite/create directly <--- 
      let newUserResponse;
      userId = ''; // Initialize userId

      try {
        if (send_invite) {
          const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`;
          console.log(`POST /students: Inviting user ${email} with redirect to ${redirectTo}`);
          const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: { full_name: full_name },
            redirectTo: redirectTo,
          });

          if (inviteError) {
            // Throw the error to be caught by the outer catch block
            throw inviteError;
          }
          newUserResponse = data;
        } else {
          // Direct creation
          console.warn(`POST /students: Creating user ${email} directly without invite.`);
          const { data, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true, // Auto-confirm for simplicity, adjust if needed
            user_metadata: { full_name: full_name },
            // No password needed for admin creation, user sets it via invite/reset usually
          });
          if (createError) {
            // Throw the error
            throw createError;
          }
          newUserResponse = data;
        }

        if (!newUserResponse?.user) {
          // Should not happen if no error was thrown, but check defensively
          console.error(`POST /students: Missing user data after successful invite/create for ${email}.`);
          throw new Error('Failed to retrieve new user information after creation/invite');
        }

        userId = newUserResponse.user.id;
        console.log(`POST /students: Successfully created/invited auth user ${email} with ID: ${userId}. Creating profile...`);

      } catch (authError: any) {
          // --- Catch errors from inviteUserByEmail or createUser --- 
          console.error(`POST /students: Error during auth user invite/create for ${email}:`, authError);

          // Check if the error indicates the email already exists (common patterns)
          const message = authError.message?.toLowerCase() || '';
          if (message.includes('already registered') || message.includes('unique constraint') || message.includes('email_unique')) {
              console.warn(`POST /students: Conflict - Email ${email} already exists in auth.users.`);
              return NextResponse.json({ error: 'User with this email already exists.', details: authError.message }, { status: 409 }); // Conflict
          }

          // Handle other unexpected auth errors
          return NextResponse.json({ error: 'Failed to invite or create user', details: authError.message }, { status: 500 });
      }

      // --- If auth user creation/invite succeeded, proceed to create profile --- 
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId, // Use the userId obtained from successful invite/create
          email: email,
          full_name: full_name,
          role: USER_ROLES.find(r => r === 'Student'),
          client_id: validatedClientId,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .select('id, client_id, is_active, role, email, full_name')
        .single();

      if (insertError) {
        console.error(`POST /students: Error creating profile for *new* auth user ${userId}:`, insertError);
        // Consider deleting the created auth user if profile insertion fails
        console.log(`POST /students: Attempting to delete auth user ${userId} due to profile creation failure.`);
        try {
           await supabase.auth.admin.deleteUser(userId);
           console.log(`POST /students: Successfully deleted auth user ${userId}.`);
        } catch (deleteError: any) {
           console.error(`POST /students: CRITICAL - Failed to delete auth user ${userId} after profile creation error:`, deleteError);
           // Log this critical state - might need manual cleanup
        }
        return NextResponse.json({ error: 'Failed to create student profile after user creation', details: insertError.message }, { status: 500 });
      }

      profileResponse = newProfile;
      responseStatus = 201; // Created
    }

    // Return the final profile data and status
    return NextResponse.json(profileResponse, { status: responseStatus });

  } catch (error: any) {
    console.error('POST /students Unexpected Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
/**
 * DELETE /api/staff/clients/[clientId]/students?studentId=...
 * Unenroll a student from a client by setting their profile to inactive and removing the client association.
 * Requires studentId as a query parameter.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // Extract the studentId from query parameters
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    // 1. Validate parameters
    if (!studentId) {
      return NextResponse.json({ error: 'Missing required query parameter: studentId' }, { status: 400 });
    }

    // Validate clientId
    // Await params before validation
    const awaitedParams = await params;
    const clientIdValidation = ClientIdSchema.safeParse({ clientId: awaitedParams.clientId });
    if (!clientIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Client ID format', details: clientIdValidation.error.flatten() },
        { status: 400 }
      );
    }
    const validatedClientId = clientIdValidation.data.clientId;

    // Validate studentId format (UUID)
    const studentIdValidation = z.string().uuid({ message: 'Invalid Student ID format' }).safeParse(studentId);
if (!studentIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Student ID format', details: studentIdValidation.error.flatten() },
        { status: 400 }
      );
    }
    const validatedStudentId = studentIdValidation.data;

    // 2. JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Staff', 'Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get role and client_id from JWT claims
    const userRole = claims.user_role;
    const userClientId = claims.client_id;

    // 3. Authorization Check: Admin or Staff associated with the client
    const isAdmin = userRole === 'Admin';
    const isStaffForClient = userRole === 'Staff' && userClientId === validatedClientId;

    if (!isAdmin && !isStaffForClient) {
      console.warn(`DELETE /students AuthZ Failed: User ${user.id} (${userRole}) attempted to unenroll student ${validatedStudentId} from client ${validatedClientId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Perform Unenrollment (Update Student Table)
    const { data: updatedStudent, error: updateError, count } = await supabase
      .from('students') // Changed from profiles to students
      .update({
        is_active: false, // Mark as inactive in the students table
        // client_id: null, // Removing client_id might not be necessary, just deactivate
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedStudentId) // Target the specific student
      .eq('client_id', validatedClientId) // Ensure they belong to this client
      // .eq('role', USER_ROLES.find(r => r === 'Student')) // Role check not needed for students table
      .select('id') // Select minimal data to confirm update
      .maybeSingle();

    if (updateError) {
      console.error(`DELETE /students: Database error unenrolling student ${validatedStudentId}:`, updateError);
      return NextResponse.json({ error: 'Failed to unenroll student', details: updateError.message }, { status: 500 });
    }

    // Check if any row was actually updated
    if (!updatedStudent || count === 0) {
      console.warn(`DELETE /students: Student ${validatedStudentId} not found or not active for client ${validatedClientId}`);
      return NextResponse.json({ error: 'Student not found for this client or already unenrolled' }, { status: 404 });
    }

    // 5. Return Success Response
    return new NextResponse(null, { status: 204 }); // No Content on successful DELETE

  } catch (error: any) {
    console.error('DELETE /students Unexpected Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/staff/clients/[clientId]/students?studentId=...
 * Activate or deactivate a student for a client by toggling their profile's is_active status.
 * Requires studentId as a query parameter and is_active in the request body.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // Extract the studentId from query parameters
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    // 1. Validate parameters
    if (!studentId) {
      return NextResponse.json({ error: 'Missing required query parameter: studentId' }, { status: 400 });
    }

    // Validate clientId
    // Await params before validation
    const awaitedParams = await params;
    const clientIdValidation = ClientIdSchema.safeParse({ clientId: awaitedParams.clientId });
    if (!clientIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Client ID format', details: clientIdValidation.error.flatten() },
        { status: 400 }
      );
    }
    const validatedClientId = clientIdValidation.data.clientId;

    // Validate studentId format (UUID)
    const studentIdValidation = z.string().uuid({ message: 'Invalid Student ID format' }).safeParse(studentId);
    if (!studentIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Student ID format', details: studentIdValidation.error.flatten() },
        { status: 400 }
      );
    }
    const validatedStudentId = studentIdValidation.data;

    // Parse request body
    const body = await request.json();
    const bodySchema = z.object({
      is_active: z.boolean({ required_error: 'is_active is required' })
    });
    
    const bodyValidation = bodySchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyValidation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { is_active } = bodyValidation.data;

    // 2. JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Staff', 'Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get role and client_id from JWT claims
    const userRole = claims.user_role;
    const userClientId = claims.client_id;

    // 3. Authorization Check: Admin or Staff associated with the client
    const isAdmin = userRole === 'Admin';
    const isStaffForClient = userRole === 'Staff' && userClientId === validatedClientId;

    if (!isAdmin && !isStaffForClient) {
      console.warn(`PATCH /students AuthZ Failed: User ${user.id} (${userRole}) attempted to update student ${validatedStudentId} for client ${validatedClientId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Check if student exists and belongs to this client
    const { data: existingStudent, error: fetchError } = await supabase
      .from('students') // Changed from profiles to students
      .select('id, is_active')
      .eq('id', validatedStudentId)
      .eq('client_id', validatedClientId)
      // .eq('role', USER_ROLES.find(r => r === 'Student')) // Role check not needed for students table
      .maybeSingle();

    if (fetchError) {
      console.error(`PATCH /students: Database error checking student ${validatedStudentId}:`, fetchError);
      return NextResponse.json({ error: 'Failed to check student status', details: fetchError.message }, { status: 500 });
    }

    if (!existingStudent) {
      console.warn(`PATCH /students: Student ${validatedStudentId} not found for client ${validatedClientId}`);
      return NextResponse.json({ error: 'Student not found for this client' }, { status: 404 });
    }

    // 5. Update student status
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students') // Changed from profiles to students
      .update({
        is_active: is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedStudentId)
      .eq('client_id', validatedClientId)
      // .eq('role', USER_ROLES.find(r => r === 'Student')) // Role check not needed for students table
      .select('id, full_name, email, is_active') // Ensure these fields exist in students table
      .single();

    if (updateError) {
      console.error(`PATCH /students: Database error updating student ${validatedStudentId}:`, updateError);
      return NextResponse.json({ error: 'Failed to update student status', details: updateError.message }, { status: 500 });
    }

    // 6. Return updated student
    return NextResponse.json(updatedStudent);

  } catch (error: any) {
    console.error('PATCH /students Unexpected Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
