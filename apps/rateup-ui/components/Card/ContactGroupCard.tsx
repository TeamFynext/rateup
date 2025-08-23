import { useRouter } from "next/router";

import { Avatar, Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconUsersGroup } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { useTeamsByUser } from "../../backend/team/team.query";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import PaperLayout from "../styled/Layouts/PaperLayout";

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
  const translations = useTranslations();
  const teamObj = teamsData?.data?.find((team) => {
    return team?.id === group?.teamId;
  });

  return (
    <PaperLayout
      p="xl"
      hoveractive
      onClick={() => {
        router.push(`contacts/${group.id}`);
      }}
    >
      <Group justify="space-between">
        <Stack gap={"sm"} justify={"center"} align={"center"}>
          <Avatar
            src={group?.icon && getFileUrlFromKey(group?.icon)}
            alt="profile pic"
            size={60}
            radius={"md"}
          >
            <IconUsersGroup />
          </Avatar>
          <Title order={3}>{group?.name}</Title>
        </Stack>
        <Stack gap={0} align="center">
          <Title c="var(--tertiary-color)" order={3}>
            {group?._count.contacts}
          </Title>
          <Text>{translations("members")}</Text>
        </Stack>
      </Group>
      <Group justify="space-between" mt="md">
        <Text c="dimmed">
          {translations("created on")}{" "}
          {dayjs(group?.createdAt).format("DD-MM-YYYY")}
        </Text>
        <Badge color="var(--tertiary-color)" variant="outline" size="lg">
          {teamObj?.name}
        </Badge>
      </Group>
    </PaperLayout>
  );
};
