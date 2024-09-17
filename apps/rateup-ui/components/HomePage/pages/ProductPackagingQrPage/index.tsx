import Head from "next/head";

import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import HeroSection from "./HeroSection";
import styles from "./ProductPackagingQrPage.module.css";
import Section from "./Section";

const cx = classNames.bind(styles);

function ProductPackagingQrPage() {
  return (
    <Stack
      className={cx("web-feedback-page-root-div")}
      style={{ fontFamily: `var(--font-rubik)` }}
    >
      <Head>
        <title>
          RateUp - Product Packaging QR | Transform product packaging into a
          customer engagement hub with smart QR codes
        </title>
        <meta
          name="description"
          content="Instant feedback forms, Engaging Product Videos, Customizable to fit your brand"
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
          href="https://www.rateup.app/web-feedback"
          key="canonical"
        />
      </Head>
      <HeroSection />
      <Section />
    </Stack>
  );
}

export default ProductPackagingQrPage;
