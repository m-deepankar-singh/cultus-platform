"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { AppLoginSchema, type AppLoginFormValues } from "@/lib/schemas/auth";
import { SessionService } from "@/lib/auth/session-service";
import { Loader2, AlertCircle, ShieldX, GraduationCap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AppLoginForm() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [showTempPasswordAlert, setShowTempPasswordAlert] = React.useState(false);
	const [submissionError, setSubmissionError] = React.useState<string | null>(null);
	const [isInvalidCredentials, setIsInvalidCredentials] = React.useState(false);
	const router = useRouter();
	const { toast } = useToast();

	// Load remember me preference from localStorage
	const [rememberMeDefault] = React.useState(() => SessionService.getRememberMe());

	const form = useForm<AppLoginFormValues>({
		resolver: zodResolver(AppLoginSchema),
		defaultValues: {
			email: "",
			password: "",
			rememberMe: rememberMeDefault
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
				const text = await response.text();
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

			// Configure session preferences  
			SessionService.configureSession(values.rememberMe, 'student');

			// Success toast
			toast({
				title: "Login Successful",
				description: "Welcome back! Redirecting to your dashboard...",
			});

			// Redirect to the app dashboard on successful login
			router.push("/app/dashboard");

		} catch (error: any) {
			const generalErrorMessage = error.message || "An unexpected error occurred. Please try again.";
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
				<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
					<GraduationCap className="w-6 h-6 text-green-600 dark:text-green-400" />
				</div>
				<h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-900 to-green-600 dark:from-green-400 dark:to-green-200">
					Student Login
				</h1>
				<p className="text-neutral-600 dark:text-neutral-300">
					Enter your credentials to access your learning dashboard
				</p>
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
				<Alert variant="destructive" className="mb-6 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-red-500/50">
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
						className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 text-white shadow-lg mt-2"
						disabled={isLoading}
					>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{isLoading ? "Signing in..." : "Sign In"}
					</Button>
				</form>
			</Form>
			
			<div className="mt-6 text-sm text-center text-neutral-600 dark:text-neutral-400">
				<p>First time logging in? Use the temporary password provided in your welcome email.</p>
			</div>
		</>
	);
} 