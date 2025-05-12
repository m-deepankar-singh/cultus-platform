import { UsersHeader } from "@/components/users/users-header";
import { UsersTable } from "@/components/users/users-table";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server"; // Import server client

// Define Client type (should match definition in user-form or be imported)
interface Client { id: string; name: string; }

export default async function UsersPage() {
	// Fetch clients server-side
	const supabase = await createClient();
	
	// Get current user role for permissions
	const { data: { user } } = await supabase.auth.getUser();
	let currentUserRole = undefined;
	
	if (user) {
		// Fetch current user's role
		const { data: currentUserProfile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();
		
		currentUserRole = currentUserProfile?.role;
	}
	
	// Fetch clients for dropdown
	const { data: clients, error: clientsError } = await supabase
		.from('clients')
		.select('id, name')
		.order('name', { ascending: true });

	if (clientsError) {
		console.error("Error fetching clients for User page:", clientsError);
		// Handle error appropriately, maybe show a message
	}
	
	// Add debug logging for client data
	console.log("Clients fetched for Users page:", clients?.length || 0, "clients found");
	
	// Make sure clients is always an array, even if data is null
	const safeClients = clients || [];

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
			{/* Pass fetched clients to the header */}
			<UsersHeader clients={safeClients} />
			{/* The UsersTable is now a client component with pagination */}
			<UsersTable 
				clients={safeClients} 
				initialCurrentUserRole={currentUserRole}
			/>
		</div>
	);
}

// Basic skeleton loader for the table
function UsersTableSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex justify-between">
				<Skeleton className="h-10 w-1/3" />
				<Skeleton className="h-10 w-24" />
			</div>
			<Skeleton className="h-64 w-full rounded-md border" />
		</div>
	);
} 