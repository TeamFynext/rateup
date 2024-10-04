import Head from "next/head";

import { Box } from "@mantine/core";

import BenefitsForBusiness from "./BenefitsForBusiness";
import CompaniesUsingRateup from "./CompaniesUsingRateup";
import CustomerFeedback from "./CustomerFeedback";
import HeroSection from "./HeroSection";
import HowRateupHelps from "./HowRateupHelps";
import OurKeyFeatures from "./OurKeyFeatures";
import UseCase from "./UseCase";
import WhatCanYouDo from "./WhatCanYouDo";
import WhyUseRateup from "./WhyUseRateup";

function Home() {
  return (
    <Box style={{ fontFamily: `var(--font-rubik)` }}>
      <Head>
        <title>
          RateUp - Free Surveys, QR Codes & WhatsApp API | Customer Feedback &
          Lead Generation
        </title>
        <meta
          name="keywords"
          content="Customer Engagement Platform, Online reputation management, Survey, Review, Whatsapp Survey, Feedback "
        />
        <meta
          name="description"
          content="Create free web and WhatsApp surveys, build QR codes, and use WhatsApp API for powerful customer feedback and lead generation with RateUp's comprehensive tools."
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta property="og:url" content="https://www.rateup.app/" />
        <meta property="og:title" content="Rateup" />
        <meta
          property="og:description"
          content="Rateup: Create free web and WhatsApp surveys, build QR codes, and use WhatsApp API for powerful customer feedback and lead generation with RateUp's comprehensive tools."
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
      <OurKeyFeatures />
      <HowRateupHelps />
      <BenefitsForBusiness />
      <CustomerFeedback />
    </Box>
  );
}

export default Home;
