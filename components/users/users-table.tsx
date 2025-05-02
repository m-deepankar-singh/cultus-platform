import { MoreHorizontal, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { User } from "@supabase/supabase-js"
import { UserActionsCell } from "./user-actions-cell"

interface Profile {
  id: string
  full_name: string | null
  role: "Admin" | "Staff" | "Viewer" | "Client Staff"
  client_id: string | null
  status?: string
}

interface Client {
  id: string
  name: string
}

// Don't extend User directly to avoid type conflicts
interface UserProfile {
  id: string
  email?: string
  last_sign_in_at?: string
  created_at?: string
  updated_at?: string
  profile: Profile | null
  client_name?: string
  banned_until?: string
  user_metadata?: {
    status?: string
    [key: string]: any
  }
  app_metadata?: {
    status?: string
    [key: string]: any
  }
}

interface UsersTableProps {
  clients: Client[]
}

// Add a utility function to check user status
function isUserActive(user: UserProfile): boolean {
  // Check if user is banned
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return false;
  }
  
  // Check metadata status
  if (user.user_metadata?.status === 'inactive' || user.app_metadata?.status === 'inactive') {
    return false;
  }
  
  // Check profile status if exists
  if (user.profile?.status === 'inactive') {
    return false;
  }
  
  return true;
}

export async function UsersTable({ clients }: UsersTableProps) {
  const supabaseAdmin = createAdminClient()
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

  if (usersError) {
    console.error("Error fetching users (Admin):", usersError)
    return <div>Error loading users.</div>
  }

  const profilePromise = supabaseAdmin.from("profiles").select("id, full_name, role, client_id")
  const clientPromise = supabaseAdmin.from("clients").select("id, name")

  const [{ data: profiles, error: profilesError }, { data: clientsData, error: clientsError }] =
    await Promise.all([profilePromise, clientPromise])

  if (profilesError || clientsError) {
    console.error("Error fetching profiles or clients (Admin):", profilesError || clientsError)
  }

  const profileMap = new Map(profiles?.map((p: Profile) => [p.id, p]))
  const clientMap = new Map(clientsData?.map((c: Client) => [c.id, c]))

  const combinedUsers: UserProfile[] = usersData.users.map((user: User) => {
    const profile = profileMap.get(user.id)
    const clientName = profile?.client_id ? clientMap.get(profile.client_id)?.name : undefined
    return {
      ...user,
      profile: profile || null,
      client_name: clientName,
    }
  })

  return (
    <Card>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combinedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              combinedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.profile?.full_name?.charAt(0) ||
                            user.email?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.profile?.full_name || "(No Name)"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.profile?.role ? (
                      <Badge
                        variant={
                          user.profile.role === "Admin"
                            ? "outline"
                            : user.profile.role === "Staff"
                              ? "info"
                              : user.profile.role === "Viewer"
                                ? "outline"
                                : "warning"
                        }
                        className={
                          user.profile.role === "Admin"
                            ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/50 dark:text-purple-300"
                            : user.profile.role === "Staff"
                              ? ""
                              : user.profile.role === "Viewer"
                                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800/50 dark:bg-green-950/50 dark:text-green-300"
                                : ""
                        }
                      >
                        {user.profile.role}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isUserActive(user) ? "success" : "destructive"}>
                      {isUserActive(user) ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.client_name || "-"}</TableCell>
                  <TableCell>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <UserActionsCell user={user} clients={clients} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
