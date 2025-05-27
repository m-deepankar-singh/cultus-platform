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
				refetchOnReconnect: false, // Disable refetch on reconnect
				refetchOnMount: true, // Only refetch on mount if stale
				refetchInterval: false, // Disable automatic background refetching
				retry: 2, // Reduce retry attempts
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
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