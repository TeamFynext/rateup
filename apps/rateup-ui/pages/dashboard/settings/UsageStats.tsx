import {
  Center,
  Group,
  Loader,
  ScrollAreaAutosize,
  Stack,
  Title,
} from "@mantine/core";
import { useUsageStats } from "../../../backend/stats/stats.query";
import {
  IconCategoryFilled,
  IconCheck,
  IconClipboardList,
  IconClockFilled,
  IconEyeFilled,
  IconMessageCircle2Filled,
  IconRefresh,
  IconSocial,
  IconUsers,
} from "@tabler/icons-react";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import classes from "./setting.module.css";
import {
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";

export const StatsCard = ({
  Icon,
  count,
  totalCount,
  stats,
}: {
  Icon: string;
  count: number;
  totalCount?: number;
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
            <Title order={3}>
              {count}
              {totalCount ? `/${totalCount}` : ""}
            </Title>
            <Title order={4} fw={400}>
              {stats}
            </Title>
          </Stack>
        </Group>
      </PaperLayout>
    </>
  );
};
export const TeamStats = ({ stats, refetch, isRefetching, totalStats }) => {
  const statsArray = [
    {
      Icon: IconSocial as unknown as string,
      count: stats?.teamsCount,
      totalCount: totalStats?.team?.count?.max,
      stats: "Teams",
    },
    {
      Icon: IconUsers as unknown as string,
      count: stats?.teamMembersCount,
      totalCount: totalStats?.team?.teamMember?.count?.max,
      stats: "Team Members",
    },
  ];

  return (
    <Stack gap={"xs"}>
      <Group justify="space-between">
        <Title order={4}>Team Stats</Title>
        <RateupButtonSecondary
          title="Refetch Stats"
          onClick={async () => {
            showLoadingToast(
              "Hold on...data getting updated.",
              "usage-stats",
              true,
              "Refreshing Stats",
            );
            await refetch();
            showSuccessToast(
              "Updated Succesfully",
              "usage-stats",
              <IconCheck />,
              true,
            );
          }}
          leftIcon={
            <IconRefresh
              className={isRefetching ? classes.rotateInfinitely : null}
              style={{ width: "90%", height: "90%" }}
              stroke={1.5}
            />
          }
        />
      </Group>
      <Group>
        {statsArray.map((item, index) => (
          <StatsCard {...item} key={index} />
        ))}
      </Group>
    </Stack>
  );
};

export const MenuStats = ({ stats, totalStats }) => {
  const statsArray = [
    {
      Icon: IconCategoryFilled as unknown as string,
      count: stats?.menusCount,
      totalCount: totalStats?.menu?.count?.max,
      stats: "Menus",
    },
    {
      Icon: IconEyeFilled as unknown as string,
      count: stats?.monthlyMenuViews,
      totalCount: totalStats?.menu?.count?.monthlyViewLimit,
      stats: "Monthly Menu view",
    },
    {
      Icon: IconEyeFilled as unknown as string,
      count: stats?.menuViewsCount,
      stats: "Total Menu view",
    },
  ];
  return (
    <Stack gap={"xs"}>
      <Title order={4}>Menu Stats</Title>
      <Group>
        {statsArray.map((item, index) => (
          <StatsCard {...item} key={index} />
        ))}
      </Group>
    </Stack>
  );
};
export const SurveyStats = ({ stats, totalStats }) => {
  const totalSurveyCount =
    totalStats?.webSurvey?.count?.max + totalStats?.whatsappSurvey?.count?.max;
  const statsArray = [
    {
      Icon: IconClipboardList as unknown as string,
      count: stats?.surveysCount,
      totalCount: totalSurveyCount,
      stats: "Surveys",
    },
    {
      Icon: IconClockFilled as unknown as string,
      count: stats?.monthlySurveyResponses,
      totalCount: totalStats?.webSurvey?.count?.monthlyResponseLimit,
      stats: "Monthly Responses",
    },
    {
      Icon: IconMessageCircle2Filled as unknown as string,
      count: stats?.surveyResponsesCount,
      stats: "Total Responses",
    },
  ];

  return (
    <Stack gap={"xs"}>
      <Title order={4}>Survey Stats</Title>
      <Group>
        {statsArray.map((item, index) => (
          <StatsCard {...item} key={index} />
        ))}
      </Group>
    </Stack>
  );
};
const UsageStats = ({ subscription }) => {
  const { data: stats, refetch, isRefetching, isLoading } = useUsageStats();
  return (
    <>
      {isLoading ? (
        <Loader type="bars" />
      ) : (
        <Stack gap={"xl"} w={"fit-content"} pl={"xl"}>
          <TeamStats
            stats={stats}
            totalStats={subscription?.features}
            isRefetching={isRefetching}
            refetch={refetch}
          />
          <SurveyStats stats={stats} totalStats={subscription?.features} />
          <MenuStats stats={stats} totalStats={subscription?.features} />
        </Stack>
      )}
    </>
  );
};

export default UsageStats;
