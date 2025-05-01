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
    const supabaseAdmin = createAdminClient();
    
    // First try to find in profiles table
    const { data: userProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*, client:clients(id, name)') // Select all profile fields and client info
      .eq('id', userId)
      .single();

    // If found in profiles, return it
    if (!fetchError && userProfile) {
      return NextResponse.json(userProfile);
    }
    
    // If not found in profiles, check students table
    const { data: studentProfile, error: studentFetchError } = await supabaseAdmin
      .from('students')
      .select('*, client:clients(id, name)') // Adjust join based on your schema
      .eq('id', userId)
      .single();

    // 4. Handle Response & Errors
    if (fetchError && studentFetchError) {
      // Both lookups failed, check if not found errors
      if (fetchError.code === 'PGRST116' && studentFetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      // Otherwise, it's likely a server error
      console.error('Error fetching profile:', fetchError);
      console.error('Error fetching student:', studentFetchError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }
    
    // If student profile found, return it
    if (studentProfile) {
      return NextResponse.json(studentProfile);
    }
    
    // This case might be redundant due to error handling above, but included for safety.
        return NextResponse.json({ error: 'User not found' }, { status: 404 });

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

    // 4. Update Profile or Student
    const supabaseAdmin = createAdminClient();
    
    // First check if user exists in profiles table
    const { data: userExists, error: userCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // Then check if user exists in students table
    const { data: studentExists, error: studentCheckError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // Determine which table to update
    let tableName = null;
    if (userExists) {
      tableName = 'profiles';
    } else if (studentExists) {
      tableName = 'students';
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update the appropriate table
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from(tableName)
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
    if (!updatedData) {
        // This might indicate the update happened but the select failed, or RLS prevented seeing the result.
        console.error('Profile update seemed to succeed but no data was returned.');
        return NextResponse.json({ error: 'Failed to retrieve updated user profile' }, { status: 500 });
    }

    // 6. Return Updated Profile
    return NextResponse.json(updatedData);

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

    // Check if user exists in profiles table
    const { data: userExists, error: userCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // Check if user exists in students table
    const { data: studentExists, error: studentCheckError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // If neither exists, return 404
    if (!userExists && !studentExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 4. Delete from appropriate table
    let deleteError = null;
    
    if (userExists) {
      const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

      if (error) {
        deleteError = error;
        console.warn(`Failed to delete profile for user ${userId}: ${error.message}`);
      }
    }
    
    if (studentExists) {
      const { error } = await supabaseAdmin
        .from('students')
        .delete()
        .eq('id', userId);
      
      if (error) {
        deleteError = error;
        console.warn(`Failed to delete student for user ${userId}: ${error.message}`);
      }
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