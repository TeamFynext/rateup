import { lazy, Suspense, useEffect, useState } from "react";

import { fbConsent } from "@/utils/fbpixel.ts";
import { setGAConsent } from "@/utils/gtag.ts";

import { CookieConsent } from "../ui/cookie-consent.tsx";
import DemoModal from "./helpers/BookDemoComponent";
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
}

export default function Layout({
  children,
  contentClassName,
  navbarClassName,
  footer = <HomePageFooter />,
}: Readonly<LayoutProps>) {
  const [likeWhatOpen, setLikeWhatOpen] = useState(false);
  const [bookDemoOpen, setBookDemoOpen] = useState(false);
  const [shouldShowLikeWhat, setShouldShowLikeWhat] = useState(false);

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
    if (!hasSeenPopup) {
      setShouldShowLikeWhat(true);
    }
  }, []);

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
    setBookDemoOpen(true);
  };

  const handleLikeWhatWhatsapp = () => {
    globalThis.localStorage.setItem("likeWhatUSeeShown", "true");
    setLikeWhatOpen(false);
  };

  return (
    <div className={`relative w-full ${contentClassName} ${navbarClassName}`}>
      <header className={`sticky top-0 z-50 ${contentClassName ? "" : styles.themeDefault}`}>
        <RateupNavbar />
      </header>
      <main>{children}</main>
      {footer}
      <Suspense fallback={null}>
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
      <DemoModal open={bookDemoOpen} onClose={() => setBookDemoOpen(false)} />
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
