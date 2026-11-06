// In Next.js, this file would be called: app/providers.tsx

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  dehydrate,
  environmentManager,
  HydrationBoundary,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { AppErrorBoundary } from "@/components/AppErrorBoundary.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { UserProvider } from "@/context/UserContext.tsx";
import { asApiError, getApiErrorData } from "@/utils/apiError.ts";
import RouteChangeHandler from "@/utils/routeHandler.tsx";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        placeholderData: (previousData: unknown, _previousQuery: unknown) => previousData, // This will apply to all queries
        staleTime: 60 * 1000,
        gcTime: 600 * 1000,
        retry: (failureCount, error: unknown) => {
          // Don't retry for certain error responses
          const response = asApiError(error)?.response;
          if (response?.status === 401 || getApiErrorData(error)?.message === "Not authorized") {
            return false;
          }
          return failureCount <= 2;
        },
      },
    },
    queryCache: new QueryCache({
      onError: async (error) => {
        if (
          asApiError(error).response?.status !== 401 ||
          getApiErrorData(error)?.message !== "Not authorized"
        ) {
          return;
        }
        // Loaded here, not at the top: this module is on every marketing page.
        await import("@/lib/auth/supertokens");
        const { default: Session } = await import("supertokens-auth-react/recipe/session");
        await Session.attemptRefreshingSession();
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (environmentManager.isServer()) {
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

export default function Providers({ children }: { children: ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* This boundary wraps the whole app tree, so anything that suspends here (lazy modal
            chunks, UserProvider) would otherwise blank the screen with no feedback. */}
        <Suspense fallback={<RateupLoader className="h-dvh" />}>
          <UserProvider>
            <RouteChangeHandler />
            <HydrationBoundary state={dehydrate(queryClient)}>
              <TooltipProvider>{children}</TooltipProvider>
            </HydrationBoundary>
          </UserProvider>
        </Suspense>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
