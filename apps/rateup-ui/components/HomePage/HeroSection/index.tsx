import { Flex, Title, Text, Image } from "@mantine/core";
import Button from "../components/Button";
import RocketIcon from "./RocketIcon";
import styles from "./HeroSection.module.css";

function HeroSection() {
  return (
    <Flex
      direction={"column"}
      justify={"center"}
      align={"center"}
      className={styles["hero-section-container"]}
    >
      <Title className={styles["hero-section-heading"]}>
        <Text span inherit className={styles["rocket-icon-line"]}>
          Boost Your{" "}
          <Text span inherit className={styles["rocket-icon-credibility-span"]}>
            Credibility&nbsp;
            <RocketIcon className={styles["rocket-icon"]} />
          </Text>
        </Text>
        <Text className={styles["line"]} span inherit>
          & Get{" "}
          <Text span inherit className={styles["bolder-span"]}>
            Rated Up
          </Text>
        </Text>
      </Title>
      <Text className={styles["hero-section-para"]}>
        <Text span inherit className={styles["line"]}>
          With Rate Up's{" "}
          <Text span inherit className={styles["bolder-span"]}>
            Customer Engagement Platform
          </Text>
          , you can connect
        </Text>
        <Text span inherit className={styles["line"]}>
          with, interact with, and expand your customer connections.
        </Text>
      </Text>
      <Button whiteBackgroundGradientText>Book a Demo</Button>
    </Flex>
  );
}

export default HeroSection;
