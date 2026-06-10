import { lazy, Suspense, useEffect, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import BusinessSection from "@/components/products/whatsapp-feedback/BusinessSection";
import CTASection from "@/components/products/whatsapp-feedback/CTASection";
import FAQSection from "@/components/products/whatsapp-feedback/FAQSection";
import style from "@/components/products/whatsapp-feedback/feedback.module.css";
import Footer from "@/components/products/whatsapp-feedback/Footer";
import Hero from "@/components/products/whatsapp-feedback/Hero";
import LogosBand from "@/components/products/whatsapp-feedback/LogosBand";
import Navbar from "@/components/products/whatsapp-feedback/Navbar";
import ProblemSection from "@/components/products/whatsapp-feedback/ProblemSection";
import SolutionSection from "@/components/products/whatsapp-feedback/SolutionSection";
import StatsBand from "@/components/products/whatsapp-feedback/StatsBand";
import LikeWhatUSee from "@/components/RateupHomePage/helpers/LikeWhatUSee";
import { productsMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const SupportWidget = lazy(
  () => import("@/components/app&services/support-widget.tsx"),
);
export const Route = createFileRoute(
  "/(marketing)/products/whatsapp-feedback/",
)({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: WhatsappFeedback,
});
function WhatsappFeedback() {
  useEffect(() => {
    const revObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(style.in);
            revObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    document
      .querySelectorAll(`.${style.reveal}`)
      .forEach((el) => revObs.observe(el));
    return () => revObs.disconnect();
  }, []);
  const [likeWhatOpen, setLikeWhatOpen] = useState(false);
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
  };

  const handleLikeWhatWhatsapp = () => {
    window.localStorage.setItem("likeWhatUSeeShown", "true");
    setLikeWhatOpen(false);
  };
  return (
    <>
      <Navbar />
      <span id="top" />
      <Hero />
      <LogosBand />
      <ProblemSection />
      <StatsBand />
      <SolutionSection />
      <BusinessSection />
      <FAQSection />
      <CTASection />
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
    </>
  );
}
