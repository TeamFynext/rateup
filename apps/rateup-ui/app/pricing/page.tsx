"use client";

import { Suspense } from "react";

import { Flex } from "@mantine/core";

import FAQ from "@/components/HomePage/pages/Pricing/FAQ";
import PricingPlanReview from "@/components/HomePage/pages/Pricing/PricingPlanReview";
import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { ClientLogoSectionNew } from "@/components/products/ReviewWithAiComponents/shared/ReviewTestimonials";
import ClientLogos from "@/components/RateupHomePage/helpers/ClientLogos";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

export default function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <Pricing />
    </Suspense>
  );
}

function Pricing() {
  return (
    <Layout>
      <PricingSection />
      <ClientLogoSectionNew />

      <div
        className="grid xs:grid-cols-1 lg:grid-cols-2 p-0"
        style={{
          background:
            "linear-gradient(to bottom right, #00397b, #013553, #1c518e)",
        }}
      >
        <FAQ />
        <PricingPlanReview />
      </div>
      <HomePageFooter />
    </Layout>
  );
}

// export default Pricing;
