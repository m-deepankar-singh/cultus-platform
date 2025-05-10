"use client";

import type React from "react";
import { AppHeader } from "@/components/app/app-header";
import { LightBackground } from "@/components/ui/light-background";
import { AdvancedPageTransition } from "@/components/ui/advanced-page-transition";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	
	// Wait until component is mounted to avoid hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);
	
	if (!mounted) {
		return (
			<div className="flex h-screen flex-col overflow-hidden">
				<AppHeader />
				<main className="flex-1 overflow-auto min-h-0 bg-muted/40 p-4 md:p-8">{children}</main>
			</div>
		);
	}
	
	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<AppHeader />
			{/* Background element - subtle patterns in light mode */}
			<div className="fixed inset-0 -z-10">
				{theme === "dark" ? (
					<div className="w-full h-full bg-black" />
				) : (
					<LightBackground>
						<div className="w-full h-full" />
					</LightBackground>
				)}
			</div>
			{/* Main content area - always scrollable */}
			<main className="flex-1 overflow-auto min-h-0 p-4 md:p-8 bg-transparent">
				<div className="relative z-10">
					<AdvancedPageTransition>
						{children}
					</AdvancedPageTransition>
				</div>
			</main>
		</div>
	);
} 