'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useCreateUser, useUpdateUser, type CreateUserData, type UpdateUserData, type UserProfile } from '@/hooks/api/use-users'
import type { UseMutationResult } from '@tanstack/react-query'

// Define the schema for validation
const BaseUserSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().optional(), 
    role: z.enum(["Admin", "Staff", "Viewer", "Client Staff"], { 
        required_error: "Role is required",
    }),
    clientId: z.string().optional(), 
})

const CreateUserFormSchema = BaseUserSchema.extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => {
    if (data.role === 'Client Staff' && !data.clientId) return false;
    return true;
}, { message: "Client selection is required for Client Staff role", path: ['clientId'] })

const UpdateUserFormSchema = BaseUserSchema.omit({ password: true, email: true }).refine((data) => {
    if (data.role === 'Client Staff' && !data.clientId) return false;
    return true;
}, { message: "Client selection is required for Client Staff role", path: ['clientId'] })

type CreateUserFormValues = z.infer<typeof CreateUserFormSchema>
type UpdateUserFormValues = z.infer<typeof UpdateUserFormSchema>

interface Client { 
    id: string; 
    name: string; 
}

interface UserFormProps {
    clients: Client[];
    mode: 'create' | 'edit';
    initialData?: UserProfile | null;
    onFormSubmit?: () => void;
}

export function UserForm({ 
    clients, 
    mode, 
    initialData = null,
    onFormSubmit 
}: UserFormProps) {
    const createUserMutation = useCreateUser()
    const updateUserMutation = useUpdateUser()
    
    const isLoading = createUserMutation.isPending || updateUserMutation.isPending

    // Use appropriate schema based on mode
    const schema = mode === 'create' ? CreateUserFormSchema : UpdateUserFormSchema
    
    const form = useForm<CreateUserFormValues | UpdateUserFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            fullName: initialData?.full_name || '',
            email: initialData?.email || '',
            password: '',
            role: (initialData?.role as any) || undefined,
            clientId: initialData?.client_id || undefined,
        },
    })

    const selectedRole = form.watch('role')

    const onSubmit = async (data: CreateUserFormValues | UpdateUserFormValues) => {
        try {
            if (mode === 'create') {
                const createData = data as CreateUserFormValues
                await createUserMutation.mutateAsync({
                    full_name: createData.fullName,
                    email: createData.email,
                    password: createData.password,
                    role: createData.role,
                    client_id: createData.role === 'Client Staff' ? createData.clientId : undefined,
                })
                
                form.reset()
                onFormSubmit?.()
            } else if (mode === 'edit' && initialData?.id) {
                const updateData = data as UpdateUserFormValues
                await updateUserMutation.mutateAsync({
                    userId: initialData.id,
                    data: {
                        full_name: updateData.fullName,
                        role: updateData.role,
                        client_id: updateData.role === 'Client Staff' ? updateData.clientId : null,
                    }
                })
                
                onFormSubmit?.()
            }
        } catch (error) {
            // Error handling is done in the mutation hooks
            console.error('Form submission error:', error)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input 
                                    type="email" 
                                    placeholder="user@example.com" 
                                    {...field} 
                                    disabled={mode === 'edit'} 
                                />
                            </FormControl>
                            <FormDescription>
                                {mode === 'edit' ? 'Email cannot be changed.' : ''}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {mode === 'create' && (
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )} 

                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select 
                                onValueChange={field.onChange} 
                                value={field.value} 
                            > 
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Staff">Staff</SelectItem>
                                    <SelectItem value="Viewer">Viewer</SelectItem>
                                    <SelectItem value="Client Staff">Client Staff</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {selectedRole === 'Client Staff' && (
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Client</FormLabel>
                                <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select the client" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name}
                                            </SelectItem>
                                        ))}
                                        
                                        {clients.length === 0 && (
                                            <div className="px-2 py-2 text-sm text-muted-foreground">
                                                No clients available
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )} 
                
                <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full"
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === 'create' 
                        ? (isLoading ? 'Creating...' : 'Create User')
                        : (isLoading ? 'Updating...' : 'Update User')
                    }
                </Button>
            </form>
        </Form>
    )
} 