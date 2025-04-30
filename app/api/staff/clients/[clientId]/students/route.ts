import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { ClientIdSchema } from '@/lib/schemas/client';
import { EnrollStudentSchema } from '@/lib/schemas/enrollment';
import { USER_ROLES } from '@/lib/schemas/user';
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const { user, profile, role, error: authError } = await getUserSessionAndRole();

    if (authError || !user || !profile) {
      console.error('GET /students Auth Error:', authError);
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const validationResult = ClientIdSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid Client ID format', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    const validatedClientId = validationResult.data.clientId;

    const isAdmin = role === USER_ROLES.find(r => r === 'Admin'); 
    const isStaffForClient = role === USER_ROLES.find(r => r === 'Staff') && profile.client_id === validatedClientId;

    if (!isAdmin && !isStaffForClient) {
      console.warn(`GET /students AuthZ Failed: User ${profile.id} (${role}) attempted access to client ${validatedClientId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient(); 
    const { data: students, error: dbError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at, is_active, last_login_at') 
      .eq('client_id', validatedClientId)
      .eq('role', USER_ROLES.find(r => r === 'Student')) 
      .eq('is_active', true) 
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
  { params }: { params: { clientId: string } }
) {
  try {
    // 1. Authentication & Authorization
    const { user, profile, role, error: authError } = await getUserSessionAndRole();

    if (authError || !user || !profile || !role) {
      console.error('POST /students Auth Error:', authError);
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    // 2. Validate clientId route parameter
    const clientIdValidation = ClientIdSchema.safeParse(params);
    if (!clientIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid Client ID format', details: clientIdValidation.error.flatten() },
        { status: 400 }
      );
    }
    const validatedClientId = clientIdValidation.data.clientId;

    // 3. Authorization Check: Admin or Staff associated with the client
    const isAdmin = role === USER_ROLES.find(r => r === 'Admin');
    const isStaffForClient = role === USER_ROLES.find(r => r === 'Staff') && profile.client_id === validatedClientId;

    if (!isAdmin && !isStaffForClient) {
      console.warn(`POST /students AuthZ Failed: User ${profile.id} (${role}) attempted access to client ${validatedClientId}`);
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
    const supabaseAdmin = createAdminClient();

    // First, check if a profile with this email already exists
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
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
          const { data: updatedProfile, error: updateError } = await supabaseAdmin
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
          const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
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
          const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
      const { data: newProfile, error: insertError } = await supabaseAdmin
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
           await supabaseAdmin.auth.admin.deleteUser(userId);
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
  { params }: { params: { clientId: string } }
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
    const clientIdValidation = ClientIdSchema.safeParse(params);
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

    // 2. Authentication & Authorization
    const { user, profile, role, error: authError } = await getUserSessionAndRole();

    if (authError || !user || !profile || !role) {
      console.error('DELETE /students Auth Error:', authError);
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    // 3. Authorization Check: Admin or Staff associated with the client
    const isAdmin = role === USER_ROLES.find(r => r === 'Admin');
    const isStaffForClient = role === USER_ROLES.find(r => r === 'Staff') && profile.client_id === validatedClientId;

    if (!isAdmin && !isStaffForClient) {
      console.warn(`DELETE /students AuthZ Failed: User ${profile.id} (${role}) attempted to unenroll student ${validatedStudentId} from client ${validatedClientId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Perform Unenrollment (Update Profile)
    const supabaseAdmin = createAdminClient();
    const { data: updatedProfile, error: updateError, count } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: false,  // Mark as inactive
        client_id: null,   // Remove client association
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedStudentId)          // Target the specific student
      .eq('client_id', validatedClientId)    // Ensure they currently belong to this client
      .eq('role', USER_ROLES.find(r => r === 'Student')) // Ensure it's a student profile
      .select('id')                          // Select minimal data to confirm update
      .maybeSingle();                        // Handle case where student/client combo not found

    if (updateError) {
      console.error(`DELETE /students: Database error unenrolling student ${validatedStudentId}:`, updateError);
      return NextResponse.json({ error: 'Failed to unenroll student', details: updateError.message }, { status: 500 });
    }

    // Check if any row was actually updated
    if (!updatedProfile || count === 0) {
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
