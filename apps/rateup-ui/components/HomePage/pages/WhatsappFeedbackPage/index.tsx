import Head from "next/head";

import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import CompaniesUsingRateup from "../Home/CompaniesUsingRateup";
import HeroSection from "./HeroSection";
import HowRateupCanHelp from "./HowRateupCanHelp";
import styles from "./WhatsappFeedbackPage.module.css";
import WhyTraditionalMethodsDontWork from "./WhyTraditionalMethodsDontWork";

const cx = classNames.bind(styles);

function WhatsappFeedbackPage() {
  return (
    <Stack
      className={cx("whatsapp-feedback-page-root-div")}
      style={{ fontFamily: `var(--font-rubik)` }}
    >
      <Head>
        <title>
          RateUp - Whatsapp Surveys | Engage where your customers are most
          active
        </title>
        <meta
          name="description"
          content="Automate sending interactive whatsapp feedback forms, Create and track tickets for negative feedback, Turn positive feedback to public reviews."
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
          href="https://www.rateup.app/whatsapp-feedback"
          key="canonical"
        />
      </Head>
      <HeroSection />
      <CompaniesUsingRateup className={cx("companies-using-rateup-root-div")} />
      <WhyTraditionalMethodsDontWork />
      <HowRateupCanHelp />
    </Stack>
  );
}

export default WhatsappFeedbackPage;
