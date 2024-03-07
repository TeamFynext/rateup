import { Group, Paper, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";

export function CommentCard({ comment, isSender }) {
  let isNote = comment?.text?.startsWith("Note:");
  return (
    <Paper
      shadow="xs"
      py="xs"
      px="md"
      radius="lg"
      mt="2px"
      style={{
        background: isNote ? "#fff" : isSender ? "#CCFFE5" : "#FFCCE5",
        minWidth: "200px",
      }}
    >
      <Stack gap="2px">
        <Text fw={700}>{!isSender && comment.createdBy.name}</Text>
        <Text
          size={isNote ? "xs" : "md"}
          c={isNote ? "var(--tertiary-color)" : "000"}
        >
          {comment.text}
        </Text>
        <Group justify="flex-end">
          <Text
            size="xs"
            c={isNote ? "dark.0" : "dark.3"}
            style={{ textAlign: "right" }}
          >
            {dayjs(comment.createdAt).format("D MMM YYYY, h:mm A ")}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
