"use client";

import { Suspense } from "react";

import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection";
import RateupLoader from "@/components/Loaders/RateupLoader";
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
      <HomePageFooter />
    </Layout>
  );
}

// export default Pricing;
