import { lazy, Suspense, useEffect } from "react";

import { fbConsent } from "@/utils/fbpixel.ts";
import { setGAConsent } from "@/utils/gtag.ts";

import { CookieConsent } from "../ui/cookie-consent.tsx";
import HomePageFooter from "./shared/HomePageFooter";
import RateupNavbar from "./shared/RateupNavbar";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const SupportWidget = lazy(() => import("@/components/app&services/support-widget.tsx"));

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
   conversation without having to find the launcher. The widget only does this once a session. */
const SUPPORT_AUTO_OPEN_MS = 5000;

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
      <Suspense
        fallback={
          /* Placeholder launcher so the corner reserves its space instead of popping in.
             Matches the real launcher's tile — 62px, circular, same offsets. */
          <div
            role="status"
            aria-label="Loading support chat"
            className="fixed right-5.5 bottom-5.5 z-50 size-15.5 animate-pulse rounded-full bg-muted"
          />
        }
      >
        <SupportWidget
          orgId={import.meta.env.VITE_ROOT_ORG || ""}
          token={import.meta.env.VITE_ROOT_TOKEN || ""}
          icebreakers={RATEUP_ICEBREAKERS}
          autoOpenDelayMs={SUPPORT_AUTO_OPEN_MS}
        />
      </Suspense>
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
