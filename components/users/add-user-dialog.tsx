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
import { UserPlus } from 'lucide-react'
import { createUser } from '@/app/actions/userActions'

interface Client { id: string; name: string; }

interface AddUserDialogProps {
    clients: Client[];
}

export function AddUserDialog({ clients }: AddUserDialogProps) {
    const [open, setOpen] = React.useState(false);

    // Optional: Callback to close dialog after successful form submission
    const handleFormSubmit = () => {
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to create a new user profile.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <UserForm 
                        clients={clients} 
                        mode="create"
                        serverAction={createUser} 
                        onFormSubmit={handleFormSubmit}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
} 