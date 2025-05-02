import { AppLoginForm } from "@/components/auth/app-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AppLoginPage() {
	return (
		<div className="flex min-h-[calc(100vh-theme(spacing.14))] items-center justify-center bg-muted/40 px-4 py-12">
			{/* Adjust min-h if header height changes */}
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">Student Login</CardTitle>
					<CardDescription>
Enter your email and password to access your learning dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<AppLoginForm />
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