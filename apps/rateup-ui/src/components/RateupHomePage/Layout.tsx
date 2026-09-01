import { useNavigate, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

import { fbConsent } from "@/utils/fbpixel.ts";
import { setGAConsent } from "@/utils/gtag.ts";

import { CookieConsent } from "../ui/cookie-consent.tsx";
import { BOOK_DEMO_ROUTE } from "./helper/BookDemoLink";
import LikeWhatUSee from "./helpers/LikeWhatUSee";
import HomePageFooter from "./shared/HomePageFooter";
import RateupNavbar from "./shared/RateupNavbar";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const SupportWidget = lazy(() => import("@/components/app&services/support-widget.tsx"));

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
  const [likeWhatOpen, setLikeWhatOpen] = useState(false);
  const [shouldShowLikeWhat, setShouldShowLikeWhat] = useState(false);
  const navigate = useNavigate();

  /* `/book-a-demo` IS the lead form, so the lead popup would only re-offer what is already on
     screen. Read the path off the router so this holds wherever `Layout` is used. */
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isDemoPage = pathname.replace(/\/+$/, "") === BOOK_DEMO_ROUTE;

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

  // Popup logic
  useEffect(() => {
    const hasSeenPopup = globalThis.localStorage.getItem("likeWhatUSeeShown");
    if (!hasSeenPopup && !isDemoPage) {
      setShouldShowLikeWhat(true);
    }
  }, [isDemoPage]);

  useEffect(() => {
    if (!shouldShowLikeWhat) return;

    const timer = globalThis.setTimeout(() => {
      setLikeWhatOpen(true);
      globalThis.localStorage.setItem("likeWhatUSeeShown", "true");
    }, 20000);

    return () => globalThis.clearTimeout(timer);
  }, [shouldShowLikeWhat]);

  const handleLikeWhatOpenChange = (open: boolean) => {
    if (!open) {
      globalThis.localStorage.setItem("likeWhatUSeeShown", "true");
    }
    setLikeWhatOpen(open);
  };

  const handleLikeWhatBookDemo = () => {
    globalThis.localStorage.setItem("likeWhatUSeeShown", "true");
    setLikeWhatOpen(false);
    navigate({ to: BOOK_DEMO_ROUTE });
  };

  const handleLikeWhatWhatsapp = () => {
    globalThis.localStorage.setItem("likeWhatUSeeShown", "true");
    setLikeWhatOpen(false);
  };

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
             Matches the real launcher's tile — 62px, 18px radius, same offsets. */
          <div
            role="status"
            aria-label="Loading support chat"
            className="fixed right-5.5 bottom-5.5 z-50 size-15.5 animate-pulse rounded-[18px] bg-muted"
          />
        }
      >
        <SupportWidget
          orgId={import.meta.env.VITE_ROOT_ORG || ""}
          token={import.meta.env.VITE_ROOT_TOKEN || ""}
        />
      </Suspense>
      <LikeWhatUSee
        open={likeWhatOpen}
        onOpenChange={handleLikeWhatOpenChange}
        onBookDemo={handleLikeWhatBookDemo}
        onWhatsapp={handleLikeWhatWhatsapp}
      />
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
