'use client'

import { useAuth } from '@/providers/auth-provider'
import { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  full_name: string | null
  role: "Admin" | "Staff" | "Viewer" | "Client Staff"
  client_id: string | null
  status?: string
}

interface CurrentUser extends User {
  profile?: Profile | null
}

/**
 * @deprecated Use useAuth() from @/providers/auth-provider instead
 * This hook is maintained for backward compatibility
 */
export function useCurrentUser() {
  const { user, profile: authProfile, isLoading } = useAuth()
  
  // Transform auth data to match legacy interface
  const currentUser: CurrentUser | null = user ? {
    ...user,
    profile: authProfile ? {
      id: authProfile.id,
      full_name: null, // This field isn't available in the new system
      role: authProfile.role as "Admin" | "Staff" | "Viewer" | "Client Staff",
      client_id: authProfile.client_id,
      status: authProfile.is_active ? 'active' : 'inactive'
    } : null
  } : null
  
  return { 
    currentUser, 
    loading: isLoading 
  }
} 