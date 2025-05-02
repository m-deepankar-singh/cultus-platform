import { UpdatePasswordForm } from "@/components/auth/update-password-form";
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
						Enter and confirm your new password below.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<UpdatePasswordForm />
				</CardContent>
			</Card>
		</div>
	);
} 