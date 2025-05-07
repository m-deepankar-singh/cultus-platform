import type React from "react";
import { AppHeader } from "@/components/app/app-header";

export default function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<AppHeader />
			<main className="flex-1 overflow-auto min-h-0 bg-muted/40 p-4 md:p-8">{children}</main>
			{/* Add Footer if needed */}
		</div>
	);
} 