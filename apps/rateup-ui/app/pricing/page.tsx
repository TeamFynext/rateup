"use client";

import { Suspense } from "react";

import { Flex } from "@mantine/core";

import FAQ from "@/components/HomePage/pages/Pricing/FAQ";
import PricingPlanReview from "@/components/HomePage/pages/Pricing/PricingPlanReview";
import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection";
import RateupLoader from "@/components/Loaders/RateupLoader";
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
      <ClientLogos />
      <PricingPlanReview />
      <Flex justify={"center"}>
        <FAQ />
      </Flex>
      <HomePageFooter />
    </Layout>
  );
}

// export default Pricing;
