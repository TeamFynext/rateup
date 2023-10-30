import React, { ReactElement, ReactNode, useEffect } from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import SuperTokensReact, {
  redirectToAuth,
  SuperTokensWrapper,
} from "supertokens-auth-react";
import { frontendConfig } from "../config/frontendConfig";
import Session from "supertokens-web-js/recipe/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextPage } from "next";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { UserProvider } from "../context/UserContext";
import { HydrationBoundary, keepPreviousData } from "@tanstack/react-query";

import SuperTokens from "supertokens-web-js";
import WithLoader from "../components/Layout/Loader/WithLoader";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "../styles/global.css";
import { GilroyRegular } from "../public/fonts";
import { theme } from "../config/mantineTheme";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "../components/Layout/Layout";
import axios from "axios";
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
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        placeholderData: keepPreviousData, // This will apply to all queries
        staleTime: 60 * 1000,
      },
    },
  });

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
      <main className={GilroyRegular.className}>
        <MantineProvider theme={theme}>
          <Notifications />
          <QueryClientProvider client={queryClient}>
            <HydrationBoundary state={pageProps.dehydratedState}>
              <UserProvider>
                <LayoutComponent>
                  <AnimatePresence>
                    <motion.div
                      style={{ height: "100%" }}
                      key={appProps.router.pathname}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <WithLoader>
                        <Component {...pageProps} />
                      </WithLoader>
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
        </MantineProvider>
        {/* </SuperTokensWrapper> */}
      </main>
    </>
  );
}
