import { Avatar, Group, Paper, Stack, Title, Text } from "@mantine/core";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import { useRouter } from "next/router";

export const GroupCard = ({ group }) => {
  const router = useRouter();
  return (
    <Paper
      shadow="xl"
      p="xl"
      radius="md"
      onClick={() => {
        router.push(`contacts/contact-group/${group.id}`);
      }}
    >
      <Group justify="space-between">
        <Stack gap={0}>
          <Avatar src={group?.profile} alt="profile pic" radius="xl"></Avatar>
          <Title order={4}>{group?.name}</Title>
        </Stack>
        <Stack gap={0}>
          <Title c="var(--tertiary-color)" order={3}>
            {group?.members?.length}
          </Title>

          <Text>customers</Text>
        </Stack>
      </Group>
      <Group justify="space-between" mt="md">
        <Text c="dimmed">created on {group?.createdAt}</Text>
        <RateupButtonSecondary title="Team id"></RateupButtonSecondary>
      </Group>
    </Paper>
  );
};
