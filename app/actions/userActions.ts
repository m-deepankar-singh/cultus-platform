'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin' // Use admin client for user creation
import { createClient } from '@/lib/supabase/server'; // Use server client for profile creation
import { revalidatePath } from 'next/cache'

// Define the base schema without refinement first
const BaseUserSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["Admin", "Staff", "Viewer", "Client Staff"], {
        required_error: "Role is required",
    }),
    clientId: z.string().optional(),
});

// Add refinement for client ID requirement
const UserFormSchema = BaseUserSchema.refine((data) => {
    if (data.role === 'Client Staff' && !data.clientId) {
        return false;
    }
    return true;
}, {
    message: "Client selection is required for Client Staff role",
    path: ['clientId'],
});

// Define the update schema by omitting password from the BASE schema
// and extending with userId, then applying the refinement
const UserUpdateSchema = BaseUserSchema.omit({ password: true })
    .extend({
        userId: z.string().min(1, "User ID is required for update"),
    })
    .refine((data) => { // Re-apply refinement for client ID
        if (data.role === 'Client Staff' && !data.clientId) {
            return false;
        }
        return true;
    }, {
        message: "Client selection is required for Client Staff role",
        path: ['clientId'],
    });

// Define the shape of the state object returned by the action
export type UserFormState = {
    message: string | null;
    errors?: {
        fullName?: string[];
        email?: string[];
        password?: string[];
        role?: string[];
        clientId?: string[];
        _form?: string[]; // General form errors
    };
};

export async function createUser(
    prevState: UserFormState,
    formData: FormData
): Promise<UserFormState> {
    // 1. Validate form data
    const validatedFields = UserFormSchema.safeParse({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        clientId: formData.get('clientId') || undefined, // Handle empty string from form
    });

    if (!validatedFields.success) {
        console.log("Validation Errors:", validatedFields.error.flatten().fieldErrors);
        return {
            message: "Validation failed. Please check the fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { email, password, role, fullName, clientId } = validatedFields.data;

    // 2. Create user using Supabase Admin Client
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email for simplicity, adjust as needed
        // You might want user_metadata for role if not using profiles table solely for role
        // user_metadata: { role: role } 
    });

    if (authError) {
        console.error("Supabase Auth Error (Create User):", authError);
        return {
            message: null,
            errors: { _form: [authError.message || "Failed to create user authentication."] },
        };
    }

    if (!authData.user) {
        return {
            message: null,
            errors: { _form: ["User authentication created, but user data is missing."] },
        };
    }

    // 3. Create corresponding profile using Supabase Admin Client to bypass RLS
    // const supabaseServer = await createClient(); // No longer needed for this insert
    const { error: profileError } = await supabaseAdmin // Use supabaseAdmin here
        .from('profiles')
        .insert({
            id: authData.user.id, // Link profile to the auth user
            full_name: fullName,
            role: role,
            client_id: role === 'Client Staff' ? clientId : null,
            // Add other default profile fields if necessary
        });

    if (profileError) {
        console.error("Supabase DB Error (Create Profile):", profileError);
        // Attempt to clean up the auth user if profile creation fails?
        // await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return {
            message: null,
            errors: { _form: [profileError.message || "User created, but failed to create profile."] },
        };
    }

    // 4. Revalidate the users page cache and return success
    revalidatePath('/admin/users'); // Adjust path if necessary
    return { message: "User created successfully!", errors: {} };

}

// Action to UPDATE user profile data
export async function updateUser(
    prevState: UserFormState,
    formData: FormData
): Promise<UserFormState> {
    // 1. Validate form data (using the update schema)
    const validatedFields = UserUpdateSchema.safeParse({
        userId: formData.get('userId'), // Get userId from hidden input
        fullName: formData.get('fullName'),
        email: formData.get('email'), // Keep email for context, but don't update auth email here
        role: formData.get('role'),
        clientId: formData.get('clientId') || undefined,
    });

    if (!validatedFields.success) {
        console.log("Update Validation Errors:", validatedFields.error.flatten().fieldErrors);
        return {
            message: "Validation failed. Please check the fields.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { userId, role, fullName, clientId } = validatedFields.data;

    // 2. Update profile data using Supabase Admin Client (bypasses RLS)
    // Note: We are NOT updating the auth user email/password here.
    // That requires different Supabase methods and careful consideration.
    const supabaseAdmin = createAdminClient();
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: fullName,
            role: role,
            client_id: role === 'Client Staff' ? clientId : null,
            // updated_at will likely be handled by the database trigger
        })
        .eq('id', userId); // Target the specific user profile

    if (profileError) {
        console.error("Supabase DB Error (Update Profile):", profileError);
        return {
            message: null,
            errors: { _form: [profileError.message || "Failed to update user profile."] },
        };
    }

    // 3. Revalidate the users page cache and return success
    revalidatePath('/admin/users'); // Adjust path if necessary
    return { message: "User updated successfully!", errors: {} };
}

// Toggle User Status (Active/Inactive)
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    try {
        const supabaseAdmin = createAdminClient();
        
        // Update user in auth.users
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { 
                user_metadata: { status: isActive ? 'active' : 'inactive' },
                app_metadata: { status: isActive ? 'active' : 'inactive' },
                // Ban user if deactivating, remove ban if activating
                // 100 years ≈ 876000 hours
                ban_duration: isActive ? 'none' : '876000h', 
            }
        );
        
        if (authError) {
            console.error("Error updating user auth status:", authError);
            return { 
                success: false, 
                message: `Failed to update user status: ${authError.message}` 
            };
        }
        
        // Update profile status (if you have a status field in profiles)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ 
                status: isActive ? 'active' : 'inactive',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
        if (profileError) {
            console.error("Error updating profile status:", profileError);
            // We succeeded with auth update but failed with profile update
            return { 
                success: true, 
                message: `User ${isActive ? 'activated' : 'deactivated'} but failed to update profile: ${profileError.message}` 
            };
        }

        // Invalidate users page cache
        revalidatePath('/admin/users');
        
        return { 
            success: true, 
            message: `User successfully ${isActive ? 'activated' : 'deactivated'}.` 
        };
    } catch (error) {
        console.error("Unexpected error toggling user status:", error);
        return { 
            success: false, 
            message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
        };
    }
} 