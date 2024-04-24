import {
  ActionIcon,
  Button,
  Group,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import styles from "../../../../TakeSurvey/TakeSurveyComponent/TakeSurvey.module.css";

function NextPrevPreview({ isMobile, buttonStyles }) {
  const { borderRadius = "initial", ...themeStylesWoBr } = buttonStyles;

  return (
    <Stack gap={0} w={"100%"} justify="flex-end">
      <Text
        mb={"0.625rem"}
        size={isMobile && "sm"}
        c={themeStylesWoBr?.backgroundColor}
      >
        *Choose an option or answer to proceed!
      </Text>

      <Stack className={styles["next-prev-btns-and-progress-container"]}>
        <Group justify="flex-end">
          <ActionIcon
            className={styles["prev-btn"]}
            title=""
            variant="outlined"
            style={{
              backgroundColor: `rgba(255, 255, 255, 0.75)`,
              outline: `2px solid ${themeStylesWoBr?.backgroundColor}`,
              color: themeStylesWoBr?.backgroundColor,
            }}
          >
            <IconChevronLeft size={isMobile ? 20 : 24} />
          </ActionIcon>
          <Button
            className={styles["submit-next-btn"]}
            color="var(--tertiary-color)"
            rightSection={<IconChevronRight size={isMobile ? 20 : 24} />}
            style={{ ...themeStylesWoBr, flex: isMobile ? 1 : "initial" }}
          >
            {"Next"}
          </Button>
        </Group>

        <Progress
          value={80}
          transitionDuration={300}
          color={themeStylesWoBr?.backgroundColor}
          size={isMobile ? "xs" : "sm"}
        />
      </Stack>
    </Stack>
  );
}

export default NextPrevPreview;
