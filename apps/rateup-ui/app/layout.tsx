import type { Metadata, Viewport } from "next";

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
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { isProduction, rateupUrl } from "@/utils/constants";
import { geist, notoColorEmogi } from "@/utils/fonts";

import Providers from "./providers";

export const viewPort: Viewport = {
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  userScalable: false,
};

export const metadata: Metadata = {
  title: "RateUp #1 AI Powered Omnichannel Customer Engagement Platform",
  description:
    "RateUp is the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform. The only inbox for chat automation, collect feedback & build loyalty.",
  openGraph: {
    title: "RateUp #1 AI Powered Omnichannel Customer Engagement Platform",
    description:
      "RateUp is the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform. The only inbox for chat automation, collect feedback & build loyalty.",
  },
  metadataBase: new URL(rateupUrl),
  alternates: {
    canonical: "/",
  },
  verification: {
    other: {
      "p:domain_verify": "a755ff9896b0315145ef35f5fe011cf8",
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${geist.className},${notoColorEmogi.className}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.png" />
        {isProduction && <FacebookPixel />}
        <GoogleTagManager gtmId="GTM-NDC3D7DP" />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <Suspense fallback={<RateupLoader h={"100dvh"} />}>
            <Notifications />
            <SuperTokensProvider>
              <Providers locale={locale} messages={messages}>
                <ModalsProvider modals={allModalManagerModalsObj}>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    disableTransitionOnChange
                  >
                    {children}
                  </ThemeProvider>
                </ModalsProvider>
              </Providers>
            </SuperTokensProvider>
          </Suspense>
        </MantineProvider>
        <Toaster />
      </body>
    </html>
  );
}
