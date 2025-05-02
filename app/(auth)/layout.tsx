import type React from "react";
 
// This layout applies to routes within the (auth) group.
// It's intentionally minimal to avoid showing dashboard elements on auth pages.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>; // Render children directly without any shell
} 