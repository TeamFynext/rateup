import { useEffect } from "react";
import { useRouter } from "next/router";

import {
  Button,
  Card,
  Center,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowRight,
  IconArticle,
  IconChevronRight,
  IconUsers,
  IconWriting,
} from "@tabler/icons-react";

import { LoyaltyCampaignType } from "@/types/enums";
import {
  useCampaign,
  useLoyaltyCampaignInsights,
  useUpdateCampaignMutation,
} from "@/backend/loyalty/campaign/loyaltyCampaign.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { LinkCopyElement } from "@/components/input/LinkCopyElement";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { InsightsCard } from "@/components/loyalty/campaign/InsightsCard";
import { LCampaignTypeBadge } from "@/components/loyalty/campaign/LCampaignTypeBadge";
import PaperLayout, {
  PaperLayoutProps,
} from "@/components/styled/Layouts/PaperLayout";
import { useRouteParams } from "@/context/RouteParamsContext";
import useTranslations from "@/dictionaries/useTranslation";
import { generateWaMessageUrl } from "@/utils/whatsapp/wa_url";

import styles from "../../styles.module.css";

export default function LoyaltyCampaignPage() {
  const router = useRouter();
  const lcampaignId = router.query.campaignId as string;
  const { update } = useRouteParams();
  const { translations } = useTranslations();
  const { data: campaign, isLoading: isCampaignLoading } =
    useCampaign(lcampaignId);
  const { data: waSettings } = useWaSettings();

  // Updating breadcrumbs
  useEffect(() => {
    if (!campaign?.name) return;
    update({ campaignId: campaign.name });
  }, [campaign, update]);

  const updateMutation = useUpdateCampaignMutation(lcampaignId);

  if (isCampaignLoading) return <RateupLoader />;
  if (!campaign) return;

  function handleActiveChange() {
    if (updateMutation.isPending) return;

    updateMutation.mutate({
      active: !campaign.active,
    });
  }

  const phone = waSettings?.phone.replace("+", "").replaceAll(" ", "");

  const registerUrl = phone
    ? generateWaMessageUrl(phone, `/register ${lcampaignId}`)
    : translations["Configure Whatsapp>Settings to enable registration."];
  return (
    <Stack gap={"xl"}>
      <Group>
        <Title>{campaign.name}</Title>
        <LCampaignTypeBadge type={campaign.type} />
      </Group>
      <Group align={"stretch"}>
        <Flex
          style={{
            flex: 1,
          }}
          direction={"column"}
        >
          <PaperLayout py={"xl"} flex={1} mb={"md"}>
            <Center>
              <Switch
                label={translations["Campaign Status: "]}
                labelPosition={"left"}
                checked={campaign.active}
                onChange={handleActiveChange}
                size={"xl"}
                onLabel={translations["Active"]}
                offLabel={translations["Paused"]}
                styles={{
                  track: {
                    width: "90px",
                    marginLeft: "8px",
                  },
                  trackLabel: {
                    padding: "0 10px 0 10px",
                  },
                }}
              />
            </Center>
            {[
              LoyaltyCampaignType.Referral,
              LoyaltyCampaignType.ReferralTransaction,
            ].includes(campaign.type) && (
              <LinkCopyElement disabled={!campaign.active} link={registerUrl} />
            )}
          </PaperLayout>
          <QuickActions />
        </Flex>
        <LoyaltyCampaignInsights campaignId={lcampaignId} />
      </Group>
    </Stack>
  );
}

function QuickActions() {
  const router = useRouter();
  const { translations } = useTranslations();

  return (
    <Group align={"end"} justify={"space-evenly"}>
      <QuickActionCard
        Icon={IconUsers}
        text={translations["Customers"]}
        onClick={() => {
          router.push(window.location + "/participants");
        }}
      />
      <QuickActionCard
        Icon={IconWriting}
        text={translations["Event Entry"]}
        onClick={() => {
          router.push(window.location + "/event-entry");
        }}
      />
      <QuickActionCard
        Icon={IconArticle}
        text={translations["Event History"]}
        onClick={() => {
          router.push(window.location + "/event-history");
        }}
      />
    </Group>
  );
}

interface QuickActionCardProps extends PaperLayoutProps {
  Icon: React.FC<any>;
  text: string;
}
function QuickActionCard({ Icon, text, ...props }: QuickActionCardProps) {
  const theme = useMantineTheme();

  return (
    <PaperLayout ta={"center"} flex={1} hoveractive {...props}>
      <Icon size={32} />
      <Group justify="center" c={theme.primaryColor}>
        <Text>{text}</Text>
        <IconChevronRight />
      </Group>
    </PaperLayout>
  );
}

function LoyaltyCampaignInsights({ campaignId }) {
  const { data: insights } = useLoyaltyCampaignInsights(campaignId);
  const { translations } = useTranslations();
  if (!insights) return;

  return (
    <Card className={styles["card-container"]}>
      <SimpleGrid cols={2}>
        <InsightsCard
          value={insights.totalCustomers}
          text={translations["Customers"]}
        />
        <InsightsCard
          value={insights.totalTransactions}
          text={translations["Total Transactions"]}
        />
        <InsightsCard
          value={insights.totalPointsRewarded}
          text={translations["Rewarded Points"]}
        />
        <InsightsCard
          value={insights.totalTransactionAmount}
          text={translations["Total Transaction Amount"]}
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
    </Card>
  );
}
