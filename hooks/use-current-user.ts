"use client"

import { useState, useEffect } from "react"

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

export function useCurrentUser(): CurrentUserResponse {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        // Fetch the user profile data
        const response = await fetch('/api/auth/me')
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }
        
        const data = await response.json()
        
        setUser(data.user || null)
        setRole(data.role || null)
        setProfile(data.profile || null)
      } catch (err) {
        console.error('Error fetching user data:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [])

  return { user, role, profile, isLoading, error }
} 