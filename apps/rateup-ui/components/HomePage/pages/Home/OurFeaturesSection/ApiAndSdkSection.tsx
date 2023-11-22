import { Text, Title } from "@mantine/core";
import IllustrationTextLayout from "../../../components/IllustrationTextLayout";
import styles from "../../../index/index.module.css";
import Image from "next/image";

function ApiAndSdkSection() {
  const imagesPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/homepage/our-features`;

  return (
    <IllustrationTextLayout>
      <>
        <Title order={1} className={styles["illustration-txt-section-heading"]}>
          API and SDK Support
        </Title>
        <Text className={styles["illustration-txt-section-text-para"]}>
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
            ${styles["illustration-txt-section-video"]}`}
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
