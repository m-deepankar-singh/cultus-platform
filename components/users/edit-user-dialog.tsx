'use client'

import * as React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { UserForm } from './user-form'
import { useUpdateUser } from '@/hooks/api/use-users'
import type { UpdateUserData } from '@/hooks/api/use-users'

// Types (should ideally be shared)
interface Client { id: string; name: string; }
interface UserProfile {
    id: string;
    email?: string;
    // Updated to match the new structure from paginated API
    full_name?: string | null;
    role?: string;
    client_id?: string | null;
    client?: {
        id: string;
        name: string;
    };
}

interface EditUserDialogProps {
    user: UserProfile;
    clients: Client[];
    children: React.ReactNode; // To use as the trigger
    onUserUpdated?: () => void; // Callback when user is updated
}

export function EditUserDialog({ user, clients, children, onUserUpdated }: EditUserDialogProps) {
    const [open, setOpen] = React.useState(false);

    const handleFormSubmit = () => {
        setOpen(false); // Close dialog on successful submit
        // Call the callback if provided
        if (onUserUpdated) {
            onUserUpdated();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* Use the passed children as the trigger */}
            <DialogTrigger asChild>{children}</DialogTrigger> 
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit User: {user.full_name || user.email}</DialogTitle>
                    <DialogDescription>
                        Update the user's profile details below.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <UserForm 
                        clients={clients}
                        mode="edit"
                        initialData={{
                            ...user,
                            full_name: user.full_name || undefined
                        }} 
                        onFormSubmit={handleFormSubmit} 
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
} 