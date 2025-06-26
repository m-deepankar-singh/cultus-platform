import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AdminLoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
					<CardDescription>
Enter your credentials to access the admin dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<AdminLoginForm />
					{/* Add link to forgot password page if implementing step 1.3.3 */}
					{/* <div className="mt-4 text-center text-sm">
						<Link href="/auth/forgot-password" className="underline">
							Forgot your password?
						</Link>
					</div> */}
				</CardContent>
			</Card>
		</div>
	);
} 