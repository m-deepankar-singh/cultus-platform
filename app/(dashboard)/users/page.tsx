import type { Metadata } from "next"
import { UsersTable } from "@/components/users/users-table"
import { UsersHeader } from "@/components/users/users-header"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Users - Upskilling Platform",
  description: "Manage users in the upskilling platform",
}

// Fetch clients from the database
async function getClients() {
  const supabase = await createClient();
  
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true });
    
  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
  
  return clients || [];
}

// Fetch current user role
async function getCurrentUserRole() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return undefined;
  
  // Get user's role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  return profile?.role;
}

export default async function UsersPage() {
  const [clients, currentUserRole] = await Promise.all([
    getClients(),
    getCurrentUserRole()
  ]);

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 bg-background">
      <UsersHeader clients={clients} />
      <UsersTable 
        clients={clients} 
        initialCurrentUserRole={currentUserRole}
      />
    </div>
  )
}
