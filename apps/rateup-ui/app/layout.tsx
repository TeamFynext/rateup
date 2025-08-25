import type { Metadata } from "next";

import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";

import "@mantine/core/styles.css";
import "./globals.css";

import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { GoogleTagManager } from "@next/third-parties/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { theme } from "@/config/mantineTheme";
import FacebookPixel from "@/components/Analytics/FacebookPixel";
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
  function onError(error) {
    if (
      error.code === "MISSING_MESSAGE" &&
      process.env.NODE_ENV === "production"
    )
      return;
    console.error(error);
  }
  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.png" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        {isProduction && (
          <>
            <FacebookPixel />
          </>
        )}
      </head>
      <body className={`${geist.className},${notoColorEmogi.className}`}>
        <NextIntlClientProvider onError={onError}>
          <MantineProvider theme={theme}>
            <ModalsProvider>
              <Notifications />
              <SuperTokensProvider>
                <Providers>{children}</Providers>
                <GoogleTagManager gtmId="GTM-NDC3D7DP" />
              </SuperTokensProvider>
            </ModalsProvider>
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
