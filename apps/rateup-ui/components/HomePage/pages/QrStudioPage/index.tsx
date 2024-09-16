import Head from "next/head";

import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import HeroSection from "./HeroSection";
import styles from "./QrStudioPage.module.css";
import WhatCanOrganizationsDo from "./WhatCanOrganizationsDo";

const cx = classNames.bind(styles);

function QrStudioPage() {
  return (
    <Stack
      className={`${cx("qr-studio-page-root-div")}`}
      style={{ fontFamily: `var(--font-rubik)` }}
    >
      <Head>
        <title>
          RateUp - QR Codes | Create smart QR codes and add dynamic content
        </title>
        <meta
          name="description"
          content="Create smart QR in your brand colors and logo. Add custom landing pages, social media channels or videos as content. Change the content based on your preference without changing the smart QR code."
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
        <link
          rel="canonical"
          href="https://www.rateup.app/qr-studio"
          key="canonical"
        />
      </Head>
      <HeroSection />
      <WhatCanOrganizationsDo />
    </Stack>
  );
}

export default QrStudioPage;
