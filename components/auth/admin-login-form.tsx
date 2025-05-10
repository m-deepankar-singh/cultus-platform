"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
	email: z.string().email({ message: "Invalid email address." }),
	password: z.string().min(1, { message: "Password is required." }),
});

type AdminLoginFormValues = z.infer<typeof formSchema>;

export function AdminLoginForm() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [submissionError, setSubmissionError] = React.useState<string | null>(null);
	const router = useRouter();
	const { toast } = useToast();
	const supabase = createClient();

	const form = useForm<AdminLoginFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(values: AdminLoginFormValues) {
		setIsLoading(true);
		setSubmissionError(null);
		try {
			console.log("Login attempt for:", values.email);
			console.log("Current location:", window.location.href);
			console.log("Current origin:", window.location.origin);
			
			// Debug: Check Supabase URL and anon key availability (masked for security)
			console.log("Supabase configuration check:", {
				url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Available" : "❌ Missing",
				anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
					`✅ Available (starts with: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 3)}...)` : 
					"❌ Missing"
			});
			
			// Consider adding a redirect URL for Vercel deployment
			const { error } = await supabase.auth.signInWithPassword({
				email: values.email,
				password: values.password,
				options: {
					redirectTo: `${window.location.origin}/dashboard`
				}
			});

			if (error) {
				console.error("Login error details:", error.message, error.status);
				throw error;
			}

			console.log("Auth successful, redirecting to dashboard");
			router.push("/dashboard");
		} catch (error: any) {
			const errorMessage = error.message || "An unexpected error occurred. Please try again.";
			console.error("Login failed:", error);
			setSubmissionError(errorMessage);
			toast({
				variant: "destructive",
				title: "Login Failed",
				description: errorMessage,
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{submissionError && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Login Error</AlertTitle>
						<AlertDescription>{submissionError}</AlertDescription>
					</Alert>
				)}
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder="admin@example.com"
									{...field}
									disabled={isLoading}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Password</FormLabel>
							<FormControl>
								<Input
									type="password"
									placeholder="••••••••"
									{...field}
									disabled={isLoading}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit" className="w-full" disabled={isLoading}>
					{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Log in
				</Button>
			</form>
		</Form>
	);
} 