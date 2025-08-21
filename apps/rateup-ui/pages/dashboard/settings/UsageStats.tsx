import { Center, Group, Loader, Stack, Title } from "@mantine/core";
import {
  IconAward,
  IconBrandOpenai,
  IconCategoryFilled,
  IconCheck,
  IconClipboardList,
  IconClockFilled,
  IconEyeFilled,
  IconHandClick,
  IconMessage,
  IconMessageCircle2Filled,
  IconRefresh,
  IconSocial,
  IconUsers,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useUsageStats } from "../../../backend/stats/stats.query";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import {
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import classes from "./setting.module.css";

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
  );
};
export const TeamStats = ({ stats, refetch, isRefetching, subscription }) => {
  const translations = useTranslations();
  const statsArray = [
    {
      Icon: IconSocial as unknown as string,
      count: stats?.teamsCount,
      totalCount: subscription?.features?.team?.count?.max,
      stats: "Teams",
    },
    {
      Icon: IconUsers as unknown as string,
      count: stats?.teamMembersCount,
      totalCount: subscription?.features?.team?.teamMember?.count?.max,
      stats: "Team Staff",
    },
  ];

  return (
    <Stack gap={"xs"}>
      <Group justify="space-between">
        <Title order={4}>Team</Title>
        <RateupButtonSecondary
          title={translations("Refetch Stats")}
          onClick={async () => {
            showLoadingToast(
              translations("Hold on...data getting updated."),
              "usage-stats",
              true,
              translations("Refreshing Stats"),
            );
            await refetch();
            showSuccessToast(
              translations("Updated Succesfully"),
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

export const MenuStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const isActive = subscription?.features?.menu?.active;
  if (!isActive) return;
  const statsArray = [
    {
      Icon: IconCategoryFilled as unknown as string,
      count: stats?.menusCount,
      totalCount: subscription?.features?.menu?.count?.max,
      stats: "Menus",
    },
    {
      Icon: IconEyeFilled as unknown as string,
      count: stats?.monthlyMenuViews,
      totalCount: subscription?.features?.menu?.count?.monthlyViewLimit,
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
      <Title order={4}>{translations("Menu")}</Title>
      <Group>
        {statsArray.map((item, index) => (
          <StatsCard {...item} key={index} />
        ))}
      </Group>
    </Stack>
  );
};
export const SurveyStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const isActive = subscription?.features?.webSurvey?.active;
  if (!isActive) return;
  const totalSurveyCount = subscription?.features?.webSurvey?.count?.max;
  const statsArray = [
    {
      Icon: IconClockFilled as unknown as string,
      count: stats?.monthlySurveyResponses,
      totalCount:
        subscription?.features?.webSurvey?.count?.monthlyResponseLimit,
      stats: "Monthly Responses",
    },
    {
      Icon: IconClipboardList as unknown as string,
      count: stats?.surveysCount,
      totalCount: totalSurveyCount,
      stats: "Surveys",
    },
    {
      Icon: IconMessageCircle2Filled as unknown as string,
      count: stats?.surveyResponsesCount,
      stats: "Total Responses",
    },
  ];

  return (
    <Stack gap={"xs"}>
      <Title order={4}>{translations("Web Survey")}</Title>
      <Group>
        {statsArray.map((item, index) => (
          <StatsCard {...item} key={index} />
        ))}
      </Group>
    </Stack>
  );
};
export const WhatsappStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const isActive = subscription?.features?.whatsapp?.active;
  if (!isActive) return;
  const statsArray = [
    {
      Icon: IconClockFilled as unknown as string,
      count: subscription?.isAnnualMessageLimit
        ? stats?.annualTemplateMessageCount
        : stats?.monthlyTemplateMessageCount,
      totalCount: subscription?.isAnnualMessageLimit
        ? subscription?.features?.whatsapp?.count?.monthlyMessageLimit * 12
        : subscription?.features?.whatsapp?.count?.monthlyMessageLimit,
      stats: subscription?.isAnnualMessageLimit
        ? "Annual Message"
        : "Monthly Message",
    },
    {
      Icon: IconMessage as unknown as string,
      count: stats?.templateMessagesCount,
      stats: "Total Message",
    },
    {
      Icon: IconClipboardList as unknown as string,
      count: stats?.waSurveysCount,
      totalCount: subscription?.features?.whatsapp?.flow?.count?.max,
      stats: "Flow Surveys",
    },
    // {
    //   Icon: IconClockFilled as unknown as string,
    //   count: stats?.monthlyWaSurveyResponses,
    //   totalCount: totalStats?.whatsapp?.count?.monthlyResponseLimit,
    //   stats: "Monthly Flow Responses",
    // },
    // {
    //   Icon: IconMessageCircle2Filled as unknown as string,
    //   count: stats?.waSurveyResponsesCount,
    //   stats: "Total Flow Responses",
    // },
  ];

  return (
    <Stack gap={"xs"}>
      <Title order={4}>{translations("Whatsapp")}</Title>
      <Group>
        {statsArray.map((item, index) => (
          <StatsCard {...item} key={index} />
        ))}
      </Group>
    </Stack>
  );
};

const AIStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const aiFeature = subscription?.features?.ai;
  if (!aiFeature || !aiFeature?.active) return;
  const statsArray = [
    {
      Icon: IconBrandOpenai as unknown as string,
      count: stats?.aiPromptTokensCount,
      totalCount: aiFeature?.count.promptTokens,
      stats: "Input Tokens",
    },
    {
      Icon: IconBrandOpenai as unknown as string,
      count: stats?.aiCompletionTokensCount,
      totalCount: aiFeature?.count.completionTokens,
      stats: "Output Tokens",
    },
  ];
  return (
    <Stack gap={"xs"}>
      <Title order={4}>{translations("AI")}</Title>
      <Group>
        {statsArray.map((item, index) => (
          <StatsCard {...item} key={index} />
        ))}
      </Group>
    </Stack>
  );
};

const LoyaltyStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const loyalty = subscription?.features?.loyalty;
  if (!loyalty || !loyalty?.active) return;
  const statsArray = [
    {
      Icon: IconHandClick as unknown as string,
      count: stats?.loyaltyActionCount,
      totalCount: loyalty?.action?.count?.max,
      stats: "Actions",
    },
    {
      Icon: IconAward as unknown as string,
      count: stats?.loyaltyRewardCount,
      totalCount: loyalty?.reward?.count?.max,
      stats: "Rewards",
    },
    {
      Icon: IconUsers as unknown as string,
      count: stats?.loyaltyCustomerCount,
      totalCount: loyalty?.customer?.count?.max,
      stats: "Customers",
    },
  ];
  return (
    <Stack gap={"xs"}>
      <Title order={4}>{translations("Loyalty")}</Title>
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
            subscription={subscription}
            isRefetching={isRefetching}
            refetch={refetch}
          />
          <SurveyStats stats={stats} subscription={subscription} />
          <MenuStats stats={stats} subscription={subscription} />
          <WhatsappStats stats={stats} subscription={subscription} />
          <AIStats stats={stats} subscription={subscription} />
          <LoyaltyStats stats={stats} subscription={subscription} />
        </Stack>
      )}
    </>
  );
};

export default UsageStats;
