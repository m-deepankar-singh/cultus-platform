"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
// File deletion functionality temporarily removed during S3 migration

// Types matching the API response
export interface Client {
  id: string
  created_at: string
  updated_at: string
  name: string
  contact_email: string | null
  address: string | null
  logo_url: string | null
  is_active: boolean
}

export interface CreateClientParams {
  name: string
  contact_email?: string | null
  address?: string | null
  logo_url?: string | null
}

export interface UpdateClientParams {
  name?: string
  contact_email?: string | null
  address?: string | null
  is_active?: boolean
  logo_url?: string | null
}

/**
 * Create a new client
 */
export async function createClient(data: CreateClientParams): Promise<Client> {
  const supabase = await createSupabaseClient()
  
  console.log('Creating client with data:', {
    ...data,
    logo_url: data.logo_url ? 'URL exists' : 'No URL'
  })
  
  const { data: client, error } = await supabase
    .from("clients")
    .insert([{
      name: data.name,
      contact_email: data.contact_email || null,
      address: data.address || null,
      logo_url: data.logo_url || null,
      is_active: true
    }])
    .select("*")
    .single()
  
  if (error) {
    console.error("Error creating client:", error)
    throw new Error(`Failed to create client: ${error.message}`)
  }
  
  console.log('Client created successfully:', {
    id: client.id,
    name: client.name,
    logo_url: client.logo_url ? 'URL saved' : 'No URL saved'
  })
  
  revalidatePath("/clients")
  return client
}

/**
 * Update an existing client
 */
export async function updateClient(id: string, data: UpdateClientParams): Promise<Client> {
  const supabase = await createSupabaseClient()
  
  console.log('Updating client with data:', {
    id,
    ...data,
    logo_url: data.logo_url ? 'URL exists' : 'No URL'
  })
  
  // If we're updating the logo and there's an existing one, we should check
  // if we need to remove the old logo first
  if (data.logo_url !== undefined) {
    const { data: existingClient } = await supabase
    .from("clients")
      .select("logo_url")
      .eq("id", id)
      .single()
    
    console.log('Existing client logo_url:', existingClient?.logo_url || 'none')
    
    // Note: File deletion temporarily disabled during S3 migration
    // TODO: Implement S3 file deletion in Phase 7 cleanup
    if (existingClient?.logo_url && existingClient.logo_url !== data.logo_url) {
      console.log("Old logo file exists but deletion temporarily disabled during S3 migration:", existingClient.logo_url)
    }
  }
  
  const updateData = {
      name: data.name,
      contact_email: data.contact_email,
      address: data.address,
    logo_url: data.logo_url,
      is_active: data.is_active !== undefined ? data.is_active : undefined,
      updated_at: new Date().toISOString()
  }
  
  console.log('Update data being sent to database:', {
    ...updateData,
    logo_url: updateData.logo_url ? 'URL exists' : 'No URL'
    })
  
  const { data: client, error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single()
  
  if (error) {
    console.error("Error updating client:", error)
    throw new Error(`Failed to update client: ${error.message}`)
  }
  
  console.log('Client updated successfully:', {
    id: client.id,
    name: client.name,
    logo_url: client.logo_url ? 'URL saved' : 'No URL saved'
  })
  
  revalidatePath("/clients")
  return client
}

/**
 * Activate or deactivate a client
 */
export async function toggleClientStatus(id: string, isActive: boolean): Promise<void> {
  const supabase = await createSupabaseClient()
  
  const { error } = await supabase
    .from("clients")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
  
  if (error) {
    console.error("Error toggling client status:", error)
    throw new Error(`Failed to update client status: ${error.message}`)
  }
  
  revalidatePath("/clients")
}

/**
 * Get all clients
 */
export async function getClients(): Promise<Client[]> {
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name")
  
  if (error) {
    console.error("Error fetching clients:", error)
    throw new Error(`Failed to fetch clients: ${error.message}`)
  }
  
  return data || []
}

/**
 * Get a single client by ID
 */
export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) {
    if (error.code === "PGRST116") {
      // PGRST116 is the error code for "no rows returned"
      return null
    }
    console.error("Error fetching client:", error)
    throw new Error(`Failed to fetch client: ${error.message}`)
  }
  
  return data
} 