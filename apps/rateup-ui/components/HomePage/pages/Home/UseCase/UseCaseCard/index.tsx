import Image from "next/image";

import { Flex, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import styles from "./UseCaseCard.module.css";

const cx = classNames.bind(styles);

function UseCaseCard({
  heading,
  useCaseText,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
}) {
  return (
    <Stack className={cx("use-case-card")}>
      <h2 className={cx("heading")}>{heading}</h2>
      <Flex className={cx("image-container")}>
        <Image
          className={cx("image")}
          src={imageUrl}
          alt={imageAlt}
          width={imageWidth}
          height={imageHeight}
        />
      </Flex>
      <Text className={cx("use-case-p")}>{useCaseText}</Text>
    </Stack>
  );
}

export default UseCaseCard;
