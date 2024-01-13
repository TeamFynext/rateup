import { Flex, Stack, Text, Title } from "@mantine/core";
import Image from "next/image";
import styles from "./HeroSection.module.css";
import BookDemoContactForm from "../../../components/BookDemoContactForm";

const imagePath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/transform-online-presence.png`;

function HeroSection() {
  return (
    <Flex className={styles["hero-section-container"]}>
      <Stack className={styles["text-container"]}>
        <Title order={1}>
          Transforming Online Presence and Customer Experiences
        </Title>
        <Text>
          We redefine the dynamics of <span>online reputation management,</span>{" "}
          providing businesses with a robust platform to not only enhance their{" "}
          <span>Google reviews</span> but also cultivate{" "}
          <span>positive brand advocates</span>
        </Text>
        <Flex>
          <BookDemoContactForm
            buttonProps={{ whiteBackgroundGradientText: true }}
          />
        </Flex>
      </Stack>
      <Flex className={styles["illustration-image-container"]}>
        <Image
          className={`${styles["illustration-image"]}`}
          src={imagePath}
          alt="Transorm Online Presence"
          width={1638}
          height={1350}
        />
      </Flex>
    </Flex>
  );
}

export default HeroSection;
