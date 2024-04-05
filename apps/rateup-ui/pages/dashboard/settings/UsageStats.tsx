import { Divider, Group, Stack, Text, Title } from "@mantine/core";
import React from "react";
import { useUsageStats } from "../../../backend/stats/stats.query";

const UsageStats = () => {
  const { data: stats, isPending } = useUsageStats();

  return (
    <Stack style={{ maxWidth: "1000px" }} mb="xl">
      <Title order={2}>Usage Stats</Title>
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
