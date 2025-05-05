'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
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

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createClient()
    
    async function getUser() {
      try {
        setLoading(true)
        
        // Get the current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('Error fetching current user:', userError)
          setCurrentUser(null)
          return
        }
        
        // Fetch the user's profile to get their role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role, client_id, status')
          .eq('id', user.id)
          .single()
          
        if (profileError) {
          console.error('Error fetching user profile:', profileError)
        }
        
        // Combine the user and profile data
        const userWithProfile: CurrentUser = {
          ...user,
          profile: profile || null
        }
        
        setCurrentUser(userWithProfile)
      } catch (error) {
        console.error('Unexpected error in useCurrentUser:', error)
        setCurrentUser(null)
      } finally {
        setLoading(false)
      }
    }
    
    // Initial fetch
    getUser()
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser()
      } else {
        setCurrentUser(null)
      }
    })
    
    // Cleanup subscription
    return () => {
      subscription?.unsubscribe()
    }
  }, [])
  
  return { currentUser, loading }
} 