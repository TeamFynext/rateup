import { Flex, Stack, Text, Title } from "@mantine/core";
import DeepInsightsSection from "./DeepInsightsSection";
import ApiAndSdkSection from "./ApiAndSdkSection";
import styles from "./OurFeaturesSection.module.css";
import SurveyFeaturesCarousel from "./SurveyFeaturesCarousel";

function OurFeaturesSection() {
  return (
    <Stack id="our-features" className={styles["our-features-container"]}>
      <Title>OUR FEATURES</Title>
      <SurveyFeaturesCarousel />
      <DeepInsightsSection />
      <ApiAndSdkSection />
      <Flex className={styles["api-and-sdk-support-banner"]}></Flex>
    </Stack>
  );
}

export default OurFeaturesSection;
