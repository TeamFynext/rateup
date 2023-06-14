import React, { ReactElement, ReactNode, useEffect } from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import Layout from "../components/Layout/Layout";
import SuperTokensReact, {
  redirectToAuth,
  SuperTokensWrapper,
} from "supertokens-auth-react";
import { frontendConfig } from "../config/frontendConfig";
import Session from "supertokens-auth-react/recipe/session";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { NextPage } from "next";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { UserProvider } from "../context/UserContext";
import { Hydrate } from '@tanstack/react-query'

if (typeof window !== "undefined") {
  SuperTokensReact.init(frontendConfig());
}

const queryClient = new QueryClient();

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
  console.log("route=", appProps.router.pathname);
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
        <link rel="shortcut icon" href="/favicon.svg" />
      </Head>
      <SuperTokensWrapper>
        <MantineProvider withGlobalStyles withNormalizeCSS>
          <Notifications />
          <QueryClientProvider client={queryClient}>
           <Hydrate state={pageProps.dehydratedState}>
            <UserProvider>
            <LayoutComponent>
              <Component {...pageProps} />
            </LayoutComponent>
            </UserProvider>
            <ReactQueryDevtools initialIsOpen={false}  position="bottom-right"/>
            </Hydrate>
          </QueryClientProvider>
          <Notifications />
        </MantineProvider>
      </SuperTokensWrapper>
    </>
  );
}
