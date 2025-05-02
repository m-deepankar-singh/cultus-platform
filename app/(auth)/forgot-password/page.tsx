import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ForgotPasswordPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
					<CardDescription>
						Enter your email below and we'll send you a link to reset your
						password.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ForgotPasswordForm />
					<div className="mt-4 text-center text-sm">
						Remembered your password?
						{/* TODO: Determine correct login links - maybe need separate links for admin/app? */}
						<Link href="/admin/login" className="underline ml-1">
							Log in
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
} 