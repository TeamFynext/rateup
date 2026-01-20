"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Avatar,
  Badge,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconAward,
  IconCircle1,
  IconCoin,
  IconHandClick,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { Range } from "react-date-range";

import { LoyaltyActionType } from "@/types/enums";
import { ActiveStatusBadge } from "@/app/dashboard/apps&services/shopify/page";
import { useGetLoyaltyCustomerById } from "@/backend/loyalty/customer/customer.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import LCustomerActionView, {
  DetailedViewHeader,
} from "@/components/LoyaltyComponents/Customer/LCustomerActionView";
import LCustomerGraph from "@/components/LoyaltyComponents/Customer/LCustomerGraph";
import LCustomerPointsView, {
  LPointStats,
} from "@/components/LoyaltyComponents/Customer/LCustomerPointsView";
import { LoyaltyTemplateTypes } from "@/components/LoyaltyComponents/LoyaltySettings";
import { CustomerStatsCard } from "@/components/LoyaltyComponents/utils";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TableLayoutSecondary from "@/components/styled/Table/TableLayoutSecondary";
import { useRouteParams } from "@/context/RouteParamsContext";
import {
  formatDate,
  formateDate2,
  formatIsoDateStringWithTime,
} from "@/utils/dateTime";

import { getRedeemsStatusColor, RedeemStatus } from "../../redeem/page";

export enum LCustomerStats {
  TotalActions = "Total Actions",
  PointsEarned = "Points Earned",
  RewardsRedeemed = "Rewards",
  Referrals = "Referrals",
  TotalSpent = "Total Spent",
}

export function getLCustomerStatsIcon(stats: LCustomerStats) {
  switch (stats) {
    case LCustomerStats.TotalActions:
      return <IconHandClick color="var(--tertiary-color)" />;
    case LCustomerStats.PointsEarned:
      return <IconCircle1 color="var(--tertiary-color)" />;
    case LCustomerStats.Referrals:
      return <IconUsers color="var(--tertiary-color)" />;
    case LCustomerStats.RewardsRedeemed:
      return <IconAward color="var(--tertiary-color)" />;
    case LCustomerStats.TotalSpent:
      return <IconCoin color="var(--tertiary-color)" />;
  }
}

