import LogoStrip from "../shared/LogoStrip";
import ProductClosing from "../shared/ProductClosing";
import ProductFaq from "../shared/ProductFaq";
import { LOYALTY_FAQS } from "./content";
import Features from "./Features";
import Hero from "./Hero";
import Integrations from "./Integrations";
import Overview from "./Overview";
import Problem from "./Problem";
import Setup from "./Setup";
import Showcase from "./Showcase";

export default function LoyaltyPage() {
  return (
    <>
      <Hero />
      <Showcase />
      <LogoStrip />
      <Problem />
      <Setup />
      <Features />
      <Overview />
      <Integrations />
      <ProductFaq faqs={LOYALTY_FAQS} />
      <ProductClosing title="Ready to turn one-time buyers into regulars?">
        Book a 20-minute demo and we'll set up your programme on your own WhatsApp number.
      </ProductClosing>
    </>
  );
}
