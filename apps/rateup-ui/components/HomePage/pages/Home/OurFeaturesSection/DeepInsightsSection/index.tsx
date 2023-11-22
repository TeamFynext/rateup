import { Text, Title } from "@mantine/core";
import styles from "../../../../index/index.module.css";
import IllustrationTextLayout from "../../../../components/IllustrationTextLayout";

function DeepInsightsSection() {
  return (
    <IllustrationTextLayout imageContainerAsFirstElement>
      <>
        <Title order={1} className={styles["illustration-txt-section-heading"]}>
          Deep Insights
          <Text component="span" inherit className={styles["line"]}>
            {" "}
            and Review Analytics
          </Text>
        </Title>
        <Text className={styles["illustration-txt-section-text-para"]}>
          Dive deep into your customer data with our comprehensive review
          analytics. Identify trends, patterns, and areas for improvement to
          <Text component="span" inherit className={styles["bold-span"]}>
            {" "}
            enhance customer satisfaction and loyalty.
          </Text>
        </Text>
      </>

      <>
        <video className={`${styles["illustration-txt-section-video"]}`} muted>
          <source
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/videos/homepage/our-features/deep-insights.webm`}
            type="video/webm"
          />
          <source
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/videos/homepage/our-features/deep-insights.mp4`}
            type="video/mp4"
          />
        </video>
      </>
    </IllustrationTextLayout>
  );
}

export default DeepInsightsSection;
