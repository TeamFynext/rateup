import { Flex, Stack, Text, Title } from "@mantine/core";
import DeepInsightsSection from "./DeepInsightsSection";
import ApiAndSdkSection from "./ApiAndSdkSection";
import styles from "./OurFeaturesSection.module.css";
import SurveyFeaturesCarousel from "./SurveyFeaturesCarousel";
import AdvancedAIModelsTextBanner from "./AdvancedAIModelsTextBanner";
import TransformingOnlinePresence from "./TransformingOnlinePresence";

function OurFeaturesSection() {
  return (
    <Stack id="our-features" className={styles["our-features-container"]}>
      <Title>OUR FEATURES</Title>
      <AdvancedAIModelsTextBanner />
      <SurveyFeaturesCarousel />
      <DeepInsightsSection />
      <TransformingOnlinePresence />
      <ApiAndSdkSection />
      <Flex className={styles["api-and-sdk-support-banner"]}></Flex>
    </Stack>
  );
}

export default OurFeaturesSection;
