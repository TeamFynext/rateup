import { Avatar, Group, Paper, Stack, Title, Text, Badge } from "@mantine/core";
import { useRouter } from "next/router";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import { useTeamsByUser } from "../../backend/team/team.query";

export const GroupCard = ({ group }) => {
  const router = useRouter();
  const createdAt = new Date(group?.createdAt);
  const date =
    createdAt.getDate() +
    "-" +
    (createdAt.getMonth() + 1) +
    "-" +
    createdAt.getFullYear();

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsData,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser() as {
    isLoading: boolean;
    error: any;
    data: TeamsResponse;
    refetch: any;
  };

  const teamObj = teamsData?.data?.find((team) => {
    return team?.teamId === group?.teamId;
  });

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
        <Stack gap={"sm"} justify={"center"} align={"center"}>
          <Avatar
            src={group?.icon ? getFileUrlFromKey(group?.icon) : null}
            alt="profile pic"
            radius="xl"
            size={60}
          ></Avatar>
          <Title order={3}>{group?.name}</Title>
        </Stack>
        <Stack gap={0}>
          <Title c="var(--tertiary-color)" order={3}>
            {group?.contacts?.length}
          </Title>
          <Text>customers</Text>
        </Stack>
      </Group>
      <Group justify="space-between" mt="md">
        <Text c="dimmed">created on {date}</Text>
        <Badge color="var(--tertiary-color)" variant="outline" size="lg">
          {teamObj?.teamName}
        </Badge>
      </Group>
    </Paper>
  );
};
