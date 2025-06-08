import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ForgotPasswordPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
					<CardDescription>
						This feature is not yet implemented. Please contact your administrator for password reset assistance.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center text-sm">
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