import { NextResponse } from 'next/server';
import { UserIdSchema, UpdateUserSchema } from '@/lib/schemas/user'; // Adjust path
import { authenticateApiRequest } from '@/lib/auth/api-auth';

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { supabase } = authResult;

    // Validate Route Parameter
    const resolvedParams = await params;
    const validationResult = UserIdSchema.safeParse({ userId: resolvedParams.userId });
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid User ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { userId } = validationResult.data;

    // Fetch User Profile
    // First try to find in profiles table
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*, client:clients(id, name)') // Select all profile fields and client info
      .eq('id', userId)
      .single();

    // If found in profiles, return it
    if (!fetchError && userProfile) {
      return NextResponse.json(userProfile);
    }
    
    // If not found in profiles, check students table
    const { data: studentProfile, error: studentFetchError } = await supabase
      .from('students')
      .select('*, client:clients(id, name)') // Adjust join based on your schema
      .eq('id', userId)
      .single();

    // Handle Response & Errors
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
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { supabase } = authResult;

    // Validate Route Parameter
    const resolvedParams = await params;
    const userIdValidation = UserIdSchema.safeParse({ userId: resolvedParams.userId });
    if (!userIdValidation.success) {
      return NextResponse.json({ error: 'Invalid User ID format', details: userIdValidation.error.flatten() }, { status: 400 });
    }
    const { userId } = userIdValidation.data;

    // Parse & Validate Request Body
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

    // Update Profile or Student
    // First check if user exists in profiles table
    const { data: userExists, error: userCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // Then check if user exists in students table
    const { data: studentExists, error: studentCheckError } = await supabase
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
    const { data: updatedData, error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', userId)
      .select('*, client:clients(id, name)') // Return updated data with client info
      .single();

    // Handle Response & Errors
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

    // Return Updated Profile
    return NextResponse.json(updatedData);

  } catch (error) {
    console.error(`Unexpected error in PUT /api/admin/users/[userId]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 🚀 OPTIMIZED: JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { supabase } = authResult;

    // Validate Route Parameter
    const resolvedParams = await params;
    const validationResult = UserIdSchema.safeParse({ userId: resolvedParams.userId });
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid User ID format', details: validationResult.error.flatten() }, { status: 400 });
    }
    const { userId } = validationResult.data;

    // First check if user exists in profiles table
    const { data: userExists, error: userCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    // Then check if user exists in students table
    const { data: studentExists, error: studentCheckError } = await supabase
      .from('students')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (!userExists && !studentExists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Perform deletion on the appropriate table
    if (userExists) {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) {
            console.error('Error deleting profile:', error);
            return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 });
        }
    }
    
    if (studentExists) {
        const { error } = await supabase.from('students').delete().eq('id', userId);
        if (error) {
            console.error('Error deleting student:', error);
            return NextResponse.json({ error: 'Failed to delete student profile' }, { status: 500 });
        }
    }

    // After deleting from profile/student table, delete the auth user
    // Note: Deleting the auth user requires admin privileges.
    // This part will fail if the logged-in user does not have `supabase_admin` role.
    const { error: authUserError } = await supabase.auth.admin.deleteUser(userId);

    if (authUserError) {
        // Log the error but maybe don't fail the request if profile was deleted.
        // This can happen if the user was already deleted from auth but not from profiles.
        console.warn(`Could not delete auth user ${userId}:`, authUserError.message);
    }
    
    return NextResponse.json({ message: 'User successfully deleted' });

  } catch (error) {
    console.error(`Unexpected error in DELETE /api/admin/users/[userId]:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 