import dynamic from "next/dynamic";

import { getAllRateupPaymentPlans } from "@/backend/payment/payment.api";
import Clients from "@/components/RateupHomePage/helper/Clients";
import { CTA } from "@/components/RateupHomePage/helper/CTA";
import { FeaturesGrid } from "@/components/RateupHomePage/helper/FeaturesGrid";
import { FeatureShowcase } from "@/components/RateupHomePage/helper/FeatureShowcase";
import { Footer } from "@/components/RateupHomePage/helper/Footer";
import Hero from "@/components/RateupHomePage/helper/Hero";
import { Integrations } from "@/components/RateupHomePage/helper/Integratons";
import { Pricing } from "@/components/RateupHomePage/helper/Pricing";
import Stats from "@/components/RateupHomePage/helper/Stats";
import { Testimonials } from "@/components/RateupHomePage/helper/Testimonials";
import Layout from "@/components/RateupHomePage/Layout";

const page = async () => {
  const plans = await getAllRateupPaymentPlans();

  return (
    <Layout>
      <div className="bg-rateup-dark-blue text-white min-h-screen leading-relaxed">
        <Hero />
        <Stats />
        <Clients />
        <FeatureShowcase />
        <FeaturesGrid />
        <Integrations />
        <Testimonials />
        <Pricing plans={plans} />
        <CTA />
        <Footer />
      </div>
    </Layout>
  );
};

export default page;
