import Hero from "@/components/RateupHomePage/helper/Hero";

import Clients from "./helper/Clients";
import { CTA } from "./helper/CTA";
import { FeaturesGrid } from "./helper/FeaturesGrid";
import { FeatureShowcase } from "./helper/FeatureShowcase";
import { Footer } from "./helper/Footer";
import { Integrations } from "./helper/Integratons";
import { Pricing } from "./helper/Pricing";
import Stats from "./helper/Stats";
import { Testimonials } from "./helper/Testimonials";

export default function RateUpLanding() {
  return (
    <div
      className="bg-rateup-dark-blue"
      style={{
        color: "#ffffff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        lineHeight: 1.6,
        minHeight: "100vh",
      }}
    >
      <Hero />
      <Stats />
      <Clients />
      <FeatureShowcase />
      <FeaturesGrid />
      <Integrations />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
