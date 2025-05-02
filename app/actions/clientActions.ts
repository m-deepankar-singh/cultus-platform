"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
}

export interface UpdateClientParams {
  name?: string
  contact_email?: string | null
  address?: string | null
  is_active?: boolean
}

/**
 * Create a new client
 */
export async function createClient(data: CreateClientParams): Promise<Client> {
  const supabase = await createSupabaseClient()
  
  const { data: client, error } = await supabase
    .from("clients")
    .insert([{
      name: data.name,
      contact_email: data.contact_email || null,
      address: data.address || null,
      is_active: true
    }])
    .select("*")
    .single()
  
  if (error) {
    console.error("Error creating client:", error)
    throw new Error(`Failed to create client: ${error.message}`)
  }
  
  revalidatePath("/clients")
  return client
}

/**
 * Update an existing client
 */
export async function updateClient(id: string, data: UpdateClientParams): Promise<Client> {
  const supabase = await createSupabaseClient()
  
  const { data: client, error } = await supabase
    .from("clients")
    .update({
      name: data.name,
      contact_email: data.contact_email,
      address: data.address,
      is_active: data.is_active !== undefined ? data.is_active : undefined,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single()
  
  if (error) {
    console.error("Error updating client:", error)
    throw new Error(`Failed to update client: ${error.message}`)
  }
  
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