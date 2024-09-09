import Head from "next/head";

import { Box } from "@mantine/core";

import Banner from "../../components/Banner";
import CompaniesUsingRateup from "./CompaniesUsingRateup";
import CustomerFeedback from "./CustomerFeedback";
import EmpowerYourBrandsGrowth from "./EmpowerYourBrandsGrowth";
import Features from "./Features";
import PerfectSurveyForYourNeeds from "./Features/PerfectSurveyForYourNeeds";
import HeroSection from "./HeroSection";
import OurFeaturesSection from "./OurFeaturesSection";
import OurSolutionsSection from "./OursolutionsSection";
import TestimonialsSection from "./TestimonialsSection";
import WhatCanYouDo from "./WhatCanYouDo";
import WhyUseRateup from "./WhyUseRateup";

function Home() {
  return (
    <Box style={{ fontFamily: `var(--font-rubik)` }}>
      <Head>
        <title>Customer Engagement platform - Feedback tool | RateUp</title>
        <meta
          name="keywords"
          content="Customer Engagement Platform, Online reputation management, Survey, Review, Whatsapp Survey, Feedback "
        />
        <meta
          name="description"
          content="Unlock RateUp's Platform: Digital Menus, reputation management, real-time reviews. Elevate your brand and boost customer satisfaction. Book a demo!"
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta property="og:url" content="https://www.rateup.app/" />
        <meta property="og:title" content="Rateup" />
        <meta
          property="og:description"
          content="Rateup - With Rate Up's Customer Engagement Platform, you can connect
          with, interact with, and expand your customer connections."
        />
        <meta
          property="og:image"
          content="https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1086" />
        <meta property="og:image:height" content="832" />
        <meta property="og:image:alt" content="Star Icon" />
        <link rel="canonical" href="https://www.rateup.app/" key="canonical" />
      </Head>
      <HeroSection />
      <CompaniesUsingRateup />
      <WhyUseRateup />
      <WhatCanYouDo />
      <CustomerFeedback />
    </Box>
  );
}

export default Home;
