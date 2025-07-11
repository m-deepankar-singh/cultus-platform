// Client API functions for admin interface

export interface Client {
  id: string
  name: string
  contact_email?: string
  is_active: boolean
  created_at: string
  logo_url?: string
}

export interface ClientsResponse {
  data: Client[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

class ClientApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "ClientApiError"
  }
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `API Error: ${response.status} ${response.statusText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // If it's not JSON, use the text as is
      errorMessage = errorText || errorMessage
    }
    
    throw new ClientApiError(errorMessage, response.status)
  }
  
  return response.json()
}

// Get all clients (simplified for dropdown use)
export async function getClients(): Promise<Client[]> {
  try {
    const response = await fetch('/api/admin/clients/simple', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      // Fallback to main API if simple endpoint doesn't exist
      const fallbackResponse = await fetch('/api/admin/clients?pageSize=1000', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const fallbackData = await handleApiResponse<ClientsResponse>(fallbackResponse)
      return fallbackData.data || []
    }
    
    const data = await handleApiResponse<Client[]>(response)
    return data || []
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    throw error
  }
}

export { ClientApiError }