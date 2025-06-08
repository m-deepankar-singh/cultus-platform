import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpdatePasswordPage() {
	// This page relies on the user clicking a link from their email,
	// which contains a token that Supabase uses to verify the session.
	// The UpdatePasswordForm component handles the actual update logic.
	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">Update Your Password</CardTitle>
					<CardDescription>
						This feature is not yet implemented. Please contact your administrator for password reset assistance.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center text-sm text-muted-foreground">
						Password update functionality will be available in a future update.
					</div>
				</CardContent>
			</Card>
		</div>
	);
} 