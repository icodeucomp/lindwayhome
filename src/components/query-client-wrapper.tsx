"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const QueryClientWrapper = ({ children }: { children: React.ReactNode }) => {
  // Create QueryClient instance in state to ensure it's stable across re-renders
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
