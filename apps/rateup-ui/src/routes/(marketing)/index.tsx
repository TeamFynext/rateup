"use client";

import { lazy, Suspense, useEffect, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import DemoModal from "@/components/RateupHomePage/helpers/BookDemoComponent";
import LikeWhatUSee from "@/components/RateupHomePage/helpers/LikeWhatUSee";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import Features from "@/components/RateupHomePage/shared/Features";
import HeroSectionNew from "@/components/RateupHomePage/shared/HeroSectionNew";
import HomePageFooter from "@/components/RateupHomePage/shared/HomePageFooter";
import HowItWorks from "@/components/RateupHomePage/shared/HowItWorks";
import LoyaltySection from "@/components/RateupHomePage/shared/LoyaltySection";
import Problem from "@/components/RateupHomePage/shared/Problem";
import TrustedBy from "@/components/RateupHomePage/shared/TrustedBy";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

import { homepageMarkdown } from "../../markdown/homepage";
import { createMarkdownMiddleware } from "../../markdown/serveMarkdown";

const SupportWidget = lazy(
  () => import("@/components/app&services/support-widget.tsx"),
);
const setApiCatalogHeader = createServerFn().handler(async () => {
  setResponseHeader(
    "Link",
    '</.well-known/api-catalog>; rel="api-catalog", <https://docs.rateup.app>; rel="service-doc"',
  );
});

const homePageJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RateUp",
  url: "https://rateup.app",
  logo: "https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg",
  description:
    "RateUp is an AI-powered omnichannel customer engagement platform that integrates WhatsApp Business API, feedback, loyalty, chat automation, and a unified inbox to help businesses boost retention and repeat sales.",
  foundingDate: "2023",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@rateup.app",
    },
  ],
  sameAs: [
    "https://www.linkedin.com/company/rateupapp",
    "https://twitter.com/rateupapp",
    "https://www.instagram.com/rateupapp",
    "https://www.facebook.com/rateupapp",
    "https://www.threads.com/@rateupsoftware",
    "https://www.youtube.com/@TeamRateup",
  ],
  brand: {
    "@type": "Brand",
    name: "RateUp",
    logo: "https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    reviewCount: "3987",
    bestRating: "5",
  },
};

export const Route = createFileRoute("/(marketing)/")({
  server: {
    middleware: [createMarkdownMiddleware(homepageMarkdown)],
  },
  component: RouteComponent,
  loader: async () => {
    await setApiCatalogHeader();
    return null;
  },
  head: () => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(homePageJsonLd),
      },
    ],
  }),
});

function useScrollReveal() {
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
  }, []);
}

function RouteComponent() {
  const [likeWhatOpen, setLikeWhatOpen] = useState(false);
  const [bookDemoOpen, setBookDemoOpen] = useState(false);
  const [shouldShowLikeWhat, setShouldShowLikeWhat] = useState(false);

  useScrollReveal();

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
    <>
      <Layout contentClassName={styles.theme} footer={<HomePageFooter />}>
        <HeroSectionNew />
        <TrustedBy />
        <Problem />
        <HowItWorks />
        <Features />
        <LoyaltySection />
        <Suspense fallback={null}>
          <SupportWidget
            orgId={import.meta.env.VITE_ROOT_ORG || ""}
            token={import.meta.env.VITE_ROOT_TOKEN || ""}
          />
        </Suspense>
      </Layout>
      <LikeWhatUSee
        open={likeWhatOpen}
        onOpenChange={handleLikeWhatOpenChange}
        onBookDemo={handleLikeWhatBookDemo}
        onWhatsapp={handleLikeWhatWhatsapp}
      />
      <DemoModal open={bookDemoOpen} onClose={() => setBookDemoOpen(false)} />
    </>
  );
}
