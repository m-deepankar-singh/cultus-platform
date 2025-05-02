"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Default options for queries if needed, e.g., staleTime
			staleTime: 1000 * 60 * 5, // 5 minutes
		},
	},
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
	return (
		// Provide the client to your App
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
} 