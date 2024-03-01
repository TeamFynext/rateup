import { Group, Paper, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";

export function CommentCard({ comment, isSender }) {
  return (
    <Paper
      shadow="xs"
      py="xs"
      px="md"
      radius="lg"
      mt="sm"
      style={{
        background: isSender ? "#CCFFE5" : "#FFCCE5",
        minWidth: "200px",
      }}
    >
      <Stack gap="2px">
        <Text fw={700}>{!isSender && comment.createdBy.name}</Text>
        <Text>{comment.text}</Text>
        <Group justify="flex-end">
          <Text size="xs" c="dark.3" style={{ textAlign: "right" }}>
            {dayjs(comment.createdAt).format("D MMM YYYY, h:mm A ")}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
