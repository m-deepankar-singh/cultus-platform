"use client"

import { useAuth } from "@/providers/auth-provider"

interface User {
  id: string
  email: string
}

interface Profile {
  fullName: string | null
  backgroundType?: string | null
  tier?: string | null
  starLevel?: number | null
  clientId?: string | null
  isActive?: boolean
}

interface CurrentUserResponse {
  user: User | null
  role: string | null
  profile: Profile | null
  isLoading: boolean
  error: Error | null
}

/**
 * @deprecated Use useAuth() from @/providers/auth-provider instead
 * This hook is maintained for backward compatibility
 */
export function useCurrentUser(): CurrentUserResponse {
  const { user: authUser, profile: authProfile, isLoading } = useAuth()
  
  // Transform auth data to match legacy interface
  const user = authUser ? {
    id: authUser.id,
    email: authUser.email || ''
  } : null
  
  const profile = authProfile ? {
    fullName: null, // This field isn't available in the new auth system
    backgroundType: null,
    tier: authProfile.job_readiness_tier?.toLowerCase() || null,
    starLevel: authProfile.job_readiness_star_level || null,
    clientId: authProfile.client_id || null,
    isActive: authProfile.is_active
  } : null
  
  const role = authProfile?.role || null
  
  return { 
    user, 
    role, 
    profile, 
    isLoading, 
    error: null // The new auth system handles errors differently
  }
} 