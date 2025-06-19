'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
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
import { useToast } from "@/components/ui/use-toast"
import { UserFormState } from '@/app/actions/userActions'
import { Loader2 } from 'lucide-react'

// Define the schema again (can be imported from actions if preferred and compatible)
const BaseUserSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    // Password is required only for create mode
    password: z.string().optional(), 
    role: z.enum(["Admin", "Staff", "Viewer", "Client Staff"], { 
        required_error: "Role is required",
    }),
    clientId: z.string().optional(), 
});

const UserFormSchema = BaseUserSchema.refine((data) => {
    if (data.role === 'Client Staff' && !data.clientId) return false;
    return true;
}, { message: "Client selection is required for Client Staff role", path: ['clientId'] })
  .refine(() => {
      // Require password only in create mode (when initialData is not present)
      // This logic depends on how you differentiate modes in the component call
      // For simplicity, we'll handle this check outside the main zod schema for now
      // or make password required in BaseUserSchema and omit for update.
      // Let's stick to omitting for update schema and making it optional here
      return true; // Placeholder - actual check might be more complex
  });


type UserFormValues = z.infer<typeof UserFormSchema>;

interface Client { id: string; name: string; }

interface UserProfile {
    id: string;
    email?: string;
    // Updated to match the structure from paginated API
    full_name?: string | null;
    role?: string;
    client_id?: string | null;
    client?: {
        id: string;
        name: string;
    };
}

interface UserFormProps {
    clients: Client[];
    mode: 'create' | 'edit';
    initialData?: UserProfile | null; // Make optional, only present in edit mode
    serverAction: (prevState: UserFormState, formData: FormData) => Promise<UserFormState>;
    onFormSubmit?: () => void; // Optional: Callback to close dialog
}

const initialState: UserFormState = { message: null, errors: {} };

export function UserForm({ 
    clients, 
    mode, 
    initialData = null, // Default to null for create mode
    serverAction, 
    onFormSubmit 
}: UserFormProps) {
    const [state, formAction] = useActionState(serverAction, initialState);
    const { toast } = useToast();

    // Add debug logging for clients data
    React.useEffect(() => {
        console.log('Clients received in UserForm:', clients);
    }, [clients]);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(UserFormSchema),
        defaultValues: {
            fullName: initialData?.full_name || '',
            email: initialData?.email || '',
            password: '',
            role: initialData?.role as any || undefined,
            clientId: initialData?.client_id || undefined,
        },
    });

    const selectedRole = form.watch('role');

    React.useEffect(() => {
        if (state.message && state.errors && Object.keys(state.errors).length === 0) {
            toast({
                title: "Success",
                description: state.message,
            });
            if (mode === 'create') {
                 form.reset();
            }
            onFormSubmit?.();
        } else if (state.message && state.errors && Object.keys(state.errors).length > 0) {
             toast({
                variant: "destructive",
                title: mode === 'create' ? "Error Creating User" : "Error Updating User",
                description: state.errors?._form?.[0] || state.message || "Please check the form fields.",
            });
        } else if (!state.message && state.errors && Object.keys(state.errors).length > 0) {
             toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please check the highlighted fields.",
             });
        }
    }, [state, toast, form, mode, onFormSubmit]);

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-4">
                {mode === 'edit' && initialData?.id && (
                    <input type="hidden" name="userId" value={initialData.id} />
                )}

                <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage>{state.errors?.fullName?.join(', ')}</FormMessage>
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
                                <Input type="email" placeholder="user@example.com" {...field} disabled={mode === 'edit'} />
                            </FormControl>
                            {mode === 'edit' && initialData?.email && (
                                <input type="hidden" name="email" value={initialData.email} />
                            )}
                            <FormDescription>
                                {mode === 'edit' ? 'Email cannot be changed.' : ''}
                            </FormDescription>
                            <FormMessage>{state.errors?.email?.join(', ')}</FormMessage>
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
                                <FormMessage>{state.errors?.password?.join(', ')}</FormMessage>
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
                            <input type="hidden" {...field} name="role" value={field.value || ''} /> 
                            <FormMessage>{state.errors?.role?.join(', ')}</FormMessage>
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
                                        {/* Debug info moved outside JSX */}
                                        {/* Filter out any clients with empty or null IDs */}
                                        {(clients || [])
                                          .filter(client => !!client && !!client.id)
                                          .map(client => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name}
                                            </SelectItem>
                                          ))
                                        }
                                        
                                        {/* If no valid clients, display a message */}
                                        {(!clients || clients.length === 0 || clients.every(c => !c || !c.id)) && (
                                            <div className="px-2 py-2 text-sm text-muted-foreground">
                                                No clients available
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                                <input type="hidden" {...field} name="clientId" value={field.value || ''} /> 
                                <FormMessage>{state.errors?.clientId?.join(', ')}</FormMessage>
                            </FormItem>
                        )}
                    />
                )} 
                
                {state.errors?._form && (
                     <div className="text-sm font-medium text-destructive">
                         {state.errors._form.join(', ')}
                    </div>
                 )} 

                <SubmitButton mode={mode} />
            </form>
        </Form>
    );
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
            {mode === 'create' ? 'Create User' : 'Update User'} 
        </Button>
    );
} 