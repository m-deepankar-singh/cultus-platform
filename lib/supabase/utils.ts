import { createClient } from './server'; // Adjust path if needed
import { User, Session } from '@supabase/supabase-js';

// Type definition for the session response
interface SessionResponse {
  session: Session | null;
  user: User | null;
}

// Type definition for profile data (adjust properties based on your profiles table)
interface ProfileData {
  id: string;
  updated_at: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  client_id: string | null;
  is_active: boolean;
  // Add other profile fields as needed
}

// Type definition for student data (adjust properties based on your students table)
interface StudentData {
  id: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  star_rating: number | null;
  last_login_at: string | null;
  is_active: boolean;
  // Add other student fields as needed
}

// Interface for the combined user, profile, and role data
interface UserSessionRoleResponse {
  user: User | null;
  profile: ProfileData | null;
  role: string | null;
  error: Error | null;
}

/**
 * Fetches the current user session from the server-side Supabase client.
 * @deprecated Prefer getUserSessionAndRole for combined user, profile, and role data.
 * @returns {Promise<SessionResponse>} An object containing the session and user, or null if no session exists.
 */
export async function getUserSession(): Promise<SessionResponse> {
  try {
    const supabase = await createClient();
    // Note: getSession() might return session based on potentially expired cookie.
    // Prefer getUser() in server-side contexts for security.
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error fetching user session:', error.message);
      return { session: null, user: null };
    }

    return { session: data.session, user: data.session?.user ?? null };
  } catch (err) {
    console.error('Unexpected error in getUserSession:', err);
    return { session: null, user: null };
  }
}

/**
 * Fetches profile data for a given user ID (Admin Panel users).
 * @param {string} userId - The ID of the user whose profile data is needed.
 * @returns {Promise<ProfileData | null>} The profile data or null if not found or an error occurs.
 */
export async function getProfileData(userId: string): Promise<ProfileData | null> {
  if (!userId) return null;

  try {
    const supabase = await createClient(); // Uses server client
    const { data, error } = await supabase
      .from('profiles')
      .select('*') // Select all columns, adjust as needed
      .eq('id', userId)
      .single();

    if (error) {
      // Don't log error if it's just "No rows found" (PGRST116), common case
      if (error.code !== 'PGRST116') {
          console.error(`Error fetching profile data for user ${userId}:`, error.message);
      }
      return null;
    }

    return data as ProfileData;
  } catch (err) {
      console.error(`Unexpected error fetching profile data for user ${userId}:`, err);
      return null;
  }
}

/**
 * Fetches student data for a given user ID (Main App users).
 * @param {string} userId - The ID of the user whose student data is needed.
 * @returns {Promise<StudentData | null>} The student data or null if not found or an error occurs.
 */
export async function getStudentData(userId: string): Promise<StudentData | null> {
  if (!userId) return null;

  try {
    const supabase = await createClient(); // Uses server client
    const { data, error } = await supabase
      .from('students')
      .select('*') // Select all columns, adjust as needed
      .eq('id', userId)
      .single();

    if (error) {
      // Don't log error if it's just "No rows found"
      if (error.code !== 'PGRST116') {
          console.error(`Error fetching student data for user ${userId}:`, error.message);
      }
      return null;
    }

    return data as StudentData;
  } catch (err) {
      console.error(`Unexpected error fetching student data for user ${userId}:`, err);
      return null;
  }
}

/**
 * Fetches the current user session and associated profile data (including role)
 * securely from server-side context using `getUser()`.
 * 
 * @returns {Promise<UserSessionRoleResponse>} An object containing user, profile, role, or an error.
 */
export async function getUserSessionAndRole(): Promise<UserSessionRoleResponse> {
  try {
    const supabase = await createClient(); // Use server client
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      // Don't log generic auth errors unless debugging, middleware handles session presence
      // console.error('Auth error fetching user:', userError.message);
      return { user: null, profile: null, role: null, error: userError };
    }

    if (!user) {
      // No active session found
      return { user: null, profile: null, role: null, error: new Error('No active user session.') };
    }

    // User is authenticated, now fetch their profile
    const profile = await getProfileData(user.id);

    if (!profile) {
      console.error(`Profile not found for authenticated user ${user.id}`);
      // Decide how to handle this case: maybe user exists but profile wasn't created?
      // Returning user but null role/profile might be appropriate depending on app logic.
      return { user: user, profile: null, role: null, error: new Error('User profile not found.') };
    }

    // Success: return user, profile, and extracted role
    return { user, profile, role: profile.role, error: null };

  } catch (err: any) {
    console.error('Unexpected error in getUserSessionAndRole:', err);
    return { user: null, profile: null, role: null, error: err instanceof Error ? err : new Error('An unexpected error occurred') };
  }
}