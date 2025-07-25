"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";

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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { AdminLoginSchema, type AdminLoginFormValues } from "@/lib/schemas/auth";
import { SessionService } from "@/lib/auth/session-service";
import { Loader2, AlertCircle, Shield, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AdminLoginForm() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [submissionError, setSubmissionError] = React.useState<string | null>(null);
	const router = useRouter();
	const { toast } = useToast();
	const searchParams = useSearchParams();
	const sessionExpired = searchParams.get('sessionExpired') === 'true';

	// Load remember me preference from localStorage
	const [rememberMeDefault] = React.useState(() => SessionService.getRememberMe());

	const form = useForm<AdminLoginFormValues>({
		resolver: zodResolver(AdminLoginSchema),
		defaultValues: {
			email: "",
			password: "",
			rememberMe: rememberMeDefault
		},
	});

	async function onSubmit(values: AdminLoginFormValues) {
		setIsLoading(true);
		setSubmissionError(null);
		
		try {
			// Use the new unified admin auth API
			const response = await fetch("/api/admin/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(values),
			});

			// Handle non-JSON responses
			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				throw new Error("Server returned an invalid response format. Please try again later.");
			}

			const result = await response.json();

			if (!response.ok) {
				const errorMessage = result.error || `HTTP error! status: ${response.status}`;
				throw new Error(errorMessage);
			}

			// Configure session preferences
			SessionService.configureSession(values.rememberMe, 'admin');

			// Success toast
			toast({
				title: "Login Successful",
				description: "Redirecting to admin dashboard...",
			});

			// Redirect to admin dashboard
			router.push("/dashboard");
			
		} catch (error: any) {
			const errorMessage = error.message || "An unexpected error occurred. Please try again.";
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
		<>
			<div className="text-center mb-6 sm:mb-8">
				<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
					<Shield className="w-6 h-6 text-primary" />
				</div>
				<h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
					Admin Login
				</h1>
				<p className="text-sm sm:text-base text-muted-foreground">
					Access the admin dashboard with your credentials
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
					{sessionExpired && (
						<Alert variant="default" className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm border-amber-500/50 text-amber-700 dark:border-amber-500/30 dark:text-amber-300 [&>svg]:text-amber-500 dark:[&>svg]:text-amber-400">
							<Clock className="h-4 w-4" />
							<AlertTitle>Session Expired</AlertTitle>
							<AlertDescription>Your session has expired. Please log in again.</AlertDescription>
						</Alert>
					)}
					
					{submissionError && (
						<Alert variant="destructive" className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-red-500/50">
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
								<FormLabel className="text-neutral-700 dark:text-neutral-200">Email</FormLabel>
								<FormControl>
									<Input
										type="email"
										placeholder="admin@example.com"
										{...field}
										disabled={isLoading}
										className="bg-white/70 dark:bg-black/50 backdrop-blur-sm border-neutral-200 dark:border-neutral-800"
										autoComplete="email"
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
								<FormLabel className="text-neutral-700 dark:text-neutral-200">Password</FormLabel>
								<FormControl>
									<Input
										type="password"
										placeholder="••••••••"
										{...field}
										disabled={isLoading}
										className="bg-white/70 dark:bg-black/50 backdrop-blur-sm border-neutral-200 dark:border-neutral-800"
										autoComplete="current-password"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="rememberMe"
						render={({ field }) => (
							<FormItem className="flex flex-row items-start space-x-3 space-y-0">
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
										disabled={isLoading}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel className="text-sm font-normal text-neutral-700 dark:text-neutral-300 cursor-pointer">
										Remember me for future sessions
									</FormLabel>
								</div>
							</FormItem>
						)}
					/>
					
					<Button 
						type="submit" 
						className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
						disabled={isLoading}
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{isLoading ? "Signing in..." : "Sign in to Admin"}
					</Button>
				</form>
			</Form>
			
			<div className="mt-4 sm:mt-6 text-xs sm:text-sm text-center text-muted-foreground">
				<p>Admin and Staff accounts only. Need help? Contact your system administrator.</p>
			</div>
		</>
	);
} 