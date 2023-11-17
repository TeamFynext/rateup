import { Stack, Title } from "@mantine/core";
import InteractiveSolutionDescriptions from "./InteractiveSolutionDescriptions";
import TrustedBy from "./TrustedBy";
import AdvancedAIModelsTextBanner from "./AdvancedAIModelsTextBanner";
import { solutionsList } from "./constants";
import styles from "./OurSolutionsSection.module.css";

function OurSolutionsSection() {
  return (
    <Stack id="our-solutions" className={styles["our-solutions-container"]}>
      <Title>OUR SOLUTIONS</Title>
      <InteractiveSolutionDescriptions solutions={solutionsList} />
      <TrustedBy />
      <AdvancedAIModelsTextBanner />
    </Stack>
  );
}

export default OurSolutionsSection;
