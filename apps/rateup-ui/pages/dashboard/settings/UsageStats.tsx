import { Center, Group, Loader, Stack, Title } from "@mantine/core";
import { useUsageStats } from "../../../backend/stats/stats.query";
import {
  IconCategoryFilled,
  IconClipboardList,
  IconClockFilled,
  IconEyeFilled,
  IconMessageCircle2Filled,
  IconRefresh,
  IconSocial,
  IconUsers,
} from "@tabler/icons-react";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";

export const StatsCard = ({
  Icon,
  count,
  stats,
}: {
  Icon: string;
  count: number;
  stats: string;
}) => {
  return (
    <>
      <PaperLayout w={350}>
        <Group>
          <Center
            bg={"var(--tertiary-color)"}
            p={"sm"}
            style={{ borderRadius: "5px", color: "white" }}
          >
            <Icon />
          </Center>
          <Stack gap={1}>
            <Title order={2}>{count}</Title>
            <Title order={4} fw={400}>
              {stats}
            </Title>
          </Stack>
        </Group>
      </PaperLayout>
    </>
  );
};
export const TeamStats = ({ stats }) => {
  const statsArray = [
    {
      Icon: IconSocial as unknown as string,
      count: stats?.teamsCount,
      stats: "Teams",
    },
    {
      Icon: IconUsers as unknown as string,
      count: stats?.teamMembersCount,
      stats: "Team Members",
    },
  ];
  return (
    <>
      <Title order={4}>Team Stats</Title>
      <Group>
        {statsArray.map((item) => (
          <StatsCard {...item} />
        ))}
      </Group>
    </>
  );
};

export const MenuStats = ({ stats }) => {
  const statsArray = [
    {
      Icon: IconCategoryFilled as unknown as string,
      count: stats?.menusCount,
      stats: "Menus",
    },
    {
      Icon: IconEyeFilled as unknown as string,
      count: stats?.monthlyMenuViews,
      stats: "Monthly Menu view",
    },
    {
      Icon: IconEyeFilled as unknown as string,
      count: stats?.menuViewsCount,
      stats: "Total Menu view",
    },
  ];
  return (
    <>
      <Title order={4}>Menu Stats</Title>
      <Group>
        {statsArray.map((item) => (
          <StatsCard {...item} />
        ))}
      </Group>
    </>
  );
};
export const SurveyStats = ({ stats }) => {
  const statsArray = [
    {
      Icon: IconClipboardList as unknown as string,
      count: stats?.surveysCount,
      stats: "Surveys",
    },
    {
      Icon: IconClockFilled as unknown as string,
      count: stats?.monthlySurveyResponses,
      stats: "Monthly Responses",
    },
    {
      Icon: IconMessageCircle2Filled as unknown as string,
      count: stats?.surveyResponsesCount,
      stats: "Total Responses",
    },
  ];
  return (
    <>
      <Title order={4}>Survey Stats</Title>
      <Group>
        {statsArray.map((item) => (
          <StatsCard {...item} />
        ))}
      </Group>
    </>
  );
};
const UsageStats = () => {
  const { data: stats, isPending, refetch, isFetching } = useUsageStats();
  return (
    <>
      {isFetching ? (
        <Loader type="bars" />
      ) : (
        <Stack gap={"md"}>
          <TeamStats stats={stats} />
          <SurveyStats stats={stats} />
          <MenuStats stats={stats} />
        </Stack>
      )}
    </>
  );
};

export default UsageStats;
