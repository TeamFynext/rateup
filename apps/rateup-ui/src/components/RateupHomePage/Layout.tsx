import { lazy, Suspense, useEffect, useState } from "react";

import { AUTO_OPENED_KEY, SupportLauncher } from "@/components/app&services/support-launcher.tsx";
import { fbConsent } from "@/utils/fbpixel.ts";
import { setGAConsent } from "@/utils/gtag.ts";

import { CookieConsent } from "../ui/cookie-consent.tsx";
import HomePageFooter from "./shared/HomePageFooter";
import RateupNavbar from "./shared/RateupNavbar";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const loadSupportWidget = () => import("@/components/app&services/support-widget.tsx");
const SupportWidget = lazy(loadSupportWidget);

const SUPPORT_ORG = import.meta.env.VITE_ROOT_ORG || "";
const SUPPORT_TOKEN = import.meta.env.VITE_ROOT_TOKEN || "";

/**
 * Openers for RateUp's own site. The widget's built-in defaults are written for the shops that
 * embed it, where the visitor is a customer chasing an order; here the visitor is a prospect
 * sizing up the product, so they ask about the product instead.
 */
const RATEUP_ICEBREAKERS = [
  "How does RateUp work with my store?",
  "What does it cost?",
  "Can I book a demo?",
];

/* The support panel opens itself shortly after the page settles, so a prospect is offered a
   conversation without having to find the launcher. Only once a session. */
const SUPPORT_AUTO_OPEN_MS = 5000;

/**
 * Draws the widget's launcher without the widget, which is fetched on hover,
 * on click, or once the page is idle when the session's auto-open is still due — and mounted
 * already open, since both ways in mean the visitor is about to see the panel.
 */
function SupportCorner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!SUPPORT_ORG || !SUPPORT_TOKEN || sessionStorage.getItem(AUTO_OPENED_KEY)) return;

    let idle = 0;
    const prefetch = () => {
      if (typeof requestIdleCallback === "function") {
        idle = requestIdleCallback(() => void loadSupportWidget(), { timeout: 2000 });
      } else void loadSupportWidget();
    };
    if (document.readyState === "complete") prefetch();
    else window.addEventListener("load", prefetch, { once: true });

    const timer = setTimeout(() => {
      sessionStorage.setItem(AUTO_OPENED_KEY, "true");
      setMounted(true);
    }, SUPPORT_AUTO_OPEN_MS);

    return () => {
      window.removeEventListener("load", prefetch);
      if (idle) cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, []);

  if (!SUPPORT_ORG || !SUPPORT_TOKEN) return null;

  const launcher = (
    <SupportLauncher
      onOpen={() => {
        sessionStorage.setItem(AUTO_OPENED_KEY, "true");
        setMounted(true);
      }}
      onIntent={() => void loadSupportWidget()}
    />
  );
  if (!mounted) return launcher;

  return (
    <Suspense fallback={launcher}>
      <SupportWidget
        orgId={SUPPORT_ORG}
        token={SUPPORT_TOKEN}
        icebreakers={RATEUP_ICEBREAKERS}
        defaultOpen
      />
    </Suspense>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  isBlog?: boolean;
  contentClassName?: string;
  navbarClassName?: string;
  footer?: React.ReactNode;
  /** Replaces the marketing navbar — `/book-a-demo` swaps in its own slim chrome. */
  navbar?: React.ReactNode;
  /**
   * A bar pinned above the navbar, inside the same sticky header — the tools switcher uses
   * it. Anything sticky rendered into `children` instead would pin to `top: 0` alongside the
   * header and cover it, since both share that line.
   */
  subheader?: React.ReactNode;
}

export default function Layout({
  children,
  contentClassName,
  navbarClassName,
  footer = <HomePageFooter />,
  navbar,
  subheader,
}: Readonly<LayoutProps>) {
  // Scroll reveal animation observer
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );

    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [children]);

  return (
    <div className={`relative w-full ${contentClassName} ${navbarClassName}`}>
      <header className={`sticky top-0 z-50 ${contentClassName ? "" : styles.themeDefault}`}>
        {subheader}
        {navbar ?? <RateupNavbar />}
      </header>
      <main>{children}</main>
      {footer}
      <SupportCorner />
      <CookieConsent
        variant="small"
        onAcceptCallback={() => {
          setGAConsent("granted");
          fbConsent("grant");
        }}
        onDeclineCallback={() => {
          setGAConsent("denied");
          fbConsent("revoke");
        }}
      />
    </div>
  );
}
