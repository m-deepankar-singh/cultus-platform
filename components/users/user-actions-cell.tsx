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
import { useToggleUserStatus } from '@/hooks/api/use-users'
import { toast } from '@/components/ui/use-toast'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Types (should ideally be shared)
interface Client { id: string; name: string; }
interface UserProfile {
    id: string;
    email?: string;
    // Fields directly on user object now (no nested profile)
    full_name?: string | null;
    role?: string;
    client_id?: string | null;
    client?: {
        id: string;
        name: string;
    };
    banned_until?: string | null;
    status?: string;
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
    onUserUpdated?: () => void;
}

export function UserActionsCell({ user, clients, onUserUpdated }: UserActionsCellProps) {
    const { currentUser } = useCurrentUser();
    const toggleUserStatusMutation = useToggleUserStatus();
    
    // Check if user is active based on banned_until, status field or metadata
    const isUserActive = (): boolean => {
        // Check if user is banned
        if (user.banned_until && new Date(user.banned_until) > new Date()) {
            return false;
        }
        
        // Check explicit status field from profile
        if (user.status === 'inactive') {
            return false;
        }
        
        // Check metadata status
        if (user.user_metadata?.status === 'inactive' || user.app_metadata?.status === 'inactive') {
            return false;
        }
        
        return true;
    };

    // Check if current user is a Staff member
    const isStaffUser = currentUser?.role === 'Staff';
    
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
            await toggleUserStatusMutation.mutateAsync({ 
                userId: user.id, 
                isActive: !isUserActive() 
            });
            
            // Trigger refresh of user data if provided
            if (onUserUpdated) {
                onUserUpdated();
            }
        } catch (error) {
            // Error handling is done in the mutation hook with toast
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={toggleUserStatusMutation.isPending}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">User Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {canEditUsers ? (
                    <EditUserDialog user={user} clients={clients} onUserUpdated={onUserUpdated}>
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
                        className={isUserActive() ? "text-destructive" : "text-green-600"}
                        disabled={toggleUserStatusMutation.isPending}
                    >
                        {isUserActive() ? 'Deactivate User' : 'Activate User'}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 