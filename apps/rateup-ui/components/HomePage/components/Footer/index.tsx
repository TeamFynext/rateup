import { Flex, Image, Text } from "@mantine/core";
import { getNavLinksArray } from "../../constants";
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
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/footer-logo.svg`}
        alt="rate up logo"
        w={110}
        h={110}
      />
      <Flex className={styles["footer-links-container"]}>
        {getNavLinksArray(styles["footer-link"], false)}
      </Flex>
      <Text className={styles["copyright-para"]}>
        Copyright &copy;2023 All rights reserved
      </Text>
    </Flex>
  );
}

export default Footer;
