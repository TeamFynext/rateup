import {
  ActionIcon,
  Divider,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import React from "react";
import { useUsageStats } from "../../../backend/stats/stats.query";
import { notifications } from "@mantine/notifications";
import { IconRefresh } from "@tabler/icons-react";

const UsageStats = () => {
  const { data: stats, isPending, refetch } = useUsageStats();

  return (
    <Stack style={{ maxWidth: "1000px" }} mb="xl">
      <Group gap={"md"}>
        <Title order={2}>Usage Stats</Title>
        <Tooltip label="Refresh data">
          <ActionIcon
            variant="light"
            ml="sm"
            mr="50px"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              refetch();
              notifications.show({
                id: "load-data",
                color: "teal",
                title: "Refreshing data",
                loading: true,
                message: "Hold.. your data is getting update...",
                autoClose: 2000,
              });
            }}
          >
            <IconRefresh style={{ width: "80%", height: "80%" }} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Divider mb="md" />
      <Group>
        <Stack mb="xl">
          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Teams :
            </Title>
            <Text> {stats?.teamsCount}</Text>
          </Group>

          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Team Members :
            </Title>
            <Text> {stats?.teamMembersCount} </Text>
          </Group>
        </Stack>

        <Stack mb="xl">
          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Surveys :
            </Title>
            <Text> {stats?.surveysCount} </Text>
          </Group>

          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Total Responses :
            </Title>
            <Text> {stats?.surveyResponsesCount} </Text>
          </Group>

          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Monthly Responses :
            </Title>
            <Text> {stats?.monthlySurveyResponses} </Text>
          </Group>
        </Stack>
        <Stack mb="xl">
          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Menus :
            </Title>
            <Text> {stats?.menusCount} </Text>
          </Group>

          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Total Menu Views :
            </Title>
            <Text> {stats?.menuViewsCount} </Text>
          </Group>

          <Group ml="xl">
            <Title order={4} style={{ minWidth: "140px" }}>
              Monthly Menu Views :
            </Title>
            <Text> {stats?.monthlyMenuViews} </Text>
          </Group>
        </Stack>
      </Group>
    </Stack>
  );
};

export default UsageStats;
