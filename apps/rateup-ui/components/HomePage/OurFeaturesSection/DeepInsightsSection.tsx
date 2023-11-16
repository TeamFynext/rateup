import { Flex, Stack, Text, Title } from "@mantine/core";
import Image from "next/image";
import styles from "./OurFeaturesSection.module.css";

function DeepInsightsSection() {
  const imagesPath = "/images/homepage/our-features";

  return (
    <Flex
      className={`${styles["deep-insights-section"]} 
         ${styles["image-txt-section"]}`}
    >
      <Flex
        className={`${styles["deep-insights-section-image-container"]}
           ${styles["image-txt-section-image-container"]}
          `}
      >
        <Image
          className={`${styles["deep-insights-section-image"]}
             ${styles["image-txt-section-image"]}
            `}
          src={`${imagesPath}/deep-insights.png`}
          alt="deep insights illustration"
          width={1982}
          height={1442}
        />
      </Flex>
      <Stack
        className={`${styles["deep-insights-section-text-container"]}
           ${styles["image-txt-section-text-container"]}
          `}
      >
        <Title order={1} className={styles["section-heading"]}>
          Deep Insights
          <Text component="span" inherit className={styles["line"]}>
            and Review Analytics
          </Text>
        </Title>
        <Text className={styles["section-text-para"]}>
          Dive deep into your customer data with our comprehensive review
          analytics. Identify trends, patterns, and areas for improvement to
          <Text component="span" inherit className={styles["bold-span"]}>
            {" "}
            enhance customer satisfaction and loyalty.
          </Text>
        </Text>
      </Stack>
    </Flex>
  );
}

export default DeepInsightsSection;
