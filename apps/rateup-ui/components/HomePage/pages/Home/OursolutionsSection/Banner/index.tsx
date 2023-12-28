import { Flex, Image, Stack, Text } from "@mantine/core";
import Button from "../../../../components/Button";
import styles from "./Banner.module.css";
import { imagePath } from "../../../constants";
import Link from "next/link";

function Banner({ text, className = undefined }) {
  return (
    <Flex className={`${styles["boost-google-reviews-banner"]} ${className}`}>
      <Flex className={styles["decorative-image-container"]}>
        <Image
          src={`${imagePath}/homepage/banner-decorative-image.png`}
          alt="decorative"
        />
      </Flex>
      <Stack className={styles["content-container"]}>
        <Text className={styles["banner-para"]}>{text}</Text>
        <Link href={"/reputation"}>
          <Button whiteBackgroundGradientText>Know More</Button>
        </Link>
      </Stack>
    </Flex>
  );
}

export default Banner;
