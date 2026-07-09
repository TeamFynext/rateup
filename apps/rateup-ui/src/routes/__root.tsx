import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { createRootRoute, HeadContent, Outlet, redirect, Scripts } from "@tanstack/react-router";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import ErrorPage from "@/components/error.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import Error from "@/components/not-found.tsx";
import { ThemeProvider } from "@/components/theme/theme-provider.tsx";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";
import "keen-slider/keen-slider.min.css";
import "react-phone-number-input/style.css";

import { Toaster } from "@/components/ui/sonner.tsx";
import { theme } from "@/config/mantineTheme.ts";
import { cn } from "@/lib/utils.ts";
import { isProduction, rateupUrl } from "@/utils/constants.ts";
import {
  FB_DOMAIN_VERIFICATION,
  FB_PIXEL_ID,
  GTM_ID,
  PINTEREST_VERIFICATION,
} from "@/utils/fbpixel.ts";

import { REDIRECT_MAP } from "../../redirects/index.ts";
import Providers from "../components/providers.tsx";

import appCss from "../globals.css?url";

function LocaleProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Providers>{children}</Providers>;
}

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    // Check if the current path matches any redirect rule in REDIRECT_MAP
    const rule = REDIRECT_MAP[location.pathname];

    if (rule) {
      throw redirect({
        href: rule.to,
        statusCode: rule.statusCode ?? 301,
      });
    }
  },
  head: () => ({
    meta: [
      {
        title: "RateUp #1 AI Powered Omnichannel Customer Engagement Platform",
      },
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content:
          "RateUp is the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform. The only inbox for chat automation, collect feedback & build loyalty.",
      },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "RateUp" },
      { property: "og:url", content: rateupUrl },
      {
        property: "og:title",
        content: "RateUp #1 AI Powered Omnichannel Customer Engagement Platform",
      },
      {
        property: "og:description",
        content:
          "RateUp is the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform. The only inbox for chat automation, collect feedback & build loyalty.",
      },
      { property: "og:image", content: `${rateupUrl}/og-image.png` },

      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: rateupUrl },
      {
        name: "twitter:title",
        content: "RateUp #1 AI Powered Omnichannel Customer Engagement Platform",
      },
      {
        name: "twitter:description",
        content:
          "RateUp is the #1 AI-powered WhatsApp Business API & omnichannel customer engagement platform. The only inbox for chat automation, collect feedback & build loyalty.",
      },
      { name: "twitter:image", content: `${rateupUrl}/og-image.png` },

      {
        name: "p:domain_verify",
        content: PINTEREST_VERIFICATION,
      },
      {
        name: "facebook-domain-verification",
        content: FB_DOMAIN_VERIFICATION,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "shortcut icon",
        href: "/favicon.png",
      },
    ],
    scripts: [
      isProduction && {
        children: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `,
      },
      // Facebook Pixel
      isProduction && {
        children: `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('consent', 'revoke');
        fbq('init', ${FB_PIXEL_ID});
        fbq('track', 'PageView');
        `,
      },
    ],
  }),
  errorComponent: ErrorPage,
  notFoundComponent: Error,
  shellComponent: RootLayout,
});

function RootLayout() {
  const { i18n } = useTranslation();
  return (
    <html lang={i18n.language} suppressHydrationWarning className={cn("h-full antialiased")}>
      <head>
        <HeadContent />
        <ColorSchemeScript />
      </head>
      <body>
        {isProduction ? (
          <>
            {/* GTM noscript fallback — must be first thing in body */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="GTM noscript"
              />
            </noscript>

            {/* Facebook Pixel noscript fallback */}
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
                alt="Facebook Pixel noscript"
              />
            </noscript>
          </>
        ) : null}

        <ThemeProvider defaultTheme="light" storageKey="theme">
          <MantineProvider theme={theme}>
            <Suspense fallback={<RateupLoader h={"100dvh"} />}>
              <LocaleProviders>
                <Outlet />
              </LocaleProviders>
            </Suspense>
          </MantineProvider>
          <Toaster richColors />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
