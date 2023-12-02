import { Image, Stack, Text } from "@mantine/core";
import styles from "./SimplicityRefined.module.css";

function OnBoardingStepInfo({ description, imageLink }) {
  return (
    <Stack className={styles["step-info"]}>
      <Image
        className={styles["step-info-img"]}
        src={imageLink}
        alt="Sign up"
      />
      <Text className={styles["step-info-description"]}>{description}</Text>
    </Stack>
  );
}

export default OnBoardingStepInfo;
