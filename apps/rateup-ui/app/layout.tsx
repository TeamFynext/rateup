import type { Metadata } from "next";

import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";

import "./globals.css";

import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";

import { theme } from "@/config/mantineTheme";
import FacebookPixel from "@/components/Analytics/FacebookPixel";
import GoogleAnalytics from "@/components/Analytics/GoogleAnalytics";
import { allModalManagerModalsObj } from "@/components/Modal/ModalManagerModals/allModalManagerModalsObj";
import { SuperTokensProvider } from "@/components/SuperToken/supertokensProvider";
import { isProduction } from "@/utils/constants";
import { geist, notoColorEmogi } from "@/utils/fonts";

import Providers from "./providers";

export const metadata: Metadata = {
  title: "Rateup",
  description: "Welcome to Rateup",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.png" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        {isProduction && (
          <>
            <GoogleAnalytics />
            <FacebookPixel />
          </>
        )}
      </head>
      <body className={`${geist.className},${notoColorEmogi.className}`}>
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications />
            <SuperTokensProvider>
              <Providers>{children}</Providers>
            </SuperTokensProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
