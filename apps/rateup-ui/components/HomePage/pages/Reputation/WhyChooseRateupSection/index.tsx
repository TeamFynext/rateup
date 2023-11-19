import { Stack, Title } from "@mantine/core";
import InteractiveSolutionDescriptions from "../../../components/InteractiveSolutionDescriptions";
import { solutionsList } from "../constants";
import styles from "./WhyChooseRateupSection.module.css";
import commonStyles from "../Reputation.module.css";

const sectionClassName = `${styles["why-choose-rateup-container"]}`;

function WhyChooseRateupSection() {
  return (
    <Stack className={sectionClassName} id="our-solutions">
      <Title order={1} className={`${commonStyles["section-heading"]}`}>
        Why Choose Rateup
      </Title>
      <InteractiveSolutionDescriptions
        solutions={solutionsList}
        imageContainerAsFirstElement
        imageContainerImageUrl="/images/reputation-page/why-choose-rateup/why-choose-rateup.png"
      />
    </Stack>
  );
}

export default WhyChooseRateupSection;
