import Image from "next/image";
import styles from "./AIDrivenBanner.module.css";
import { Flex, Text, Title } from "@mantine/core";

function AIDrivenBanner() {
  return (
    <Flex
      className={styles["aidriven-text-img-container"]}
      align={"center"}
      justify={"space-evenly"}
      wrap={"wrap"}
      gap={"sm"}
    >
      <div className={styles["text-containter"]}>
        <Title order={2} className={styles["AIDrivenText"]}>
          AI Driven
        </Title>
        <Text className={styles["reputatuion-management-p"]}>
          Reputation Management
          <Text inherit span className={styles["line"]}>
            {" "}
            with Advanced Analytics
          </Text>
        </Text>
      </div>
      <div className={styles["image-container"]}>
        <Image
          src={"/images/homepage/our-solutions/ai-driven.svg"}
          alt="AI driven Illustration"
          width={500}
          height={290}
          priority={false}
        />
      </div>
    </Flex>
  );
}

export default AIDrivenBanner;
