import { Text, Title } from "@mantine/core";
import IllustrationTextLayout from "../../../components/IllustrationTextLayout";
import styles from "../../../index/index.module.css";
import Image from "next/image";

function ApiAndSdkSection() {
  const imagesPath = "/images/homepage/our-features";

  return (
    <IllustrationTextLayout>
      <>
        <Title order={1} className={styles["image-txt-section-heading"]}>
          API and SDK Support
        </Title>
        <Text className={styles["image-txt-section-text-para"]}>
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
      </>
      <>
        <Image
          className={`${styles["api-and-sdk-text-section-image"]}
            ${styles["image-txt-section-image"]}`}
          src={`${imagesPath}/api-and-sdk-support.png`}
          alt="api and sdk support illustration"
          width={1982}
          height={1442}
        />
      </>
    </IllustrationTextLayout>
  );
}

export default ApiAndSdkSection;
