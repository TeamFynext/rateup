import { Stack, Title } from "@mantine/core";
import commonStyles from "../../../index/index.module.css";
import styles from "./HowItWorks.module.css";
import IllustrationTextLayout from "../../../components/IllustrationTextLayout";
import { howItWorksTextIllustrations } from "./constants";
import { lexend600 } from "../../../../../utils/fonts";

function HowItWorks() {
  return (
    <Stack className={styles["how-it-works-section"]}>
      <Title
        className={`${commonStyles["section-heading"]} ${lexend600.className}`}
        order={1}
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
