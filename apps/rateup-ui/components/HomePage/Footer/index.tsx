import { Flex, Image, Text } from "@mantine/core";
import { getNavLinksArray } from "../constants";
import styles from "./footer.module.css";

function Footer() {
  return (
    <Flex
      direction={"column"}
      align={"center"}
      className={styles["footer-root-div"]}
    >
      <Image
        className={styles["footer-logo"]}
        src="/images/footer-logo.svg"
        alt="rate up logo"
        w={110}
        h={110}
      />
      <Flex className={styles["footer-links-container"]}>
        {getNavLinksArray(styles["footer-link"])}
      </Flex>
      <Text className={styles["copyright-para"]}>
        Copyright &copy;2023 All rights reserved
      </Text>
    </Flex>
  );
}

export default Footer;
