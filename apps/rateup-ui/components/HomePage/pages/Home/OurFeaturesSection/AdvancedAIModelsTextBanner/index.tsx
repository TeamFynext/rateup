import { Flex, Text, Title } from "@mantine/core";
import styles from "./AdvancedAIModelsTextBanner.module.css";
import AdvancedAiIllustrationSvg from "./svg-images/AdvancedAiIllustrationSvg";
import AnimatedSvg from "./svg-images/AnimatedSvg";

function AdvancedAIModelsTextBanner() {
  return (
    <Flex
      className={styles["aidriven-text-img-container"]}
      align={"center"}
      justify={"space-evenly"}
      wrap={"wrap"}
    >
      <div className={styles["text-containter"]}>
        <Title order={2} className={styles["advanced-ai-models-text"]}>
          Advanced AI Models and Analytics
        </Title>
        <Text className={styles["leverage-the-power-p"]}>
          Leverage the power of our advanced AI models and analytics to
          <span> gain actionable insights. </span>
          Uncover sentiment analysis, sentiment trends, and customer behavior
          patterns for
          <span> informed decision-making.</span>
        </Text>
      </div>
      <div className={styles["image-container"]}>
        <AdvancedAiIllustrationSvg />
        <div className={styles["animated-svg-container"]}>
          <AnimatedSvg />
        </div>
      </div>
    </Flex>
  );
}

export default AdvancedAIModelsTextBanner;
