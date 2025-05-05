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

export function AddUserDialog({ clients: initialClients }: AddUserDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [clients, setClients] = React.useState<Client[]>(initialClients || []);
    const [isLoading, setIsLoading] = React.useState(false);

    // Fetch clients when the dialog opens to ensure we have the most up-to-date list
    React.useEffect(() => {
        if (open) {
            const fetchClients = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch('/api/admin/clients');
                    if (!response.ok) {
                        throw new Error('Failed to fetch clients');
                    }
                    const data = await response.json();
                    console.log('Clients fetched in AddUserDialog:', data);
                    setClients(data || []);
                } catch (error) {
                    console.error('Error fetching clients:', error);
                    // Fallback to the initial clients if the fetch fails
                    if (initialClients?.length) {
                        setClients(initialClients);
                    }
                } finally {
                    setIsLoading(false);
                }
            };

            fetchClients();
        }
    }, [open, initialClients]);

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