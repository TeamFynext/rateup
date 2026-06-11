import { useEffect } from "react";

import { createFileRoute } from "@tanstack/react-router";

import BusinessSection from "@/components/products/whatsapp-feedback/BusinessSection";
import CTASection from "@/components/products/whatsapp-feedback/CTASection";
import FAQSection from "@/components/products/whatsapp-feedback/FAQSection";
import style from "@/components/products/whatsapp-feedback/feedback.module.css";
import Hero from "@/components/products/whatsapp-feedback/Hero";
import LogosBand from "@/components/products/whatsapp-feedback/LogosBand";
import ProblemSection from "@/components/products/whatsapp-feedback/ProblemSection";
import SolutionSection from "@/components/products/whatsapp-feedback/SolutionSection";
import StatsBand from "@/components/products/whatsapp-feedback/StatsBand";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productsMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

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
    globalThis.document
      .querySelectorAll(`.${style.reveal}`)
      .forEach((el) => revObs.observe(el));
    return () => revObs.disconnect();
  }, []);

  return (
    <Layout contentClassName={styles.themeFeedback}>
      <span id="top" />
      <Hero />
      <LogosBand />
      <ProblemSection />
      <StatsBand />
      <SolutionSection />
      <BusinessSection />
      <FAQSection />
      <CTASection />
    </Layout>
  );
}
