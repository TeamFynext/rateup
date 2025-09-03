import type { Metadata } from "next";

import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/nprogress/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";
import "keen-slider/keen-slider.min.css";
import "./globals.css";

import { Suspense } from "react";

import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { GoogleTagManager } from "@next/third-parties/google";
import { getLocale, getMessages } from "next-intl/server";

import { theme } from "@/config/mantineTheme";
import FacebookPixel from "@/components/Analytics/FacebookPixel";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { allModalManagerModalsObj } from "@/components/Modal/ModalManagerModals/allModalManagerModalsObj";
import { SuperTokensProvider } from "@/components/SuperToken/supertokensProvider";
import { isProduction } from "@/utils/constants";
import { geist, notoColorEmogi } from "@/utils/fonts";

import Providers from "./providers";

export const metadata: Metadata = {
  title: "Rateup",
  description: "Welcome to Rateup",
};
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.png" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        {isProduction && <FacebookPixel />}
      </head>
      <body className={`${geist.className},${notoColorEmogi.className}`}>
        <MantineProvider theme={theme}>
          <Suspense fallback={<RateupLoader h={"100dvh"} />}>
            <Notifications />
            <SuperTokensProvider>
              <Providers locale={locale} messages={messages}>
                <ModalsProvider modals={allModalManagerModalsObj}>
                  {children}
                </ModalsProvider>
              </Providers>
              <GoogleTagManager gtmId="GTM-NDC3D7DP" />
            </SuperTokensProvider>
          </Suspense>
        </MantineProvider>
      </body>
    </html>
  );
}
