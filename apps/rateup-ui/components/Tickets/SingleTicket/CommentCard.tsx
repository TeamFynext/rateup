import { Avatar, Group, Paper, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";

export function CommentCard({ comment, isSender }) {
  let isNote = comment?.text?.startsWith("Note:");
  return (
    <Group>
      {!isSender && (
        <Avatar src={comment?.createdBy?.profilePhoto} size={"sm"} />
      )}
      <Paper
        shadow="xs"
        p={"xs"}
        radius="lg"
        mt="2px"
        style={{
          background: isNote ? "#fff" : isSender ? "#CCFFE5" : "#FFCCE5",
          maxWidth: "250px",
        }}
      >
        <Stack gap="2px">
          <Text fw={500}>{!isSender && comment.createdBy.name}</Text>
          <Text
            size={isNote ? "xs" : "sm"}
            c={isNote ? "var(--tertiary-color)" : "black"}
          >
            {comment.text}
          </Text>
          <Group justify="flex-end">
            <Text
              fz={10}
              c={isNote ? "dark.0" : "dark.3"}
              style={{ textAlign: "right" }}
            >
              {dayjs(comment.createdAt).format("D MMM YYYY, h:mm A ")}
            </Text>
          </Group>
        </Stack>
      </Paper>
    </Group>
  );
}
