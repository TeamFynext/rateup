import React, { ReactElement, ReactNode, useEffect } from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import Layout from "../components/Layout/Layout";
import SuperTokensReact, {
  redirectToAuth,
  SuperTokensWrapper,
} from "supertokens-auth-react";
import { frontendConfig } from "../config/frontendConfig";
//import Session from "supertokens-auth-react/recipe/session";
import Session from "supertokens-web-js/recipe/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextPage } from "next";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { UserProvider } from "../context/UserContext";
import { Hydrate } from "@tanstack/react-query";

import SuperTokens from "supertokens-web-js";
import WithLoader from "../components/Layout/Loader/WithLoader";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../styles/global.css";
import { GilroyRegular } from "../public/fonts";
import { theme } from "../config/mantineTheme";
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

  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000,
          },
        },
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
  if (pageProps.fromSupertokens === "needs-refresh") {
    return null;
  }

  // const styleOverride = {
  //   fontSizes: {
  //     xxl: '1.8rem',
  //   }
  // } VERIFY

  // const styleOverride = createTheme({
  //   fontSizes: {
  //     xxl: '1.8rem',
  //   }
  // });

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
            <Hydrate state={pageProps.dehydratedState}>
              <UserProvider>
                <LayoutComponent>
                  <WithLoader>
                    <Component {...pageProps} />
                  </WithLoader>
                </LayoutComponent>
              </UserProvider>
              <ReactQueryDevtools
                initialIsOpen={false}
                position="bottom-left"
              />
            </Hydrate>
          </QueryClientProvider>
          <Notifications />
        </MantineProvider>
      </main>
      {/* </SuperTokensWrapper> */}
    </>
  );
}