const LoyaltyCustomerID = () => {
  const [activeStats, setActiveStats] = useState<
    LCustomerStats | LoyaltyActionType | LPointStats
  >(LCustomerStats.TotalActions);
  const [range, setRange] = useState<Range[]>([]);
  const router = useRouter();
  const params = useParams();
  const { customerId } = params;

  useEffect(() => {
    if (customerId === "group") router.push("/dashboard/loyalty/customer");
  }, [customerId]);
  const {
    data: customer,
    isLoading,
    isError,
    refetch,
  } = useGetLoyaltyCustomerById(customerId);
  const isInRange = (date) =>
    dayjs(date).isBetween(
      dayjs(range[0].startDate),
      dayjs(range[0].endDate),
      null,
      "[]",
    );

  const actions = range.length
    ? customer?.actions?.filter((a) => isInRange(a?.createdAt))
    : customer?.actions;
  const redeems = range.length
    ? customer?.redeems?.filter((r) => isInRange(r?.createdAt))
    : customer?.redeems;
  const pointStat = range.length
    ? getGraphData(LPointStats.TotalPoints)?.reduce(
        (acc, i) => {
          acc["totalPoints"] += i[LPointStats.TotalPoints];
          acc["totalSpentPoints"] += i[LPointStats.PointSpent];
          return acc;
        },
        { totalPoints: 0, totalSpentPoints: 0 },
      )
    : {
        totalPoints: customer?.totalEarnedPoints ?? 0,
        totalSpentPoints: customer?.redeemedPoints ?? 0,
      };

  const { update } = useRouteParams();

  const stats = Object.values(LCustomerStats).map((s) => ({
    name: s,
    icon: getLCustomerStatsIcon(s),
    count: customer?.stats?.[s],
  }));

  useEffect(() => {
    update({ customerId: customer?.Contact?.name });
  }, [customer]);

  function getGraphData(activeStats) {
    let graphData = [];
    let data = [];
    actions?.forEach((a) => {
      const index = data.findIndex(
        (d) => d?.date === formateDate2(a.createdAt),
      );
      if (index !== -1) {
        data[index][a.action.type] += 1;
      } else {
        const obj = {
          date: formateDate2(a.createdAt),
        };
        Object.values(LoyaltyActionType).map((t) => {
          obj[t] = a.action.type === t ? 1 : 0;
        });
        data.push(obj);
      }
    });
    switch (activeStats) {
      case LCustomerStats.TotalActions:
        graphData = [...data];
        break;
      case LoyaltyActionType.ReferralPurchase:
        graphData = data.map((d) => ({
          date: d.date,
          [LoyaltyActionType.ReferralPurchase]:
            d[LoyaltyActionType.ReferralPurchase],
        }));
        break;
      case LoyaltyActionType.CustomerRegistration:
        graphData = data.map((d) => ({
          date: d.date,
          [LoyaltyActionType.CustomerRegistration]:
            d[LoyaltyActionType.CustomerRegistration],
        }));
        break;
      case LoyaltyActionType.DirectPurchase:
        graphData = data.map((d) => ({
          date: d.date,
          [LoyaltyActionType.DirectPurchase]:
            d[LoyaltyActionType.DirectPurchase],
        }));
        break;
      case LCustomerStats.PointsEarned:
      case LPointStats.PointSpent:
      case LPointStats.TotalPoints:
        actions?.forEach((a) => {
          const index = graphData.findIndex(
            (d) => d?.date === formateDate2(a.createdAt),
          );
          let points = a.action.points;
          if (a.action.isAmountBased)
            points = Math.round((points / a.action.amount) * a.amount);
          if (a.action.type === LoyaltyActionType.ReferralPurchase) {
            if (!a.refereePhone) points = a.action.refereePoints;
            if (a.action.isAmountBasedForReferee)
              points = Math.round((points / a.action.amount) * a.amount);
          }
          if (index !== -1) {
            graphData[index][LPointStats.TotalPoints] += points;
          } else {
            const obj = {
              date: formateDate2(a.createdAt),
              [LPointStats.PointSpent]: 0,
              [LPointStats.TotalPoints]: points,
            };
            graphData.push(obj);
          }
        });

        redeems
          ?.filter((r) => r.status !== RedeemStatus.FAILED)
          .forEach((r) => {
            const index = graphData.findIndex(
              (d) => d?.date === formateDate2(r.createdAt),
            );
            let points = r.reward.points;
            if (index !== -1) {
              graphData[index][LPointStats.PointSpent] += points;
            } else {
              const obj = {
                date: formateDate2(r.createdAt),
                [LPointStats.PointSpent]: points,
                [LPointStats.TotalPoints]: 0,
              };
              graphData.push(obj);
            }
          });
        break;
      case LCustomerStats.RewardsRedeemed:
        redeems?.forEach((r) => {
          const index = graphData.findIndex(
            (d) => d?.date === formateDate2(r.createdAt),
          );
          if (index !== -1) {
            graphData[index][r.status] += 1;
          } else {
            const obj = {
              date: formateDate2(r.createdAt),
              [RedeemStatus.CLAIMED]: 0,
              [RedeemStatus.ISSUED]: 0,
              [RedeemStatus.FAILED]: 0,
            };
            obj[r.status] = 1;
            graphData.push(obj);
          }
        });
        break;
      case LCustomerStats.Referrals:
        graphData = data.map((d) => ({
          date: d.date,
          Referrals: d[LoyaltyActionType.ReferralPurchase],
          "Points Earned": getGraphData(LCustomerStats.PointsEarned).find(
            (p) => p.date === d.date,
          )[LPointStats.TotalPoints],
        }));
        break;
      case LCustomerStats.TotalSpent:
        actions
          ?.filter((a) => a.amount && !a.refereePhone)
          .forEach((a) => {
            const index = graphData.findIndex(
              (d) => d?.date === formateDate2(a.createdAt),
            );
            if (index !== -1) {
              graphData[index]["Total Spent"] += a.amount;
              graphData[index]["Number of purchases"] += 1;
            } else {
              const obj = {
                date: formateDate2(a.createdAt),
                "Total Spent": a.amount,
                "Number of purchases": 1,
              };
              graphData.push(obj);
            }
          });
        break;
    }
    return graphData;
  }

  useEffect(() => {
    const length = customer?.actions?.length;
    if (length && !range.length) {
      setRange([
        {
          startDate: new Date(customer.actions[length - 1].createdAt),
          endDate: new Date(),
          key: "selection",
        },
      ]);
    }
  }, [customer, range]);

  if (isLoading) return <RateupLoader />;
  if (isError) return <ErrorComponent refetch={refetch} />;

  return (
    <Stack>
      <Stack
        style={{ border: "2px solid var(--light-blue-5)", borderRadius: 10 }}
        p={"xs"}
      >
        <Group justify="space-between" pl={"lg"} pr={"xl"}>
          <Group>
            <Avatar
              size={"lg"}
              name={customer?.Contact?.name}
              color="initials"
            />
            <Stack gap={1}>
              <Text fw={500}>{customer?.Contact?.name}</Text>
              <Group c={"orange"} gap={2}>
                <IconCircle1 size={"1rem"} stroke={3} />
                <Text size="sm">{customer?.balancePoints} Points</Text>
              </Group>
            </Stack>
          </Group>

          {customer?.referralCodes?.[0]?.referralCode && (
            <ContainedTextField
              value={`Referral code - ${customer?.referralCodes?.[0]?.referralCode}`}
              readOnly
              rightSection={
                <ApiCopyButton
                  value={customer?.referralCodes?.[0]?.referralCode}
                />
              }
            />
          )}
          <Group gap={50}>
            {[
              { key: "Mobile Number", value: customer?.Contact?.phone },
              { key: "Joined", value: formatDate(customer?.createdAt) },
              {
                key: "Last Activity",
                value: formatDate(customer?.lastActivityAt),
              },
            ].map((i) => (
              <Stack key={i.key} gap={0}>
                <Text c="dimmed" size="xs">
                  {i.key}
                </Text>
                <Text size="xs">{i.value}</Text>
              </Stack>
            ))}
          </Group>
          <ActiveStatusBadge active={customer?.active} mr={"xl"} />
        </Group>
      </Stack>
      <PaperLayout p={"xs"} bg={"var(--grey-color-5)"}>
        <SimpleGrid cols={5}>
          {stats.map((s) => (
            <CustomerStatsCard
              stats={s}
              key={s.name}
              onClick={() => setActiveStats(s.name as LCustomerStats)}
              isSelected={activeStats === s.name}
              hoveractive
            />
          ))}
        </SimpleGrid>
      </PaperLayout>
      <PaperLayout p={"xs"} bg={"var(--light-blue-5)"}>
        <Grid columns={3}>
          <Grid.Col span={1}>
            <PaperLayout px={0} pt={"lg"}>
              <DetailedViewHeader
                activeStats={activeStats}
                setActiveStats={setActiveStats}
                title={getStatsTitle(activeStats)[0]}
                range={range}
                setRange={setRange}
              />
              {getDetailedView(
                activeStats,
                setActiveStats,
                actions,
                redeems,
                pointStat?.totalPoints,
                pointStat?.totalSpentPoints,
              )}
            </PaperLayout>
          </Grid.Col>
          <Grid.Col span={2}>
            <PaperLayout>
              <LCustomerGraph
                title={
                  getStatsTitle(activeStats)[1] ?? getStatsTitle(activeStats)[0]
                }
                data={getGraphData(activeStats)}
                activeStats={activeStats}
              />
            </PaperLayout>
          </Grid.Col>
        </Grid>
      </PaperLayout>
    </Stack>
  );
};

