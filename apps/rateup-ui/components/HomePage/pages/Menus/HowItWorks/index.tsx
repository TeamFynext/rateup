import { Stack, Title } from "@mantine/core";
import commonStyles from "../../../index/index.module.css";
import styles from "./HowItWorks.module.css";
import IllustrationTextLayout from "../../../components/IllustrationTextLayout";
import { howItWorksTextIllustrations } from "./constants";

function HowItWorks() {
  return (
    <Stack className={styles["how-it-works-section"]}>
      <Title className={commonStyles["section-heading"]} order={1}>
        How It Works
      </Title>

      {howItWorksTextIllustrations.map((feature, i) => {
        const { id, heading, description, image } = feature;
        return (
          <IllustrationTextLayout
            key={id}
            imageContainerAsFirstElement={i === 0 || i === 2}
          >
            <>
              {heading}
              {description}
            </>
            <>{image}</>
          </IllustrationTextLayout>
        );
      })}
    </Stack>
  );
}

export default HowItWorks;
