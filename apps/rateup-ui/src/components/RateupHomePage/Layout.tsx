import { lazy, Suspense, useEffect, useState } from "react";

import { NUDGED_KEY, SupportLauncher } from "@/components/app&services/support-launcher.tsx";
import { fbConsent } from "@/utils/fbpixel.ts";
import { setGAConsent } from "@/utils/gtag.ts";

import { CookieConsent } from "../ui/cookie-consent.tsx";
import HomePageFooter from "./shared/HomePageFooter";
import RateupNavbar from "./shared/RateupNavbar";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const loadSupportWidget = () => import("@/components/app&services/support-widget.tsx");
const SupportWidget = lazy(loadSupportWidget);

const SUPPORT_TOKEN = import.meta.env.VITE_SUPPORT_WIDGET_KEY || "";

/**
 * Openers for RateUp's own site. The widget's built-in defaults are written for the shops that
 * embed it, where the visitor is a customer chasing an order; here the visitor is a prospect
 * sizing up the product, so they ask about the product instead.
 */
const RATEUP_ICEBREAKERS = [
  "Can I sell without a website?",
  "Does it work with my Shopify store?",
  "What does it cost?",
  "Can I book a demo?",
];

const SUPPORT_NUDGE = "Questions about selling on WhatsApp? Ask us here.";

/**
 * The nudge waits until the visitor has scrolled past the first screen: an open panel or a
 * bubble over the hero on a phone covers the one thing they came to read. Once a session.
 */
function useScrollNudge() {
  const [nudging, setNudging] = useState(false);

  useEffect(() => {
    if (!SUPPORT_TOKEN || sessionStorage.getItem(NUDGED_KEY)) return;

    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.9) return;
      window.removeEventListener("scroll", onScroll);
      sessionStorage.setItem(NUDGED_KEY, "true");
      setNudging(true);
      void loadSupportWidget();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return [nudging, () => setNudging(false)] as const;
}

/**
 * Draws the widget's launcher without the widget, which is fetched on hover, on click, or
 * when the nudge appears — and mounted already open, since each way in means the visitor is
 * about to see the panel.
 */
function SupportCorner() {
  const [mounted, setMounted] = useState(false);
  const [nudging, dismissNudge] = useScrollNudge();

  if (!SUPPORT_TOKEN) return null;

  const launcher = (
    <SupportLauncher
      onOpen={() => {
        dismissNudge();
        setMounted(true);
      }}
      onIntent={() => void loadSupportWidget()}
      nudge={nudging ? SUPPORT_NUDGE : undefined}
      onDismissNudge={dismissNudge}
    />
  );
  if (!mounted) return launcher;

  return (
    <Suspense fallback={launcher}>
      <SupportWidget token={SUPPORT_TOKEN} icebreakers={RATEUP_ICEBREAKERS} defaultOpen />
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
