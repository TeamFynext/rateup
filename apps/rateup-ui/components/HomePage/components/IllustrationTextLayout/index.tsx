import { Flex, Stack } from "@mantine/core";
import styles from "../../index/index.module.css";

function IllustrationTextLayout({
  children,
  imageContainerAsFirstElement = undefined,
  className = "",
}) {
  return (
    <Flex
      className={`${styles["image-txt-section"]} ${
        imageContainerAsFirstElement
          ? styles["image-container-as-first-element"]
          : ""
      } ${className}`}
    >
      <Stack
        className={`${styles["api-and-sdk-text-section-text-container"]}
           ${styles["image-txt-section-text-container"]}`}
      >
        {children[0]}
      </Stack>

      <Flex className={`${styles["image-txt-section-image-container"]}`}>
        {children[1]}
      </Flex>
    </Flex>
  );
}

export default IllustrationTextLayout;
