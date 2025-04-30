export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      client_product_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          product_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          product_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_product_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_product_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          configuration: Json | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          product_id: string
          sequence: number
          type: string
          updated_at: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          product_id: string
          sequence?: number
          type: string
          updated_at?: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          product_id?: string
          sequence?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone_number: string | null
          star_rating: number | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone_number?: string | null
          star_rating?: number | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone_number?: string | null
          star_rating?: number | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_id_for_user: {
        Args: {
          p_user_id: string
        }
        Returns: string
      }
      get_user_role: {
        Args: {
          p_user_id: string
        }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_access_to_client: {
        Args: {
          p_user_id: string
          p_client_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "Admin" | "Staff" | "Student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type Functions<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]

// Helper types for insert and update operations
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]

// -- The following is generated by `supabase gen types typescript` but often needs adjustments --
// -- The generic types above are generally more useful and type-safe than the default exports --

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = any // Add PostgrestError type if available

export type DbResultOkSpecific<T, K extends keyof PublicSchema['Tables']> = T extends PromiseLike<{ data: infer U }>
    ? PublicSchema['Tables'][K]['Row'][] // Assuming the result is always an array for selects
    : never;


// Export aliases for convenience (optional)
export type Client = Tables<'clients'>
export type ClientInsert = TablesInsert<'clients'>
export type ClientUpdate = TablesUpdate<'clients'>
export type Product = Tables<'products'>
export type ProductInsert = TablesInsert<'products'>
export type ProductUpdate = TablesUpdate<'products'>
export type Module = Tables<'modules'>
export type ModuleInsert = TablesInsert<'modules'>
export type ModuleUpdate = TablesUpdate<'modules'>
export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type Student = Tables<'students'>
export type StudentInsert = TablesInsert<'students'>
export type StudentUpdate = TablesUpdate<'students'>
export type ClientProductAssignment = Tables<'client_product_assignments'>
export type ClientProductAssignmentInsert = TablesInsert<'client_product_assignments'>
export type ClientProductAssignmentUpdate = TablesUpdate<'client_product_assignments'>

export type UserRole = Enums<'user_role'>
