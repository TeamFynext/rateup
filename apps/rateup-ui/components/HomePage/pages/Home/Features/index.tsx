import Image from "next/image";

import { Stack } from "@mantine/core";
import classNames from "classnames/bind";

import Banner from "../../../components/Banner";
import TextIllustration from "../../../components/TextIllustration";
import { textIllustrationSections } from "../constants";
import AIAnalyticsAndInsights from "./AIAnalyticsAndInsights";
import styles from "./Features.module.css";
import LoyaltyFeaturesSection from "./LoyaltyFeaturesSection";
import PerfectSurveyForYourNeeds from "./PerfectSurveyForYourNeeds";
import ReputationFeaturesSection from "./ReputationFeaturesSection";

const cx = classNames.bind(styles);

function Features() {
  return (
    <Stack className={cx("features-root-div")} id="our-features">
      <PerfectSurveyForYourNeeds />
      <ReputationFeaturesSection />
      <Banner
        title={"Ready to Boost Loyalty?"}
        subtitle={"Unlock the full potential of your loyalty initiatives"}
      />
      <LoyaltyFeaturesSection />
      <Banner
        title={"Discover Rateup!"}
        subtitle={"Your Complete Customer Engagement Solution"}
      />
      {textIllustrationSections
        .slice(0, 2)
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
              <>{image}</>
            </TextIllustration>
          );
        })}
      <Banner
        title={"Discover Rateup!"}
        subtitle={"Your Complete Customer Engagement Solution"}
      />
      <AIAnalyticsAndInsights />
      {textIllustrationSections
        .slice(2)
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
              <>{image}</>
            </TextIllustration>
          );
        })}
    </Stack>
  );
}

export default Features;