export default LoyaltyCustomerID;

function getDetailedView(
  stats,
  setActiveStats,
  actions,
  redeems,
  totalPoints,
  redeemedPoints,
) {
  function getActionHistory(stats) {
    return actions
      .filter((a) => a.action.type === stats)
      .map((a) => {
        let points = a.action.points;
        if (a.action.reward) {
          points = `${a.action.reward.name} reward`;
        } else {
          if (a.action.isAmountBased)
            points = Math.round((points / a.action.amount) * a.amount);
        }
        if (a.action.type === LoyaltyActionType.ReferralPurchase) {
          if (!a.refereePhone) {
            if (a.action.refereeReward)
              points = `${a.action.refereeReward.name} reward`;
            else {
              points = a.action.refereePoints;
              if (a.action.isAmountBasedForReferee)
                points = Math.round((points / a.action.amount) * a.amount);
            }
          }
        }
        return {
          name: a.action.name,
          createdAt: formatIsoDateStringWithTime(a.createdAt),
          points,
        };
      });
  }

  const pointStats = {
    [LPointStats.TotalPoints]: totalPoints,
    [LPointStats.PointSpent]: redeemedPoints,
    [LPointStats.PointBalance]: totalPoints - redeemedPoints,
    [LPointStats.PointEaringRate]: "NA",
  };

  switch (stats) {
    case LCustomerStats.TotalActions:
      return (
        <LCustomerActionView
          setActiveStats={setActiveStats}
          actions={actions}
        />
      );
    case LCustomerStats.PointsEarned:
      return (
        <LCustomerPointsView
          setActiveStats={setActiveStats}
          stats={pointStats}
        />
      );
    case LCustomerStats.RewardsRedeemed:
      return <LCustomerRewardView redeems={redeems} />;
    case LCustomerStats.Referrals:
      return <LCsutomerReferralView actions={actions} />;
    case LCustomerStats.TotalSpent:
      return <LCustomerAmountSpentView actions={actions} />;
    case LPointStats.PointSpent:
      return <LCustomerPointSpentView redeems={redeems} />;
    case LPointStats.TotalPoints:
      return <LCustomerPointEarnedView actions={actions} />;
    case LoyaltyActionType.ReferralPurchase:
    case LoyaltyActionType.DirectPurchase:
    case LoyaltyActionType.CustomerRegistration:
      return <ActionHistory rows={getActionHistory(stats)} />;
  }
}

