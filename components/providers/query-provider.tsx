"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function QueryProvider({ children }: { children: React.ReactNode }) {
// Create a client
	const [queryClient] = React.useState(() => new QueryClient({
	defaultOptions: {
		queries: {
				staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
				refetchOnWindowFocus: false, // Disable refetch on window focus globally
				// Consider other defaults like refetchOnMount or refetchOnReconnect if needed
		},
	},
	}));

	return (
		// Provide the client to your App
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
} 