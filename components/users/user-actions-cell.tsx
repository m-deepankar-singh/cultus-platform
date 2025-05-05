'use client'

import * as React from 'react'
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { EditUserDialog } from './edit-user-dialog'
import { toggleUserStatus } from '@/app/actions/userActions'
import { toast } from '@/components/ui/use-toast'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Types (should ideally be shared)
interface Client { id: string; name: string; }
interface UserProfile {
    id: string;
    email?: string;
    profile: {
        full_name: string | null;
        role: "Admin" | "Staff" | "Viewer" | "Client Staff";
        client_id: string | null;
        status?: string;
    } | null;
    client_name?: string;
    banned_until?: string | null;
    user_metadata?: {
        status?: string;
    };
    app_metadata?: {
        status?: string;
    };
}

interface UserActionsCellProps {
    user: UserProfile;
    clients: Client[];
}

export function UserActionsCell({ user, clients }: UserActionsCellProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const { currentUser } = useCurrentUser();
    
    // Check if user is active based on banned_until or metadata
    const isUserActive = 
        !user.banned_until || 
        new Date(user.banned_until) <= new Date() ||
        user.user_metadata?.status === 'active' ||
        user.app_metadata?.status === 'active';

    // Check if current user is a Staff member
    const isStaffUser = currentUser?.profile?.role === 'Staff';
    
    // Staff users should not be able to edit or deactivate users
    const canEditUsers = !isStaffUser;
    const canDeactivateUsers = !isStaffUser;

    const handleToggleStatus = async () => {
        if (!canDeactivateUsers) {
            toast({
                variant: 'destructive',
                title: 'Permission Denied',
                description: 'Staff users cannot deactivate accounts'
            });
            return;
        }
        
        try {
            setIsLoading(true);
            const result = await toggleUserStatus(user.id, !isUserActive);
            
            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Failed to ${isUserActive ? 'deactivate' : 'activate'} user: ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isLoading}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">User Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {canEditUsers ? (
                    <EditUserDialog user={user} clients={clients}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Edit Profile
                        </DropdownMenuItem>
                    </EditUserDialog>
                ) : (
                    <DropdownMenuItem disabled className="text-muted-foreground cursor-not-allowed">
                        View Only Mode
                    </DropdownMenuItem>
                )}
                {canEditUsers && <DropdownMenuSeparator />}
                {canDeactivateUsers && (
                    <DropdownMenuItem 
                        onClick={handleToggleStatus} 
                        className={isUserActive ? "text-destructive" : "text-green-600"}
                        disabled={isLoading}
                    >
                        {isUserActive ? 'Deactivate User' : 'Activate User'}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 