"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "@/lib/query-config";

export function QueryProvider({ children }: { children: React.ReactNode }) {
	// Create a client using the enhanced configuration
	const [queryClient] = useState(() => createQueryClient());

	return (
		// Provide the client to your App
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
} 