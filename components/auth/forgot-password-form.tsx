"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
	email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [isSubmitted, setIsSubmitted] = React.useState(false);
	const { toast } = useToast();
	const supabase = createClient();

	const form = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	async function onSubmit(values: ForgotPasswordFormValues) {
		setIsLoading(true);
		setIsSubmitted(false); // Reset submission state
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
				// The redirectTo URL should point to your update password page
				redirectTo: `${window.location.origin}/auth/update-password`,
			});

			if (error) {
				throw error;
			}

			setIsSubmitted(true); // Show success message
			toast({ // Optional: Show success toast as well
				title: "Password Reset Email Sent",
				description: "Please check your email for instructions.",
			});

		} catch (error: any) {
			console.error("Password reset failed:", error);
			toast({
				variant: "destructive",
				title: "Password Reset Failed",
				description:
					error.message || "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	}

	if (isSubmitted) {
		return (
			<div className="text-center space-y-4">
				<h3 className="text-lg font-medium">Check your email</h3>
				<p className="text-sm text-muted-foreground">
					We have sent a password reset link to the email address you provided.
					Please follow the instructions in the email to reset your password.
				</p>
			</div>
		);
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
									placeholder="you@example.com"
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
					Send Reset Link
				</Button>
			</form>
		</Form>
	);
} 