function getStatsTitle(activeStats) {
  switch (activeStats) {
    case LCustomerStats.TotalActions:
      return ["Action Summary", "Total Actions"];
    case LCustomerStats.PointsEarned:
    case LPointStats.TotalPoints:
      return ["Points Summary", "Total Points Earned"];
    case LCustomerStats.RewardsRedeemed:
      return ["Rewards Summary", "Rewards Redeemed"];
    case LCustomerStats.Referrals:
      return ["Referral Summary", "Referrals"];
    case LCustomerStats.TotalSpent:
      return ["Spent Summary", "Total Spent"];
    case LoyaltyTemplateTypes.CustomerRegistration:
      return ["Customer Registration"];
    case LoyaltyActionType.DirectPurchase:
      return ["Direct Purchase"];
    case LoyaltyActionType.ReferralPurchase:
      return ["Referral Purchase"];
    case LPointStats.PointSpent:
      return [LPointStats.PointSpent];
  }
}

const LCustomerRewardView = ({ redeems }) => {
  const rows = redeems
    ?.filter((r) => r.status !== RedeemStatus.FAILED)
    .map((r) => ({
      points: r.reward.points,
      reward: r.reward.name,
      status: r.status,
      createdAt: formatIsoDateStringWithTime(r.createdAt),
    }));
  const columns = [
    {
      key: "points",
      value: "Points",
      width: 50,
    },
    {
      key: "reward",
      value: "Reward",
      width: 50,
    },
    {
      key: "status",
      value: "Status",
      width: 50,
      renderCell: (status) => {
        return (
          <Badge color={getRedeemsStatusColor(status)} size="sm">
            {status}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      value: "Date",
      width: 50,
    },
  ];

  return (
    <TableLayoutSecondary
      columns={columns}
      rows={rows}
      minHeight={390}
      maxHeight={390}
      headerStyle={{ color: "var(--grey-color-6)", fontWeight: 500 }}
    />
  );
};
const LCsutomerReferralView = ({ actions }) => {
  const rows = actions
    ?.filter((a) => a.refereePhone)
    .map((a) => {
      let points = a.action.points;
      if (a.action.isAmountBased)
        points = Math.round((points / a.action.amount) * a.amount);
      return {
        points,
        referee: { refereeName: a.refereeName, refereePhone: a.refereePhone },
        createdAt: formatIsoDateStringWithTime(a.createdAt),
      };
    });
  const columns = [
    {
      key: "referee",
      value: "Referred Customer",
      width: 50,
      renderCell: ({ refereePhone, refereeName }) => {
        return (
          <Stack gap={0}>
            <Text size="sm" fw={500}>
              {refereeName}
            </Text>
            <Text size="sm">{refereePhone}</Text>
          </Stack>
        );
      },
    },
    {
      key: "createdAt",
      value: "Date",
      width: 50,
    },
    {
      key: "points",
      value: "Points",
      width: 50,
    },
  ];

  return (
    <TableLayoutSecondary
      columns={columns}
      rows={rows}
      minHeight={390}
      maxHeight={390}
      headerStyle={{ color: "var(--grey-color-6)", fontWeight: 500 }}
    />
  );
};
const LCustomerAmountSpentView = ({ actions }) => {
  const rows = actions
    ?.filter((a) => a.amount && !a.refereePhone)
    .map((a) => ({
      amount: "$" + a.amount,
      action: a.action.name,
      createdAt: formatIsoDateStringWithTime(a.createdAt),
    }));
  const columns = [
    {
      key: "action",
      value: "Action",
      width: 50,
    },
    {
      key: "amount",
      value: "Amount",
      width: 50,
    },
    {
      key: "createdAt",
      value: "Date",
      width: 50,
    },
  ];

  return (
    <TableLayoutSecondary
      columns={columns}
      rows={rows}
      minHeight={390}
      maxHeight={390}
      headerStyle={{ color: "var(--grey-color-6)", fontWeight: 500 }}
    />
  );
};
const LCustomerPointEarnedView = ({ actions }) => {
  const rows = actions
    ?.filter((a) => a.action.points || a.action.refereePoints)
    .map((a) => {
      let points = a.action.points;
      if (a.action.isAmountBased)
        points = Math.round((points / a.action.amount) * a.amount);
      if (a.action.type === LoyaltyActionType.ReferralPurchase) {
        if (!a.refereePhone) points = a.action.refereePoints;
        if (a.action.isAmountBasedForReferee)
          points = Math.round((points / a.action.amount) * a.amount);
      }
      return {
        points: points,
        action: a.action.name,
        createdAt: formatIsoDateStringWithTime(a.createdAt),
      };
    });
  const columns = [
    {
      key: "points",
      value: "Points",
      width: 50,
    },
    {
      key: "action",
      value: "Action",
      width: 50,
    },
    {
      key: "createdAt",
      value: "Date",
      width: 50,
    },
  ];

  return (
    <TableLayoutSecondary
      columns={columns}
      rows={rows}
      minHeight={390}
      maxHeight={390}
      headerStyle={{ color: "var(--grey-color-6)", fontWeight: 500 }}
    />
  );
};
const LCustomerPointSpentView = ({ redeems }) => {
  const rows = redeems
    ?.filter((r) => r.status !== RedeemStatus.FAILED)
    .map((r) => ({
      points: r.reward.points,
      reward: r.reward.name,
      createdAt: formatIsoDateStringWithTime(r.createdAt),
    }));
  const columns = [
    {
      key: "points",
      value: "Points",
      width: 50,
    },
    {
      key: "reward",
      value: "Reward",
      width: 50,
    },
    {
      key: "createdAt",
      value: "Date",
      width: 50,
    },
  ];

  return (
    <TableLayoutSecondary
      columns={columns}
      rows={rows}
      minHeight={390}
      maxHeight={390}
      headerStyle={{ color: "var(--grey-color-6)", fontWeight: 500 }}
    />
  );
};

const ActionHistory = ({ rows }) => {
  const columns = [
    {
      key: "name",
      value: "Name",
      width: 50,
    },
    {
      key: "createdAt",
      value: "Date",
      width: 50,
    },
    {
      key: "points",
      value: "Points",
      width: 50,
    },
  ];
  return (
    <TableLayoutSecondary
      columns={columns}
      rows={rows}
      minHeight={390}
      maxHeight={390}
      headerStyle={{ color: "var(--grey-color-6)", fontWeight: 500 }}
    />
  );
};
