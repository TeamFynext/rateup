import { Avatar, Group, Paper, Stack, Title, Text, Badge } from "@mantine/core";
import { useRouter } from "next/router";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import { useTeamsByUser } from "../../backend/team/team.query";
import dayjs from "dayjs";

export const ContactGroupCard = ({ group }) => {
  const router = useRouter();
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
    return team?.id === group?.teamId;
  });

  return (
    <Paper
      shadow="xl"
      p="xl"
      radius="md"
      onClick={() => {
        router.push(`contacts/${group.id}`);
      }}
      style={{
        cursor: "pointer",
      }}
    >
      <Group justify="space-between">
        <Stack gap={"sm"} justify={"center"} align={"center"}>
          <Avatar
            src={
              group?.icon
                ? getFileUrlFromKey(group?.icon)
                : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/user-group-icon-t.png`
            }
            alt="profile pic"
            radius="xl"
            size={60}
          ></Avatar>
          <Title order={3}>{group?.name}</Title>
        </Stack>
        <Stack gap={0} align="center">
          <Title c="var(--tertiary-color)" order={3}>
            {group?._count.contacts}
          </Title>
          <Text>customers</Text>
        </Stack>
      </Group>
      <Group justify="space-between" mt="md">
        <Text c="dimmed">
          created on {dayjs(group?.createdAt).format("DD-MM-YYYY")}
        </Text>
        <Badge color="var(--tertiary-color)" variant="outline" size="lg">
          {teamObj?.name}
        </Badge>
      </Group>
    </Paper>
  );
};
