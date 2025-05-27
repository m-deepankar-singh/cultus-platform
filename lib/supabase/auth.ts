import { createClient } from './server';

/**
 * Gets the authenticated user from the server
 * @returns The authenticated user or null if not authenticated
 */
export async function getUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Gets the authenticated user and their profile data including role
 * @returns Object containing user and profile data or null if not authenticated
 */
export async function getUserWithProfile() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }
    
    // Get user profile including role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, client_id')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return { user, profile: null };
    }
    
    return {
      user,
      profile: {
        role: profile?.role,
        fullName: profile?.full_name,
        clientId: profile?.client_id
      }
    };
  } catch (error) {
    console.error('Error getting user with profile:', error);
    return null;
  }
} 