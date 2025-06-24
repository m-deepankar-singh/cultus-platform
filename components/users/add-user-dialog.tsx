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
import { useCreateUser } from '@/hooks/api/use-users'
import { useClients } from '@/hooks/api/use-clients'

interface Client { id: string; name: string; }

interface AddUserDialogProps {
    clients?: Client[];
}

export function AddUserDialog({ clients: initialClients }: AddUserDialogProps) {
    const [open, setOpen] = React.useState(false);
    
    // Use API hooks instead of manual fetching
    const { data: clientsResponse } = useClients();
    const createUser = useCreateUser();
    
    // Use clients from props as fallback, then from API
    const clients = clientsResponse?.data || initialClients || [];

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
                        onFormSubmit={handleFormSubmit}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
} 