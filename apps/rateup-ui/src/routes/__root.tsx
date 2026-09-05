/* Preloaded below. Imported as URLs so Vite fingerprints them the same way it does the copies
   the stylesheet's `@font-face` rules point at — a different URL would download the face twice. */
import figtreeLatin from "@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2?url";
import instrumentSansLatin from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import ErrorPage from "@/components/error.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

import "keen-slider/keen-slider.min.css";

import Error from "@/components/not-found.tsx";
import { ThemeProvider } from "@/components/theme/theme-provider.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";
import { cn } from "@/lib/utils.ts";
import { cloudfrontOrigin, isProduction, rateupLogoOg, rateupUrl } from "@/utils/constants.ts";
import {
  FB_DOMAIN_VERIFICATION,
  FB_PIXEL_ID,
  GTM_ID,
  PINTEREST_VERIFICATION,
} from "@/utils/fbpixel.ts";

import { REDIRECT_MAP } from "../../redirects/index.ts";
import Providers from "../components/providers.tsx";

import baseCss from "../styles/base.css?url";

export interface RouterContext {
  /**
   * Exposed as an accessor rather than a QueryClient instance on purpose. The browser client is a
   * singleton that logout swaps out via `resetBrowserQueryClient()`, and the server builds a fresh
   * client per request — so a single captured instance would go stale after a logout and loaders
   * would prefetch into a cache nothing renders from. Call it inside the loader instead.
   */
  getQueryClient: () => QueryClient;
}

/**
 * GTM and the Meta Pixel, started after the page is interactive rather than during head parse.
 *
 * Both loaders used to run as blocking inline scripts in `<head>`, so every visitor paid for
 * two third-party connections before the first paint. Nothing on the site reads `dataLayer` or
 * `fbq` during render — the pixel helpers in `utils/fbpixel.ts` queue onto `fbq.queue`, which
 * the stub below still creates synchronously — so the loaders can wait for `load` and the
 * browser's idle time. Events fired before then are queued and flushed by the vendors' own
 * stubs, which is what they are designed for.
 */
const ANALYTICS_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
/* The standard gtag stub, defined synchronously so a consent update that happens before GTM
   finishes loading is queued onto dataLayer instead of being dropped with a console warning
   (which is what setGAConsent did whenever it ran early). */
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window,document);
fbq('consent', 'revoke');
fbq('init', ${FB_PIXEL_ID});
fbq('track', 'PageView');

function rateupLoadAnalytics() {
  var d = document, s = d.getElementsByTagName('script')[0];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var g = d.createElement('script');
  g.async = true;
  g.src = 'https://www.googletagmanager.com/gtm.js?id=${GTM_ID}';
  s.parentNode.insertBefore(g, s);

  var p = d.createElement('script');
  p.async = true;
  p.src = 'https://connect.facebook.net/en_US/fbevents.js';
  s.parentNode.insertBefore(p, s);
}

function rateupScheduleAnalytics() {
  if (window.requestIdleCallback) window.requestIdleCallback(rateupLoadAnalytics, { timeout: 3000 });
  else window.setTimeout(rateupLoadAnalytics, 1);
}

if (document.readyState === 'complete') rateupScheduleAnalytics();
else window.addEventListener('load', rateupScheduleAnalytics);
`;

export const Route = createRootRouteWithContext<RouterContext>()({
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
      // `/og-image.png` never existed and 404d on every page. `rateupLogoOg` is the real
      // CloudFront asset; `buildPageHead` overrides this per page.
      { property: "og:image", content: rateupLogoOg },

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
      { name: "twitter:image", content: rateupLogoOg },

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
      /* Every image, logo and screenshot on the marketing site is on this CloudFront
         distribution, and the LCP image is one of them — opening the connection while the HTML
         is still parsing takes the DNS/TLS handshake off the critical path. */
      { rel: "preconnect", href: cloudfrontOrigin, crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: cloudfrontOrigin },
      {
        rel: "stylesheet",
        href: baseCss,
      },
      /* The two faces every page renders text in. Without these the browser cannot discover
         them until it has fetched and parsed the stylesheet, which is a second round trip
         before any text can paint in the real font. `crossOrigin` is required on font preloads
         even same-origin, or the preload is ignored and the file is fetched twice. */
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: instrumentSansLatin,
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: figtreeLatin,
        crossOrigin: "anonymous",
      },
      {
        rel: "shortcut icon",
        href: "/favicon.png",
      },
    ],
    scripts: isProduction ? [{ children: ANALYTICS_BOOTSTRAP }] : [],
  }),
  errorComponent: ErrorPage,
  notFoundComponent: Error,
  shellComponent: RootLayout,
});

function RootLayout() {
  const { i18n } = useTranslation();
  /* The marketing site is written in English and is not translated — only the app is. Letting
     `lang` follow the i18n language there would tell a crawler the page is (say) Hindi while the
     copy stays English, which is worse than saying nothing. Hreflang belongs here too, but only
     once locale-prefixed URLs exist; today there is one URL per page. */
  const isMarketing = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === "/(marketing)"),
  });
  return (
    <html
      lang={isMarketing ? "en" : i18n.language}
      suppressHydrationWarning
      className={cn("h-full antialiased")}
    >
      <head>
        <HeadContent />
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
          <Suspense fallback={<RateupLoader className="h-dvh" />}>
            <Providers>
              <Outlet />
            </Providers>
          </Suspense>
          <Toaster richColors />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
