import { Flex, Text } from "@mantine/core";
import Button from "../Button";
import styles from "./Banner.module.css";

function Banner({ text }) {
  return (
    <Flex
      className={styles["get-started-for-free-banner"]}
      align={"center"}
      justify={"center"}
      gap={"xl"}
      wrap={"wrap"}
    >
      <Text className={styles["banner-para"]}>{text}</Text>
      <Button whiteBackgroundGradientText>Get Started - it&#8217;s free</Button>
    </Flex>
  );
}

export default Banner;
