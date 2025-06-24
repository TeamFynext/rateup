// In Next.js, this file would be called: app/providers.tsx
"use client";

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import {
  dehydrate,
  HydrationBoundary,
  isServer,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import axios from "axios";
import Session from "supertokens-web-js/recipe/session";

import { UserProvider } from "@/context/UserContext";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        placeholderData: (previousData, previousQuery) => previousData, // This will apply to all queries
        staleTime: 60 * 1000,
        gcTime: 600 * 1000,
        retry: (failureCount, error: any) => {
          // Don't retry for certain error responses
          const serverError = error?.response?.data;
          if (
            error?.response?.status === 401 ||
            serverError?.message === "Not authorized"
          ) {
            return false;
          }
          return failureCount <= 2;
        },
      },
    },
    queryCache: new QueryCache({
      onError: async (error) => {
        // Check if error is an instance of an Axios error
        if (!axios.isAxiosError(error)) return;
        const serverError = (error as any)?.response?.data;
        if (
          error?.response?.status === 401 &&
          serverError?.message === "Not authorized"
        ) {
          await Session.attemptRefreshingSession();
        }
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <UserProvider>{children}</UserProvider>
      </HydrationBoundary>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
    </QueryClientProvider>
  );
}
