import { Flex, Stack, Text, Title } from "@mantine/core";
import styles from "./OurFeaturesSection.module.css";
import Image from "next/image";

function ApiAndSdkSection() {
  const imagesPath = "/images/homepage/our-features";

  return (
    <Flex
      className={`${styles["api-and-sdk-text-section"]}
         ${styles["image-txt-section"]}`}
    >
      <Stack
        className={`${styles["api-and-sdk-text-section-text-container"]}
           ${styles["image-txt-section-text-container"]}`}
      >
        <Title order={1} className={styles["section-heading"]}>
          API and SDK Support
        </Title>
        <Text className={styles["section-text-para"]}>
          Seamlessly integrate
          <Text className={styles["bold-span"]} component="span" inherit>
            {" "}
            RateUp.app
          </Text>{" "}
          into your existing systems and workflows with our robust API and SDK
          support. Customize and extend the functionality of our platform to
          <Text className={styles["bold-span"]} component="span" inherit>
            {" "}
            meet your specific needs.
          </Text>
        </Text>
      </Stack>

      <Flex
        className={`${styles["api-and-sdk-text-section-image-container"]}
           ${styles["image-txt-section-image-container"]}`}
      >
        <Image
          className={`${styles["api-and-sdk-text-section-image"]}
             ${styles["image-txt-section-image"]}`}
          src={`${imagesPath}/api-and-sdk-support.png`}
          alt="api and sdk support illustration"
          width={1982}
          height={1442}
        />
      </Flex>
    </Flex>
  );
}

export default ApiAndSdkSection;
