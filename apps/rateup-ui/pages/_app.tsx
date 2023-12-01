import React, { ReactElement, ReactNode, useEffect } from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import { MantineProvider } from "@mantine/core";
import { nprogress } from "@mantine/nprogress";
import { Notifications } from "@mantine/notifications";
import SuperTokensReact, {
  redirectToAuth,
  SuperTokensWrapper,
} from "supertokens-auth-react";
import { frontendConfig } from "../config/frontendConfig";
import Session from "supertokens-web-js/recipe/session";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { NextPage } from "next";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { UserProvider } from "../context/UserContext";
import { HydrationBoundary } from "@tanstack/react-query";

import SuperTokens from "supertokens-web-js";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/nprogress/styles.css";
import "../styles/global.css";
import { theme } from "../config/mantineTheme";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout/Layout";
import axios from "axios";
import { ModalsProvider } from "@mantine/modals";
import { useRouter } from "next/router";
if (typeof window !== "undefined") {
  SuperTokens.init(frontendConfig());
}

// TODO: docs warns to not create this at file root level

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};
type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};
export default function App({
  Component,
  pageProps,
  ...appProps
}: AppPropsWithLayout) {
  const router = useRouter();
  const isLayoutNeeded = appProps.router.pathname.includes("/dashboard");
  let LayoutComponent;
  // page has pre defined layout
  if (Component.getLayout !== undefined) {
    LayoutComponent = Component.getLayout;
  } else {
    // page has no pre defined layout
    if (isLayoutNeeded) {
      LayoutComponent = Layout;
    } else {
      LayoutComponent = React.Fragment;
    }
  }

  //React Queries global settings
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            placeholderData: (previousData, previousQuery) => previousData, // This will apply to all queries
            staleTime: 60 * 1000,
            gcTime: 600 * 1000,
          },
        },
        queryCache: new QueryCache({
          onError: async (error) => {
            // Check if error is an instance of an Axios error
            if (axios.isAxiosError(error)) {
              const serverError = (error as any)?.response?.data;
              if (
                error?.response?.status === 401 &&
                serverError?.message === "Not authorized"
              ) {
                // Run supertoken auth refresh
                if (await Session.attemptRefreshingSession()) {
                  //location.reload();
                  console.log("Session Refreshed");
                } else {
                  // user has been logged out
                  redirectToAuth();
                }
              }
            }
          },
        }),
      }),
  );

  useEffect(() => {
    async function doRefresh() {
      if (pageProps.fromSupertokens === "needs-refresh") {
        if (await Session.attemptRefreshingSession()) {
          location.reload();
        } else {
          // user has been logged out
          redirectToAuth();
        }
      }
    }

    doRefresh();
  }, [pageProps.fromSupertokens]);

  useEffect(() => {
    const startNavigationProgress = () => {
      nprogress.start();
    };

    const completeNavigationProgress = () => {
      nprogress.complete();
    };

    const resetNavigationProgress = () => {
      nprogress.reset();
    };

    router.events.on("routeChangeStart", startNavigationProgress);
    router.events.on("routeChangeComplete", completeNavigationProgress);
    router.events.on("routeChangeError", resetNavigationProgress);

    return () => {
      router.events.off("routeChangeStart", startNavigationProgress);
      router.events.off("routeChangeComplete", completeNavigationProgress);
      router.events.off("routeChangeError", resetNavigationProgress);
    };
  }, [router]);

  if (pageProps.fromSupertokens === "needs-refresh") {
    return null;
  }
  return (
    <>
      <Head>
        <title>Rateup</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
        <link rel="shortcut icon" href="/favicon.png" />
      </Head>
      {/* <SuperTokensWrapper> */}
      {/* <MantineProvider withGlobalStyles --- VERIFY MANTINE---- withNormalizeCSS theme={styleOverride}> */}
      <MantineProvider theme={theme}>
        <ModalsProvider>
          <Notifications />
          <QueryClientProvider client={queryClient}>
            <HydrationBoundary state={pageProps.dehydratedState}>
              <UserProvider>
                <LayoutComponent>
                  <AnimatePresence>
                    <motion.div
                      style={{ height: "100%" }}
                      key={appProps.router.pathname}
                      initial={
                        !(
                          appProps.router.pathname.includes("login") ||
                          appProps.router.pathname.includes("signup")
                        ) && { opacity: 0 }
                      }
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Component {...pageProps} />
                    </motion.div>
                  </AnimatePresence>
                </LayoutComponent>
              </UserProvider>
              <ReactQueryDevtools
                initialIsOpen={false}
                buttonPosition="top-right"
              />
            </HydrationBoundary>
          </QueryClientProvider>
          <Notifications />
        </ModalsProvider>
      </MantineProvider>
      {/* </SuperTokensWrapper> */}
    </>
  );
}
