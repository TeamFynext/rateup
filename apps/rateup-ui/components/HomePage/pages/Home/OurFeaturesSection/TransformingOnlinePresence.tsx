import { Image, Text, Title } from "@mantine/core";
import IllustrationTextLayout from "../../../components/IllustrationTextLayout";
import styles from "../../../index.module.css";
import { imagesPath } from "../../../../../utils/constants";
import Button from "../../../components/Button";

function TransformingOnlinePresence() {
  const imagePath = `${imagesPath}/homepage/our-features/transforming-online-presence.png`;

  return (
    <IllustrationTextLayout>
      <>
        <Title className={styles["illustration-txt-section-heading"]}>
          Transforming Online Presence and Customer Experiences
        </Title>
        <Text className={styles["illustration-txt-section-text-para"]}>
          We redefine the dynamics of{" "}
          <span className={styles["bold-span"]}>
            online reputation management,{" "}
          </span>
          providing businesses with a robust platform to not only enhance their{" "}
          <span className={styles["bold-span"]}>Google reviews</span> but also
          cultivate{" "}
          <span className={styles["bold-span"]}>positive brand advocates.</span>
        </Text>
        <Button
          whiteBackgroundGradientText
          style={{
            border: "2px solid #00397b",
          }}
        >
          Know More
        </Button>
      </>
      <>
        <Image
          className={`${styles["api-and-sdk-text-section-image"]}
            ${styles["illustration-txt-section-video"]}`}
          src={imagePath}
          alt="api and sdk support illustration"
          width={1982}
          height={1442}
        />
      </>
    </IllustrationTextLayout>
  );
}

export default TransformingOnlinePresence;
