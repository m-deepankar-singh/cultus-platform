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
	const { data: clients, error: clientsError } = await supabase
		.from('clients')
		.select('id, name')
		.order('name', { ascending: true });

	if (clientsError) {
		console.error("Error fetching clients for User page:", clientsError);
		// Handle error appropriately, maybe show a message
	}

	return (
		<div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
			{/* Pass fetched clients to the header */}
			<UsersHeader clients={clients || []} />
			{/* Add Suspense for data fetching in UsersTable */}
			<Suspense fallback={<UsersTableSkeleton />}>
				{/* Pass clients down to the table */}
				<UsersTable clients={clients || []}/>
			</Suspense>
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