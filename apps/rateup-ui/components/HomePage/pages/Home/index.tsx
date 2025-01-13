import Head from "next/head";

import { Box, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import { imagesPath } from "@/utils/constants";

import Banner from "../../components/Banner";
import BookADemoSection from "../../components/BookADemoSection";
import Picture from "../../components/Picture";
import TextIllustration from "../../components/TextIllustration";
import { textIllustrationSections } from "./constants";
import EmpowerYourBrandsGrowth from "./EmpowerYourBrandsGrowth";
import AIAnalyticsAndInsights from "./Features/AIAnalyticsAndInsights";
import PerfectSurveyForYourNeeds from "./Features/PerfectSurveyForYourNeeds";
import HeroSection from "./HeroSection";
import styles from "./Home.module.css";
import LoyaltyProgramBanner from "./LoyaltyProgramBanner";
import OneSmartQr from "./OneSmartQr";

const cx = classNames.bind(styles);

function Home() {
  return (
    <Box style={{ fontFamily: `var(--font-rubik)` }}>
      <Head>
        <title>
          RateUp - WhatsApp API | Loyalty Platform | Campaigns | Customer
          Feedback & Lead Generation
        </title>
        <meta
          name="keywords"
          content="Customer Engagement Platform, WhatsApp Loyalty, Review, Whatsapp Feedback, WhatsApp Surveys, WhatsApp API , WhatsApp Business API "
        />
        <meta
          name="description"
          content="Seamless customer engagement through WhatsApp!"
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta property="og:url" content="https://www.rateup.app/" />
        <meta property="og:title" content="Rateup" />
        <meta
          property="og:description"
          content="Seamless customer engagement through WhatsApp!"
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
        <script
          id="vtag-ai-js"
          async
          src="https://r2.leadsy.ai/tag.js"
          data-pid="1xU4sczwLDEZ5B6Q6"
          data-version="062024"
        ></script>
      </Head>
      <HeroSection />
      <EmpowerYourBrandsGrowth />
      <Banner
        title={"Discover Rateup!"}
        subtitle={"Your Complete Customer Engagement Solution"}
      />
      <PerfectSurveyForYourNeeds />
      <Banner
        title={"Discover Rateup!"}
        subtitle={"Your Complete Customer Engagement Solution"}
      />
      <Stack
        className={cx(
          "t-ill-section",
          "landing-page-section-root-common-styles",
        )}
      >
        {textIllustrationSections
          .slice(0, 1)
          .map(({ id, heading, description, image }, index) => {
            return (
              <TextIllustration
                key={id}
                imageAsFirstElement={(index + 1) % 2 === 1}
              >
                <>
                  {heading}
                  {description}
                </>
                <>
                  <Picture
                    src={`${imagesPath}/homepage/engage-directly.png`}
                    alt={"Rateup's WhatsApp Campaigns"}
                    sourcesArr={[
                      {
                        type: "image/webp",
                        srcSet: `${imagesPath}/homepage/engage-directly.webp`,
                      },
                    ]}
                  />
                </>
              </TextIllustration>
            );
          })}
      </Stack>
      <OneSmartQr />
      <Stack
        className={cx(
          "t-ill-section",
          "landing-page-section-root-common-styles",
        )}
      >
        {textIllustrationSections
          .slice(1, 2)
          .map(({ id, heading, description, image }, index) => {
            return (
              <TextIllustration key={id}>
                <>
                  {heading}
                  {description}
                </>
                <>
                  <Picture
                    src={`${imagesPath}/homepage/satisfied-customers.png`}
                    alt={"Real Voices, Real Impact"}
                    sourcesArr={[
                      {
                        type: "image/webp",
                        srcSet: `${imagesPath}/homepage/satisfied-customers.png`,
                      },
                    ]}
                  />
                </>
              </TextIllustration>
            );
          })}
      </Stack>

      <LoyaltyProgramBanner />

      <AIAnalyticsAndInsights />
      <Stack
        className={cx(
          "t-ill-section",
          "landing-page-section-root-common-styles",
        )}
      >
        {textIllustrationSections
          .slice(2, 3)
          .map(({ id, heading, description, image }, index) => {
            return (
              <TextIllustration key={id} imageAsFirstElement>
                <>
                  {heading}
                  {description}
                </>
                <>
                  <Picture
                    src={`${imagesPath}/homepage/integrations.png`}
                    alt={"Integrations"}
                    sourcesArr={[
                      {
                        type: "image/webp",
                        srcSet: `${imagesPath}/homepage/integrations.png`,
                      },
                    ]}
                  />
                </>
              </TextIllustration>
            );
          })}
      </Stack>

      <Stack
        className={cx(
          "t-ill-section",
          "landing-page-section-root-common-styles",
        )}
      >
        {textIllustrationSections
          .slice(3)
          .map(({ id, heading, description, image }, index) => {
            return (
              <TextIllustration key={id}>
                <>
                  {heading}
                  {description}
                </>
                <>
                  <Picture
                    src={`${imagesPath}/homepage/security-conscious-business.png`}
                    alt={"Security Conscious Business"}
                    sourcesArr={[
                      {
                        type: "image/webp",
                        srcSet: `${imagesPath}/homepage/security-conscious-business.png`,
                      },
                    ]}
                  />
                </>
              </TextIllustration>
            );
          })}
      </Stack>
      <BookADemoSection />
    </Box>
  );
}

export default Home;
