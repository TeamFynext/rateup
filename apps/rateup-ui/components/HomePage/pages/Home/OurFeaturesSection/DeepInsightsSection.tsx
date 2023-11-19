import { Text, Title } from "@mantine/core";
import Image from "next/image";
import styles from "../../../index/index.module.css";
import IllustrationTextLayout from "../../../components/IllustrationTextLayout";

function DeepInsightsSection() {
  const imagesPath = "/images/homepage/our-features";

  return (
    <IllustrationTextLayout imageContainerAsFirstElement>
      <>
        <Title order={1} className={styles["image-txt-section-heading"]}>
          Deep Insights
          <Text component="span" inherit className={styles["line"]}>
            and Review Analytics
          </Text>
        </Title>
        <Text className={styles["image-txt-section-text-para"]}>
          Dive deep into your customer data with our comprehensive review
          analytics. Identify trends, patterns, and areas for improvement to
          <Text component="span" inherit className={styles["bold-span"]}>
            {" "}
            enhance customer satisfaction and loyalty.
          </Text>
        </Text>
      </>

      <>
        <Image
          className={`${styles["deep-insights-section-image"]}
             ${styles["image-txt-section-image"]}
            `}
          src={`${imagesPath}/deep-insights.png`}
          alt="deep insights illustration"
          width={1982}
          height={1442}
        />
      </>
    </IllustrationTextLayout>
  );
}

export default DeepInsightsSection;
