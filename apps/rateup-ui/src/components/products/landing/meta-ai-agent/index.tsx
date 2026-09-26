import ProductClosing from "../shared/ProductClosing";
import ProductFaq from "../shared/ProductFaq";
import { AGENT_FAQS } from "./content";
import Features from "./Features";
import Hero from "./Hero";
import Insights from "./Insights";
import Problem from "./Problem";
import Setup from "./Setup";
import Showcase from "./Showcase";

export default function MetaAiAgentPage() {
  return (
    <>
      <Hero />
      <Showcase />
      <Problem />
      <Setup />
      <Features />
      <Insights />
      <ProductFaq faqs={AGENT_FAQS} />
      <ProductClosing title="Ready to let the easy questions answer themselves?">
        Book a 20-minute demo and we'll check your number's eligibility with Meta together.
      </ProductClosing>
    </>
  );
}
