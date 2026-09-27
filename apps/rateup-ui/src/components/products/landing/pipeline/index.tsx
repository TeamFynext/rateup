import ProductClosing from "../shared/ProductClosing";
import ProductFaq from "../shared/ProductFaq";
import Connected from "./Connected";
import { PIPELINE_FAQS } from "./content";
import Features from "./Features";
import Flow from "./Flow";
import Hero from "./Hero";
import Insights from "./Insights";
import Integrations from "./Integrations";
import Problem from "./Problem";
import Showcase from "./Showcase";

export default function PipelinePage() {
  return (
    <>
      <Hero />
      <Showcase />
      <Problem />
      <Flow />
      <Connected />
      <Features />
      <Insights />
      <Integrations />
      <ProductFaq faqs={PIPELINE_FAQS} />
      <ProductClosing title="Ready to stop losing leads in the chat list?">
        Book a 20-minute demo and we'll set up your Leads board on your own WhatsApp number.
      </ProductClosing>
    </>
  );
}
