import LogoStrip from "../shared/LogoStrip";
import ProductClosing from "../shared/ProductClosing";
import ProductFaq from "../shared/ProductFaq";
import CampaignTabs from "./CampaignTabs";
import { BROADCAST_FAQS } from "./content";
import Hero from "./Hero";
import PricingNote from "./PricingNote";
import Problem from "./Problem";
import Showcase from "./Showcase";
import UseCases from "./UseCases";

export default function BroadcastPage() {
  return (
    <>
      <Hero />
      <Showcase />
      <LogoStrip />
      <Problem />
      <CampaignTabs />
      <UseCases />
      <PricingNote />
      <ProductFaq faqs={BROADCAST_FAQS} />
      <ProductClosing title="Ready to send your first broadcast?">
        Book a 20-minute demo, connect your number and send an approved template to your list the
        same day.
      </ProductClosing>
    </>
  );
}
