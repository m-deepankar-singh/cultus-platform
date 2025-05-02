import type React from "react";
import { AppHeader } from "@/components/app/app-header";

export default function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col">
			<AppHeader />
			<main className="flex-1 bg-muted/40 p-4 md:p-8">{children}</main>
			{/* Add Footer if needed */}
		</div>
	);
} 