import ProductClosing from "../shared/ProductClosing";
import ProductFaq from "../shared/ProductFaq";
import Analytics from "./Analytics";
import { INBOX_FAQS } from "./content";
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
      <ProductFaq faqs={INBOX_FAQS} />
      <ProductClosing title="Ready to give every conversation an owner?">
        Book a 20-minute demo, or message us on WhatsApp — the same channel your customers will be
        using.
      </ProductClosing>
    </>
  );
}
