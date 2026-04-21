import type { Metadata, Viewport } from "next";

import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";
import "keen-slider/keen-slider.min.css";
import "react-phone-number-input/style.css";
import "./globals.css";

import { Suspense } from "react";

import { GoogleTagManager } from "@next/third-parties/google";
import { getLocale, getMessages } from "next-intl/server";

import { theme } from "@/config/mantineTheme";
import { cn } from "@/lib/utils";
import FacebookPixel from "@/components/Analytics/FacebookPixel";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { isProduction, rateupUrl } from "@/utils/constants";
import { inter, notoColorEmogi } from "@/utils/fonts";

import Providers from "./providers";

async function LocaleProviders({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <Providers locale={locale} messages={messages}>
      {children}
    </Providers>
  );
}

export const viewport: Viewport = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        inter.className,
        notoColorEmogi.className,
        "font-sans",
        inter.variable,
        "h-full antialiased",
      )}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.png" />
        <meta
          name="facebook-domain-verification"
          content="f2o3kii5sp01a6xx6axifkbk7aegai"
        />
        {isProduction && <FacebookPixel />}
        <GoogleTagManager gtmId="GTM-NDC3D7DP" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <MantineProvider theme={theme}>
            <Suspense fallback={<RateupLoader h={"100dvh"} />}>
              <LocaleProviders>{children}</LocaleProviders>
            </Suspense>
          </MantineProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
