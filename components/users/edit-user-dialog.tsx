'use client'

import * as React from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { UserForm } from './user-form'
import { updateUser } from '@/app/actions/userActions'

// Types (should ideally be shared)
interface Client { id: string; name: string; }
interface UserProfile {
    id: string;
    email?: string;
    profile: {
        full_name: string | null;
        role: "Admin" | "Staff" | "Viewer" | "Client Staff";
        client_id: string | null;
    } | null;
    client_name?: string;
}

interface EditUserDialogProps {
    user: UserProfile;
    clients: Client[];
    children: React.ReactNode; // To use as the trigger
}

export function EditUserDialog({ user, clients, children }: EditUserDialogProps) {
    const [open, setOpen] = React.useState(false);

    const handleFormSubmit = () => {
        setOpen(false); // Close dialog on successful submit
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* Use the passed children as the trigger */}
            <DialogTrigger asChild>{children}</DialogTrigger> 
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit User: {user.profile?.full_name || user.email}</DialogTitle>
                    <DialogDescription>
                        Update the user's profile details below.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <UserForm 
                        clients={clients}
                        mode="edit"
                        initialData={user} 
                        serverAction={updateUser} // Pass the update action
                        onFormSubmit={handleFormSubmit} 
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
} 