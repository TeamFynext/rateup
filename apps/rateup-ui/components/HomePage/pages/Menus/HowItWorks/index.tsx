import { Stack, Title } from "@mantine/core";

import IllustrationTextLayout from "../../../components/IllustrationTextLayout";
import commonStyles from "../../../index.module.css";
import { howItWorksTextIllustrations } from "./constants";
import styles from "./HowItWorks.module.css";

function HowItWorks() {
  return (
    <Stack className={styles["how-it-works-section"]}>
      <Title
        className={`${commonStyles["section-heading"]}`}
        order={1}
        fw={600}
      >
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
