import { Stack, Title } from "@mantine/core";
import TrustedBy from "./TrustedBy";
import { solutionsList } from "./constants";
import styles from "./OurSolutionsSection.module.css";
import InteractiveSolutionDescriptions from "../../../components/InteractiveSolutionDescriptions";
import Banner from "./Banner";
import { lexend600 } from "../../../../../utils/fonts";
import { useMediaQuery } from "@mantine/hooks";
import MobileInteractiveSolutionDescriptions from "../../../components/MobileInteractiveSolutionDescriptions";

function OurSolutionsSection() {
  const isViewportLeq768px = useMediaQuery("(max-width: 768px)");

  return (
    <Stack id="our-solutions" className={styles["our-solutions-container"]}>
      <Title className={`${lexend600.className} ${styles["section-heading"]}`}>
        OUR SOLUTIONS
      </Title>
      <InteractiveSolutionDescriptions solutions={solutionsList} />
      <TrustedBy />
      <Banner text={"Boost Up Your Google Reviews"} />
    </Stack>
  );
}

export default OurSolutionsSection;
