import { Group, Stack, Title, Text, Button, SimpleGrid } from "@mantine/core";
import {
  IconArrowRight,
  IconChevronRight,
  IconGift,
  IconUsersGroup,
} from "@tabler/icons-react";
import styles from "./styles.module.css";
import {
  useCampaigns,
  useLoyaltyInsights,
} from "../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { LCampaignCard } from "../../../components/loyalty/campaign/LCampaignCard";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { showSuccessToast } from "../../../utils/notifications";
import { InsightsCard } from "../../../components/loyalty/campaign/InsightsCard";

export default function LoyaltyDashboardPage() {
  const router = useRouter();

  return (
    <Stack>
      <Group align={"stretch"}>
        <Stack className={styles["card-container"]}>
          <Group>
            <Stack
              align="center"
              className={styles["card-container"]}
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/dashboard/loyalty/campaign/create")}
            >
              <IconGift size={64} />
              <Text>Create Loyalty Campaign</Text>
            </Stack>
            <Stack
              align={"center"}
              className={styles["card-container"]}
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/dashboard/loyalty/customer")}
            >
              <IconUsersGroup size={64} />
              <Text>View Customers</Text>
            </Stack>
          </Group>
          <Button
            variant={"light"}
            h={50}
            radius={12}
            onClick={() => router.push("/dashboard/loyalty/reward")}
          >
            Rewards
          </Button>
          <Button
            h={50}
            radius={12}
            onClick={() => showSuccessToast("Coming Soon")}
          >
            Redeem
          </Button>
        </Stack>
        <InsightsOverview />
      </Group>
      <RecentLoyaltyCampaigns />
    </Stack>
  );
}

function InsightsOverview() {
  const { data: insights } = useLoyaltyInsights();

  if (!insights) return;

  return (
    <Stack className={styles["card-container"]}>
      <SimpleGrid cols={2}>
        <InsightsCard
          value={insights.totalCustomers}
          text={`Loyal Customers`}
        />
        <InsightsCard
          value={insights.totalCampaigns}
          text={`Active Campaigns`}
        />
        <InsightsCard
          value={insights.totalPointsRewarded}
          text={`Rewarded Points`}
        />
        <InsightsCard
          value={insights.totalPointsRedeemed}
          text={`Redeemed Points`}
        />
      </SimpleGrid>
      <Button
        variant={"transparent"}
        rightSection={<IconArrowRight />}
        onClick={() => {
          notifications.show({ message: "Coming Soon" });
        }}
      >
        View More Insights
      </Button>
    </Stack>
  );
}

function RecentLoyaltyCampaigns() {
  const { data: campaigns } = useCampaigns(true);

  if (!campaigns) return;
  if (!Array.isArray(campaigns)) return;

  return (
    <Stack>
      <Group justify={"space-between"}>
        <Title order={3}>Recent Loyalty Campaign</Title>
        <Button variant={"transparent"} rightSection={<IconChevronRight />}>
          View All
        </Button>
      </Group>
      <Group>
        {campaigns.slice(0, 3).map((campaign) => (
          <LCampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </Group>
    </Stack>
  );
}
