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

// Schema with password confirmation
const formSchema = z
	.object({
		password: z
			.string()
			.min(8, { message: "Password must be at least 8 characters long." }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"], // Error path for confirmation field
	});

type UpdatePasswordFormValues = z.infer<typeof formSchema>;

export function UpdatePasswordForm() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [isSuccess, setIsSuccess] = React.useState(false);
	const router = useRouter();
	const { toast } = useToast();
	const supabase = createClient();

	const form = useForm<UpdatePasswordFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(values: UpdatePasswordFormValues) {
		setIsLoading(true);
		try {
			// The user should be implicitly logged in via the token
			// in the URL when they arrive on this page.
			const { error } = await supabase.auth.updateUser({
				password: values.password,
			});

			if (error) {
				throw error;
			}

			setIsSuccess(true); // Show success message
			toast({
				title: "Password Updated Successfully",
				description: "You can now log in with your new password.",
			});

			// Optional: Redirect after a short delay
			// setTimeout(() => {
			//   router.push('/admin/login'); // Or appropriate login page
			// }, 3000);

		} catch (error: any) {
			console.error("Password update failed:", error);
			toast({
				variant: "destructive",
				title: "Password Update Failed",
				description:
					error.message || "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	}

	if (isSuccess) {
		return (
			<div className="text-center space-y-4">
				<h3 className="text-lg font-medium">Password Updated!</h3>
				<p className="text-sm text-muted-foreground">
					Your password has been updated successfully. You can now log in using
					your new password.
				</p>
				{/* TODO: Add correct login link */}
				{/* <Button onClick={() => router.push('/admin/login')} className="mt-4">
          Go to Login
        </Button> */}
			</div>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<FormLabel>New Password</FormLabel>
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
				<FormField
					control={form.control}
					name="confirmPassword"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Confirm New Password</FormLabel>
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
					Update Password
				</Button>
			</form>
		</Form>
	);
} 