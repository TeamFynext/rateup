import { useRouter } from "next/router";

import {
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowRight,
  IconChevronRight,
  IconGift,
  IconUsersGroup,
} from "@tabler/icons-react";

import {
  useCampaigns,
  useLoyaltyInsights,
} from "@/backend/loyalty/campaign/loyaltyCampaign.query";
import { InsightsCard } from "@/components/loyalty/campaign/InsightsCard";
import { LCampaignCard } from "@/components/loyalty/campaign/LCampaignCard";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import useTranslations from "@/dictionaries/useTranslation";
import { showSuccessToast } from "@/utils/notifications";

import styles from "./styles.module.css";

export default function LoyaltyDashboardPage() {
  const { translations } = useTranslations();
  const router = useRouter();

  return (
    <Stack>
      <Group align={"stretch"}>
        <PaperLayout w={"max-content"}>
          <Stack>
            <Group>
              <Paper
                className={styles["card-container"]}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  router.push("/dashboard/loyalty/campaign/create")
                }
              >
                <IconGift size={64} />
                <Text>{translations["Create Loyalty Campaign"]}</Text>
              </Paper>
              <Paper
                className={styles["card-container"]}
                style={{ cursor: "pointer" }}
                onClick={() => router.push("/dashboard/loyalty/customer")}
              >
                <IconUsersGroup size={64} />
                <Text>{translations["Create Loyalty Campaign"]}</Text>
                <Text>{translations["View Customers"]}</Text>
              </Paper>
            </Group>
            <Button
              variant={"light"}
              h={50}
              radius={12}
              onClick={() => router.push("/dashboard/loyalty/reward")}
            >
              {translations["Rewards"]}
            </Button>
            <Button
              h={50}
              radius={12}
              onClick={() => showSuccessToast(translations["Coming Soon"])}
            >
              {translations["Redeem"]}
            </Button>
          </Stack>
        </PaperLayout>
        <InsightsOverview />
      </Group>
      <RecentLoyaltyCampaigns />
    </Stack>
  );
}

function InsightsOverview() {
  const { data: insights } = useLoyaltyInsights();
  const { translations } = useTranslations();
  if (!insights) return;

  return (
    <PaperLayout w={"fit-content"}>
      <SimpleGrid cols={2}>
        <InsightsCard
          value={insights.totalCustomers}
          text={translations["Loyal Customers"]}
        />
        <InsightsCard
          value={insights.totalCampaigns}
          text={translations["Active Campaigns"]}
        />
        <InsightsCard
          value={insights.totalPointsRewarded}
          text={translations["Rewarded Points"]}
        />
        <InsightsCard
          value={insights.totalPointsRedeemed}
          text={translations["Redeemed Points"]}
        />
      </SimpleGrid>
      <Button
        variant={"transparent"}
        rightSection={<IconArrowRight />}
        onClick={() => {
          notifications.show({ message: translations["Coming Soon"] });
        }}
      >
        {translations["View More Insights"]}
      </Button>
    </PaperLayout>
  );
}

function RecentLoyaltyCampaigns() {
  const { data: campaigns } = useCampaigns(true);
  const { translations } = useTranslations();
  if (!campaigns) return;
  if (!Array.isArray(campaigns)) return;

  return (
    <Stack>
      <Group justify={"space-between"}>
        <Title order={3}>{translations["Recent Loyalty Campaign"]}</Title>
        <Button variant={"transparent"} rightSection={<IconChevronRight />}>
          {translations["View All"]}
        </Button>
      </Group>
      <Box className="cards-grid-global-class">
        {campaigns.slice(0, 3).map((campaign) => (
          <LCampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </Box>
    </Stack>
  );
}
