import React, { ReactElement, ReactNode, useEffect } from "react";
import { GetStaticPropsContext, NextPage } from "next";
import { AppProps } from "next/app";
import Head from "next/head";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { nprogress } from "@mantine/nprogress";
import { GoogleTagManager } from "@next/third-parties/google";
import {
  HydrationBoundary,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import set from "lodash/set";
import Session from "supertokens-auth-react/recipe/session";

import { UserProvider } from "../context/UserContext";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/nprogress/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";
import "../styles/global.css";
import "keen-slider/keen-slider.min.css";

import { useRouter } from "next/router";

import { ModalsProvider } from "@mantine/modals";
import axios from "axios";
import { NextIntlClientProvider } from "next-intl";
import SuperTokensReact, { SuperTokensWrapper } from "supertokens-auth-react";

import { frontendConfig } from "@/config/frontendConfig";

import FacebookPixel from "../components/Analytics/FacebookPixel";
import { AdminPanelLayout } from "../components/Layout/admin/AdminLayout";
import Layout from "../components/Layout/Layout";
import { allModalManagerModalsObj } from "../components/Modal/ModalManagerModals/allModalManagerModalsObj";
import { theme } from "../config/mantineTheme";
import messages from "../dictionaries/en.json";
import { checkEmailVerification } from "../utils/auth/checkEmailVerification";
import { isProduction } from "../utils/constants";
import { fbPageview } from "../utils/fbpixel";
import { geist, notoColorEmogi } from "../utils/fonts";

if (typeof window !== "undefined") {
  SuperTokensReact.init(frontendConfig());
}

// TODO: docs warns to not create this at file root level

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement<any>) => ReactNode;
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
  let showQueryDevTools = process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "TRUE";
  let LayoutComponent;
  // page has pre defined layout
  if (Component.getLayout !== undefined) {
    LayoutComponent = Component.getLayout;
  } else if (appProps.router.pathname.includes("admin")) {
    LayoutComponent = AdminPanelLayout;
    showQueryDevTools = false;
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
                  // TODO: not working redirect in localhost when we try to access secure route without login
                  // redirectToAuth();
                  router.push("/login");
                }
              }
            }
          },
        }),
      }),
  );

  useEffect(() => {
    async function doRefresh() {
      if (window.location.pathname !== "/login/verify-email") {
        checkEmailVerification();
      }
      if (pageProps.fromSupertokens === "needs-refresh") {
        if (await Session.attemptRefreshingSession()) {
          location.reload();
        } else {
          // user has been logged out
          SuperTokensReact.redirectToAuth();
        }
      }
    }

    doRefresh();
  }, [pageProps.fromSupertokens]);

  useEffect(() => {
    const handleRouteChange = (url: URL) => {
      if (isProduction) {
        fbPageview();
      }
    };

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
    router.events.on("routeChangeComplete", handleRouteChange);
    router.events.on("routeChangeError", resetNavigationProgress);

    return () => {
      router.events.off("routeChangeStart", startNavigationProgress);
      router.events.off("routeChangeComplete", completeNavigationProgress);
      router.events.off("routeChangeComplete", handleRouteChange);
      router.events.off("routeChangeError", resetNavigationProgress);
    };
  }, [router]);

  if (pageProps.fromSupertokens === "needs-refresh") {
    return null;
  }
  const canonicalUrl = (
    `https://rateup.app` + (router.asPath === "/" ? "" : router.asPath)
  ).split("?")[0];
  function onError(error) {
    if (
      error.code === "MISSING_MESSAGE" &&
      process.env.NODE_ENV === "production"
    )
      return;
    console.error(error);
  }
  return (
    <NextIntlClientProvider
      locale="en"
      messages={Object.entries(messages).reduce(
        (acc, [key, value]) => set(acc, key, value),
        {},
      )}
      timeZone="Europe/Vienna"
    >
      <MantineProvider theme={theme}>
        <Head>
          <title>Rateup</title>
          <meta
            name="viewport"
            content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
          />
          <link rel="shortcut icon" href="/favicon.png" />
          <link rel="canonical" href={canonicalUrl} />
        </Head>
        {isProduction && (
          <>
            <FacebookPixel />
          </>
        )}
        {/* notoCo</HydrationBoundary>lorEmogi is added as fallback for displaying emogies */}
        <main className={`${geist.className},${notoColorEmogi.className}`}>
          <QueryClientProvider client={queryClient}>
            <ModalsProvider modals={allModalManagerModalsObj}>
              <Notifications />
              <HydrationBoundary state={pageProps.dehydratedState}>
                <UserProvider>
                  <SuperTokensWrapper>
                    <LayoutComponent {...(isLayoutNeeded ? { appProps } : {})}>
                      <Component {...pageProps} />
                      <GoogleTagManager gtmId="GTM-NDC3D7DP" />
                    </LayoutComponent>
                  </SuperTokensWrapper>
                </UserProvider>
                {showQueryDevTools && (
                  <ReactQueryDevtools
                    initialIsOpen={false}
                    buttonPosition="top-right"
                  />
                )}
              </HydrationBoundary>
              <Notifications />
            </ModalsProvider>
          </QueryClientProvider>
        </main>
      </MantineProvider>
    </NextIntlClientProvider>
  );
}
