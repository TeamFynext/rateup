import { Flex, Text, Title, Button, Stack } from "@mantine/core";
import MotionButtonGesture from "../../../components/MotionButtonGesture";
import CustomMantineButton from "../../../components/Button";
import { IconArrowRight } from "@tabler/icons-react";
import styles from "./HeroSection.module.css";
import Image from "next/image";

function HeroSection() {
  return (
    <Flex className={styles["hero-section"]}>
      <Stack className={styles["text-container"]}>
        <Title order={1} className={styles["heading"]}>
          Tap into flavor fast!
        </Title>
        <Text className={styles["para"]}>
          <span className={styles["para-span"]}>Experience quick,</span>
          <span className={styles["para-span"]}>delicious dining with our</span>
          <span className={styles["para-span"]}>digital menus.</span>
        </Text>
        <Flex className={styles["join-see-sample-btns-container"]}>
          <CustomMantineButton whiteBackgroundGradientText>
            Join Now
          </CustomMantineButton>

          <MotionButtonGesture>
            <Button
              className={styles["see-sample-button"]}
              rightSection={<IconArrowRight />}
              classNames={{ section: styles["see-sample-buttton-right-arrow"] }}
            >
              See Sample
            </Button>
          </MotionButtonGesture>
        </Flex>
      </Stack>
      <Flex className={styles["decorative-image-container"]}>
        <Image
          className={styles["decorative-image"]}
          src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menus-page/hero-section-devices-image.png`}
          alt="laptop tablet smartphone"
          width={2100}
          height={1137}
          priority
        />
      </Flex>
    </Flex>
  );
}

export default HeroSection;
