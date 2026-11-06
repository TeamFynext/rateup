import ProductClosing from "../shared/ProductClosing";
import ProductFaq from "../shared/ProductFaq";
import Connected from "./Connected";
import { COMMERCE_FAQS } from "./content";
import Features from "./Features";
import Flow from "./Flow";
import Hero from "./Hero";
import Integrations from "./Integrations";
import Orders from "./Orders";
import Payments from "./Payments";
import Problem from "./Problem";
import Showcase from "./Showcase";
import WorksWith from "./WorksWith";

export default function SocialCommercePage() {
  return (
    <>
      <Hero />
      <Showcase />
      <WorksWith />
      <Problem />
      <Flow />
      <Features />
      <Payments />
      <Orders />
      <Connected />
      <Integrations />
      <ProductFaq faqs={COMMERCE_FAQS} />
      <ProductClosing title="Ready to sell where your customers already talk to you?">
        Book a 20-minute demo and we'll walk through your catalog, checkout and payments on your own
        WhatsApp number.
      </ProductClosing>
    </>
  );
}
