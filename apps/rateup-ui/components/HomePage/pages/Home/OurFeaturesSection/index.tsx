import { Flex, Stack, Text, Title } from "@mantine/core";
import DeepInsightsSection from "./DeepInsightsSection";
import ApiAndSdkSection from "./ApiAndSdkSection";
import styles from "./OurFeaturesSection.module.css";
import commonStyles from "../../../index.module.css";
import SurveyFeaturesCarousel from "./SurveyFeaturesCarousel";
import AdvancedAIModelsTextBanner from "./AdvancedAIModelsTextBanner";
import TransformingOnlinePresence from "./TransformingOnlinePresence";
import SparklesIconWithText from "../../../components/SparklesIconWithText";
import FeaturesCardsList from "./FeaturesCardsList";

function OurFeaturesSection() {
  return (
    <Stack id="our-features" className={styles["our-features-container"]}>
      <Title className={`${commonStyles["section-heading"]}`}>
        <SparklesIconWithText text={"Our Features"} />
        <span>Enriching The Customer Experience Goes</span>
        <span>Beyond Driving Business Growth.</span>
      </Title>

      <FeaturesCardsList />
      {/* <AdvancedAIModelsTextBanner />
      <SurveyFeaturesCarousel />
      <DeepInsightsSection />
      <TransformingOnlinePresence />
      <ApiAndSdkSection /> */}
      {/* <Flex className={styles["api-and-sdk-support-banner"]}></Flex> */}
    </Stack>
  );
}

export default OurFeaturesSection;
