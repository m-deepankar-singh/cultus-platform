"use client";

import type React from "react";
import { AppHeader } from "@/components/app/app-header";
import { LightBackground } from "@/components/ui/light-background";
import { AdvancedPageTransition } from "@/components/ui/advanced-page-transition";
import { Toaster } from "@/components/ui/toaster";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface AppShellProps {
	children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
	const { theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const pathname = usePathname();
	
	// Check if current page is login
	const isLoginPage = pathname === "/app/login";
	
	// Wait until component is mounted to avoid hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);
	
	// Before mount, render without theme-dependent content
	if (!mounted) {
		return (
			<div className="flex h-screen flex-col overflow-hidden">
				{!isLoginPage && <AppHeader />}
				{/* Background element - fallback for SSR */}
				{!isLoginPage && (
				<div className="fixed inset-0 -z-10">
					<div className="relative w-full h-full bg-muted/40">
						<div className="w-full h-full" />
					</div>
				</div>
				)}
				{/* Main content area - always scrollable */}
				<main className={`flex-1 overflow-auto min-h-0 ${!isLoginPage ? 'p-4 md:p-8 bg-transparent' : ''}`}>
					<div className={`${!isLoginPage ? 'relative z-10' : ''}`}>
						<AdvancedPageTransition>
							{children}
						</AdvancedPageTransition>
					</div>
				</main>
				{/* Toast notifications */}
				<Toaster />
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			{!isLoginPage && <AppHeader />}
			{/* Background element - theme-aware after mount */}
			{!isLoginPage && (
			<div className="fixed inset-0 -z-10">
				{theme === "dark" ? (
					<div className="w-full h-full bg-black" />
				) : (
					<LightBackground>
						<div className="w-full h-full" />
					</LightBackground>
				)}
			</div>
			)}
			{/* Main content area - always scrollable */}
			<main className={`flex-1 overflow-auto min-h-0 ${!isLoginPage ? 'p-4 md:p-8 bg-transparent' : ''}`}>
				<div className={`${!isLoginPage ? 'relative z-10' : ''}`}>
					<AdvancedPageTransition>
						{children}
					</AdvancedPageTransition>
				</div>
			</main>
			{/* Toast notifications */}
			<Toaster />
		</div>
	);
} 