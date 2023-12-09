import { Stack, Title } from "@mantine/core";
import TrustedBy from "./TrustedBy";
import { solutionsList } from "./constants";
import styles from "./OurSolutionsSection.module.css";
import InteractiveSolutionDescriptions from "../../../components/InteractiveSolutionDescriptions";
import Banner from "./Banner";

function OurSolutionsSection() {
  return (
    <Stack id="our-solutions" className={styles["our-solutions-container"]}>
      <Title>OUR SOLUTIONS</Title>
      <InteractiveSolutionDescriptions solutions={solutionsList} />
      <TrustedBy />
      <Banner text={"Boost Up Your Google Reviews"} />
    </Stack>
  );
}

export default OurSolutionsSection;
