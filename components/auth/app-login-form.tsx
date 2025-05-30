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
import { Loader2, AlertCircle, ShieldX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
	email: z.string().email({ message: "Invalid email address." }),
	password: z.string().min(1, { message: "Password is required." }),
});

type AppLoginFormValues = z.infer<typeof formSchema>;

export function AppLoginForm() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [showTempPasswordAlert, setShowTempPasswordAlert] = React.useState(false);
	const [submissionError, setSubmissionError] = React.useState<string | null>(null);
	const [isInvalidCredentials, setIsInvalidCredentials] = React.useState(false);
	const router = useRouter();
	const { toast } = useToast();

	const form = useForm<AppLoginFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(values: AppLoginFormValues) {
		setIsLoading(true);
		setShowTempPasswordAlert(false);
		setSubmissionError(null);
		setIsInvalidCredentials(false);
		try {
			const response = await fetch("/api/app/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(values),
			});

			// Handle non-JSON responses
			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				// If not JSON, get the text and log it for debugging
				const text = await response.text();
				console.error("Non-JSON response received:", text);
				throw new Error("Server returned an invalid response format. Please try again later.");
			}

			const result = await response.json();

			if (!response.ok) {
				const errorMessage = result.error || `HTTP error! status: ${response.status}`;
				if (response.status === 401 && errorMessage.includes("Invalid login credentials")) {
					setIsInvalidCredentials(true);
					setShowTempPasswordAlert(true);
					throw new Error("Invalid login credentials. If you're a new user, please use the temporary password provided in your welcome email.");
				}
				throw new Error(errorMessage);
			}

			// Redirect to the app dashboard on successful login
			router.push("/app/dashboard");
			// Optionally show a success toast
			// toast({ title: "Login Successful", description: "Redirecting..." });

		} catch (error: any) {
			const generalErrorMessage = error.message || "An unexpected error occurred. Please try again.";
			console.error("Login failed:", error);
			if (!showTempPasswordAlert) {
				setSubmissionError(generalErrorMessage);
			}
			toast({
				variant: "destructive",
				title: "Login Failed",
				description: generalErrorMessage,
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<>
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400">Student Login</h1>
				<p className="text-neutral-600 dark:text-neutral-300">Enter your credentials to access your learning dashboard</p>
			</div>
			
			{isInvalidCredentials && (
				<Alert variant="destructive" className="mb-6 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-red-500/50">
					<ShieldX className="h-5 w-5" />
					<AlertTitle className="font-medium">Incorrect Email or Password</AlertTitle>
					<AlertDescription className="mt-1">
						Please check your credentials and try again. Make sure your caps lock is off.
					</AlertDescription>
				</Alert>
			)}
			
			{submissionError && !isInvalidCredentials && (
				<Alert variant="destructive" className="mb-6 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Login Error</AlertTitle>
					<AlertDescription>{submissionError}</AlertDescription>
				</Alert>
			)}
			
			{showTempPasswordAlert && (
				<Alert variant="default" className="mb-6 bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm border-yellow-500/50 text-yellow-700 dark:border-yellow-500/30 dark:text-yellow-300 [&>svg]:text-yellow-500 dark:[&>svg]:text-yellow-400">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Are you a new user?</AlertTitle>
					<AlertDescription>
						New accounts require the temporary password sent in your welcome email. 
						If you haven't received your welcome email or forgot your temporary password, 
						please contact your administrator.
					</AlertDescription>
				</Alert>
			)}
			
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-neutral-700 dark:text-neutral-200">Email</FormLabel>
								<FormControl>
									<Input
										type="email"
										placeholder="student@example.com"
										{...field}
										disabled={isLoading}
										className={`bg-white/70 dark:bg-black/50 backdrop-blur-sm border-neutral-200 dark:border-neutral-800 ${isInvalidCredentials ? 'border-red-400 dark:border-red-500 focus-visible:ring-red-400 dark:focus-visible:ring-red-500' : ''}`}
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
										className={`bg-white/70 dark:bg-black/50 backdrop-blur-sm border-neutral-200 dark:border-neutral-800 ${isInvalidCredentials ? 'border-red-400 dark:border-red-500 focus-visible:ring-red-400 dark:focus-visible:ring-red-500' : ''}`}
										autoComplete="current-password"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button 
						type="submit" 
						className="w-full bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 mt-2"
						disabled={isLoading}
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Sign In
					</Button>
				</form>
			</Form>
			
			<div className="mt-6 text-sm text-center text-neutral-600 dark:text-neutral-400">
				<p>First time logging in? Use the temporary password provided in your welcome email.</p>
			</div>
		</>
	);
} 