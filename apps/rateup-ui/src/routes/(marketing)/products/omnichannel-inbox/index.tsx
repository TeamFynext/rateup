import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import Comparison from "@/components/products/OmnichannelInbox/Comparison";
import CTABand from "@/components/products/OmnichannelInbox/CTABand";
import Features from "@/components/products/OmnichannelInbox/Features";
import Footer from "@/components/products/OmnichannelInbox/Footer";
import Hero from "@/components/products/OmnichannelInbox/Hero";
import HowItWorks from "@/components/products/OmnichannelInbox/HowItWorks";
import Integrations from "@/components/products/OmnichannelInbox/Integrations";
import Nav from "@/components/products/OmnichannelInbox/Nav";
import Problem from "@/components/products/OmnichannelInbox/Problem";
import ProductIntro from "@/components/products/OmnichannelInbox/ProductIntro";
import SocialProof from "@/components/products/OmnichannelInbox/SocialProof";
import UseCases from "@/components/products/OmnichannelInbox/UseCases";
import LikeWhatUSee from "@/components/RateupHomePage/helpers/LikeWhatUSee";

const SupportWidget = lazy(
  () => import("@/components/app&services/support-widget.tsx"),
);

export const Route = createFileRoute(
  "/(marketing)/products/omnichannel-inbox/",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const [accessOpen, setAccessOpen] = useState(false);
  const [funnelOpen, setFunnelOpen] = useState(false);
  const funnelShown = useRef(false);

  useEffect(() => {
    let started = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (funnelShown.current) return;
        if (accessOpen) {
          schedule();
          return;
        }
        funnelShown.current = true;
        try {
          sessionStorage.setItem("ru_inbox_funnel", "1");
        } catch {}
        setFunnelOpen(true);
      }, 10000);
    };

    const onFirstScroll = () => {
      if (started || window.scrollY < 40) return;
      started = true;
      window.removeEventListener("scroll", onFirstScroll);
      schedule();
    };

    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem("ru_inbox_funnel") === "1";
    } catch {}
    if (!alreadySeen)
      window.addEventListener("scroll", onFirstScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onFirstScroll);
      clearTimeout(timer);
    };
  }, [accessOpen]);

  // Reveal on scroll
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -5% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const openAccess = () => setAccessOpen(true);
  const [likeWhatOpen, setLikeWhatOpen] = useState(false);
  const [bookDemoOpen, setBookDemoOpen] = useState(false);
  const [shouldShowLikeWhat, setShouldShowLikeWhat] = useState(false);
  useEffect(() => {
    const hasSeenPopup = window.localStorage.getItem("likeWhatUSeeShown");
    if (!hasSeenPopup) {
      setShouldShowLikeWhat(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldShowLikeWhat) return;

    const timer = window.setTimeout(() => {
      setLikeWhatOpen(true);
      window.localStorage.setItem("likeWhatUSeeShown", "true");
    }, 20000);

    return () => window.clearTimeout(timer);
  }, [shouldShowLikeWhat]);

  const handleLikeWhatOpenChange = (open: boolean) => {
    if (!open) {
      window.localStorage.setItem("likeWhatUSeeShown", "true");
    }
    setLikeWhatOpen(open);
  };

  const handleLikeWhatBookDemo = () => {
    window.localStorage.setItem("likeWhatUSeeShown", "true");
    setLikeWhatOpen(false);
    setBookDemoOpen(true);
  };

  const handleLikeWhatWhatsapp = () => {
    window.localStorage.setItem("likeWhatUSeeShown", "true");
    setLikeWhatOpen(false);
  };
  return (
    <div className="min-h-screen" style={{ background: "#071A33" }}>
      <Nav onAccess={openAccess} />
      <Hero onAccess={openAccess} />
      <SocialProof />
      <Problem />
      <ProductIntro />
      <Features />
      <Integrations />
      <HowItWorks />
      <UseCases />
      <Comparison />
      <CTABand onAccess={openAccess} />
      <Footer />
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
    </div>
  );
}
