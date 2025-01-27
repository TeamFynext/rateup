import type { Metadata } from "next";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";

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
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <ColorSchemeScript nonce="8IBTHwOdqNKAWeKl7plt8g==" />
        <link rel="shortcut icon" href="/favicon.png" />
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
