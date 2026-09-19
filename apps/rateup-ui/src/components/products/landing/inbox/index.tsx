import HeroBackground from "@/components/RateupHomePage/shared/hero-bg/HeroBackground";
import { ClosingCta } from "@/components/RateupHomePage/shared/home-ui";

import Analytics from "./Analytics";
import Faq from "./Faq";
import Features from "./Features";
import Hero from "./Hero";
import InboxShowcase from "./InboxShowcase";
import Integrations from "./Integrations";
import Lifecycle from "./Lifecycle";
import Problem from "./Problem";

export default function InboxPage() {
  return (
    <>
      <Hero />
      <InboxShowcase />
      <Problem />
      <Lifecycle />
      <Features />
      <Analytics />
      <Integrations />
      <Faq />
      <ClosingCta
        id="demo"
        eyebrow="Trusted by 100+ brands across 30+ countries"
        title="Ready to give every conversation an owner?"
        decoration={<HeroBackground className="opacity-45" />}
      >
        Book a 20-minute demo, or message us on WhatsApp — the same channel your customers will be
        using.
      </ClosingCta>
    </>
  );
}
