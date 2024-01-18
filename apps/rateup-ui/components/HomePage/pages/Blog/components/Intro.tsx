import { Title, Text, Stack } from "@mantine/core";
import styles from "./blog.module.css";

const Intro = () => {
  return (
    <Stack>
      <Title className={styles["main-page-top-title-container"]}>
        All You Need to Know About Building Your Online Reputation.
      </Title>
      <Text className={styles["main-page-top-subtitle-container"]}>
        Unearth the mastery of impactful communication and acquire profound
        insights into the opportunities presented by the cultivation of a
        positive reputation.
      </Text>
    </Stack>
  );
};

export default Intro;
