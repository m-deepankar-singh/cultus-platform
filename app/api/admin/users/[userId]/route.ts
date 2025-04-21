import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Adjust path
import { UserIdSchema, UpdateUserSchema } from '@/lib/schemas/user'; // Adjust path
import { createAdminClient } from '@/lib/supabase/admin'; // Adjust path

export async function GET(
  request: Request, 
  { params }: { params: { userId: string } }
) {
  try {
    // 1. Authentication & Authorization
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

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not verify user role' }, { status: 500 });
    }

    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Validate Route Parameter
    const validationResult = UserIdSchema.safeParse({ userId: params.userId });
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid User ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { userId } = validationResult.data;

    // 3. Fetch User Profile
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*, client:clients(id, name)') // Select all profile fields and client info
      .eq('id', userId)
      .single();

    // 4. Handle Response & Errors
    if (fetchError) {
      // Check if the error is because the user was not found
      if (fetchError.code === 'PGRST116') { // PostgREST code for "Row not found"
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      // Otherwise, it's likely a server error
      console.error('Error fetching profile:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }
    
    // Profile found is implied if no error and fetchError.code wasn't PGRST116
    // Although Supabase might return null data without error in some cases, 
    // .single() should error if no row found.
    if (!userProfile) { 
        // This case might be redundant due to .single() error handling, but included for safety.
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 5. Return Profile Data
    return NextResponse.json(userProfile);

  } catch (error) {
    console.error(`Unexpected error in GET /api/admin/users/[userId]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request, 
  { params }: { params: { userId: string } }
) {
  try {
    // 1. Authentication & Authorization
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

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not verify user role' }, { status: 500 });
    }

    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Validate Route Parameter
    const userIdValidation = UserIdSchema.safeParse({ userId: params.userId });
    if (!userIdValidation.success) {
      return NextResponse.json({ error: 'Invalid User ID format', details: userIdValidation.error.flatten() }, { status: 400 });
    }
    const { userId } = userIdValidation.data;

    // 3. Parse & Validate Request Body
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const updateValidation = UpdateUserSchema.safeParse(body);
    if (!updateValidation.success) {
      return NextResponse.json({ error: 'Invalid input', details: updateValidation.error.flatten() }, { status: 400 });
    }
    const updateData = updateValidation.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    // 4. Update Profile (using Server Client - assumes RLS allows Admins to update profiles)
    // If you need to update auth user details (e.g., email), you'd use the Admin client.
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*, client:clients(id, name)') // Return updated data with client info
      .single();

    // 5. Handle Response & Errors
    if (updateError) {
      // Check if the error is because the user to update was not found
      if (updateError.code === 'PGRST116') { // Row not found during update
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      // Log other database errors
      console.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    // Check if profile data was returned (should be if update succeeded and .single() was used)
    if (!updatedProfile) {
        // This might indicate the update happened but the select failed, or RLS prevented seeing the result.
        console.error('Profile update seemed to succeed but no data was returned.');
        return NextResponse.json({ error: 'Failed to retrieve updated user profile' }, { status: 500 });
    }

    // 6. Return Updated Profile
    return NextResponse.json(updatedProfile);

  } catch (error) {
    console.error(`Unexpected error in PUT /api/admin/users/[userId]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request, 
  { params }: { params: { userId: string } }
) {
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

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not verify user role' }, { status: 500 });
    }

    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Validate Route Parameter
    const validationResult = UserIdSchema.safeParse({ userId: params.userId });
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid User ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { userId } = validationResult.data;

    // Prevent admin from deleting themselves
    if (userId === requestingUser.id) {
        return NextResponse.json({ error: 'Cannot delete own account' }, { status: 400 });
    }

    // 3. Create Admin Client
    const supabaseAdmin = createAdminClient();

    // 4. Delete Profile First (Optional but Recommended for data cleanup)
    // This might fail if there are foreign key constraints, depending on schema design.
    // If the profile must be deleted first, handle the error more strictly.
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      // Log the profile deletion error but proceed to delete the auth user,
      // as the auth user is the primary resource to remove.
      // Depending on DB constraints (e.g., ON DELETE CASCADE), this might not even be necessary.
      console.warn(`Failed to delete profile for user ${userId}: ${deleteProfileError.message}. Proceeding with auth user deletion.`);
      // If profile deletion *must* succeed first, return 500 here.
      // return NextResponse.json({ error: `Failed to delete user profile: ${deleteProfileError.message}` }, { status: 500 });
    }

    // 5. Delete Auth User (Critical Step)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    // 6. Handle Auth Deletion Errors
    if (deleteAuthError) {
      console.error('Auth user deletion error:', deleteAuthError);
      // Check if the user was already deleted or not found
      if (deleteAuthError.message.toLowerCase().includes('not found')) {
          // If profile deletion also failed, log it, but maybe return 404 for the auth user?
          console.warn(`Auth user ${userId} not found, possibly already deleted.`);
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      // For other errors, return 500. State might be inconsistent if profile was deleted.
      return NextResponse.json({ error: deleteAuthError.message || 'Failed to delete user from auth' }, { status: 500 });
    }

    // 7. Return Success Response
    console.log(`Successfully deleted user: ${userId}`);
    return new NextResponse(null, { status: 204 }); // Standard for successful DELETE

  } catch (error) {
    console.error(`Unexpected error in DELETE /api/admin/users/[userId]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 