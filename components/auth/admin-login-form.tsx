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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
	email: z.string().email({ message: "Invalid email address." }),
	password: z.string().min(1, { message: "Password is required." }),
});

type AdminLoginFormValues = z.infer<typeof formSchema>;

export function AdminLoginForm() {
	const [isLoading, setIsLoading] = React.useState(false);
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
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email: values.email,
				password: values.password,
			});

			if (error) {
				throw error;
			}

			// Redirect to dashboard on successful login
			router.push("/dashboard"); // Adjust if your dashboard route is different
			// Optionally show a success toast, though redirect is often enough
			// toast({ title: "Login Successful", description: "Redirecting..." });

		} catch (error: any) {
			console.error("Login failed:", error);
			toast({
				variant: "destructive",
				title: "Login Failed",
				description:
					error.message || "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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