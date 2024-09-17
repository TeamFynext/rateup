import Head from "next/head";

import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import HeroSection from "./HeroSection";
import styles from "./WebsurveyPage.module.css";
import WhyShouldYouUseRateupSurvey from "./WhyShouldYouUseRateupSurvey";

const cx = classNames.bind(styles);

function WebsurveyPage() {
  return (
    <Stack
      className={cx("web-survey-page-root-div")}
      style={{ fontFamily: `var(--font-rubik)` }}
    >
      <Head>
        <title>
          RateUp - Web Surveys | Effortlessly collect and analyze customer
          insights with web survey
        </title>
        <meta
          name="description"
          content="Capture leads or gather valuable feedback, Create web surveys and share via links or QR codes, Visualize branch-specific data"
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
      <WhyShouldYouUseRateupSurvey />
    </Stack>
  );
}

export default WebsurveyPage;
