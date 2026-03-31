"use client";

import dynamic from "next/dynamic";

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

const SupportWidget = dynamic(
  () => import("@/components/app&services/support-widget"),
  { ssr: false },
);

const page = () => {
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
        <Pricing />
        <CTA />
        <Footer />
      </div>
    </Layout>
  );
};

export default page;
