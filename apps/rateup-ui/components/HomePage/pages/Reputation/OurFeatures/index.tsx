import { Stack, Title } from "@mantine/core";

import IllustrationTextLayout from "../../../components/IllustrationTextLayout";
import commonStyles from "../../../index.module.css";
import { features } from "../constants";
import styles from "./our-features.module.css";

function OurFeatures() {
  return (
    <Stack id="our-features" className={styles["our-features-container"]}>
      <Title
        order={1}
        className={`${commonStyles["section-heading"]} `}
        fw={600}
      >
        OUR FEATURES
      </Title>
      {features.map((feature, i) => {
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

export default OurFeatures;
