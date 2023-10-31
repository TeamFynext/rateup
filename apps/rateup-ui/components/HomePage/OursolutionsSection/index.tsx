import { Stack, Title } from "@mantine/core";
import InteractiveSolutionDescriptions from "./InteractiveSolutionDescriptions";
import TrustedBy from "./TrustedBy";
import AIDrivenBanner from "./AIDrivenBanner";
import { solutionsList } from "./constants";
import styles from "./OurSolutionsSection.module.css";

function OurSolutionsSection() {
  return (
    <Stack 
      id="our-solutions"
      className={styles["our-solutions-container"]}
    >
      <Title>Our Solutions</Title>
      <InteractiveSolutionDescriptions solutions={solutionsList} />
      <TrustedBy />
      <AIDrivenBanner />
    </Stack>
  );
}

export default OurSolutionsSection;
