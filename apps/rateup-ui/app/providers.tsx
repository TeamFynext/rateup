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
import { NextIntlClientProvider } from "next-intl";
import Session from "supertokens-auth-react/recipe/session";

import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/context/UserContext";
import { isProduction } from "@/utils/constants";
import RouteChangeHandler from "@/utils/routeHandler";

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

// Call this during logout to force a fresh QueryClient for the next user session.
export function resetBrowserQueryClient() {
  browserQueryClient = undefined;
}

function onError(error) {
  if (error.code === "MISSING_MESSAGE" && isProduction) return;
  console.error(error);
}

export default function Providers({ children, locale, messages }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={onError}
      timeZone={timeZone ?? "UTC"}
    >
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <RouteChangeHandler />
          <HydrationBoundary state={dehydrate(queryClient)}>
            <TooltipProvider>{children}</TooltipProvider>
          </HydrationBoundary>
        </UserProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
}
