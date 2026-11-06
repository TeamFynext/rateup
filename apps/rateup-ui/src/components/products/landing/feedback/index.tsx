import ProductClosing from "../shared/ProductClosing";
import ProductFaq from "../shared/ProductFaq";
import { FEEDBACK_FAQS } from "./content";
import Features from "./Features";
import Hero from "./Hero";
import HowItRuns from "./HowItRuns";
import Integrations from "./Integrations";
import Problem from "./Problem";
import Results from "./Results";
import Showcase from "./Showcase";

export default function FeedbackPage() {
  return (
    <>
      <Hero />
      <Showcase />
      <Problem />
      <HowItRuns />
      <Features />
      <Results />
      <Integrations />
      <ProductFaq faqs={FEEDBACK_FAQS} />
      <ProductClosing title="Ready to hear from every customer?">
        Book a 20-minute demo and we'll set up your first feedback form on your own WhatsApp number.
      </ProductClosing>
    </>
  );
}
