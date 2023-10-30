import { Flex, Text } from "@mantine/core";
import Button from "../components/Button";
import styles from "./Banner.module.css";

function Banner() {
  return (
    <Flex
      className={styles["get-started-for-free-banner"]}
      align={"center"}
      justify={"center"}
      gap={"xl"}
      wrap={"wrap"}
    >
      <Text className={styles["banner-para"]}>
        Elevate Your Experience, Gauge Your Satisfaction!
      </Text>
      <Button whiteBackgroundGradientText>Get Started - it&#8217;s free</Button>
    </Flex>
  );
}

export default Banner;
