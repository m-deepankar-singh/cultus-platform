import { VirtualizedUsersTableWrapper } from "@/components/users/virtualized-users-table-wrapper";
import { createClient } from "@/lib/supabase/server";
import { AddUserDialog } from "@/components/users/add-user-dialog";

export default async function UsersPage() {
	const supabase = await createClient();
	
	// Fetch clients for the AddUserDialog
	const { data: clientsData } = await supabase
		.from('clients')
		.select('id, name')
		.order('name');
	
	const clientOptions = (clientsData || []).map(c => ({ id: c.id, name: c.name }));

	return (
		<div className="container mx-auto p-6">
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Users</h1>
						<p className="text-muted-foreground">Manage your system users and their access permissions.</p>
					</div>
					<AddUserDialog clients={clientOptions} />
				</div>
				<VirtualizedUsersTableWrapper />
			</div>
		</div>
	);
} 