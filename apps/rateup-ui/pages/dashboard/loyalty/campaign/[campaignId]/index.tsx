import { useRouter } from "next/router";
import {
  useCampaign,
  useLoyaltyCampaignInsights,
  useUpdateCampaignMutation,
} from "../../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import RateupLoader from "../../../../../components/Loaders/RateupLoader";
import {
  Button,
  Text,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Title,
  Flex,
  useMantineTheme,
  StackProps,
  Box,
  Divider,
  Portal,
} from "@mantine/core";
import { generateWaMessageUrl } from "../../../../../utils/whatsapp/wa_url";
import styles from "../../styles.module.css";
import { InsightsCard } from "../../../../../components/loyalty/campaign/InsightsCard";
import {
  IconArrowRight,
  IconArticle,
  IconChevronRight,
  IconUser,
  IconUsers,
  IconWriting,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouteParams } from "../../../../../context/RouteParamsContext";
import { useEffect } from "react";
import { LinkCopyElement } from "../../../../../components/input/LinkCopyElement";
import { LCampaignTypeBadge } from "../../../../../components/loyalty/campaign/LCampaignTypeBadge";
import { LoyaltyCampaignType } from "../../../../../types/enums";
import { CampaignEventsTable } from "./event-history";
import { useWaSettings } from "../../../../../backend/whatsapp/settings/waSettings.query";
import PaperLayout from "../../../../../components/styled/Layouts/PaperLayout";

export default function LoyaltyCampaignPage() {
  const router = useRouter();
  const lcampaignId = router.query.campaignId as string;
  const { update } = useRouteParams();

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
    : "Configure Whatsapp>Settings to enable registration.";
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
          <Stack
            py={"xl"}
            className={styles["card-container"]}
            style={{
              flex: 1,
            }}
            mb={"md"}
          >
            <Center
              style={{
                flex: 1,
              }}
            >
              <Switch
                label={"Campaign Status: "}
                labelPosition={"left"}
                checked={campaign.active}
                onChange={handleActiveChange}
                size={"xl"}
                onLabel={"Active"}
                offLabel={"Paused"}
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
          </Stack>
          <QuickActions />
        </Flex>
        <LoyaltyCampaignInsights campaignId={lcampaignId} />
      </Group>
      <RecentEvents />
    </Stack>
  );
}

function RecentEvents() {
  return (
    <PaperLayout p={0}>
      <CampaignEventsTable />
    </PaperLayout>
  );
}

function QuickActions() {
  const router = useRouter();

  return (
    <Group align={"end"} justify={"space-evenly"}>
      <QuickActionCard
        Icon={IconUsers}
        text={"Customers"}
        onClick={() => {
          router.push(window.location + "/participants");
        }}
      />
      <QuickActionCard
        Icon={IconWriting}
        text={"Event Entry"}
        onClick={() => {
          router.push(window.location + "/event-entry");
        }}
      />
      <QuickActionCard
        Icon={IconArticle}
        text={"Event History"}
        onClick={() => {
          router.push(window.location + "/event-history");
        }}
      />
    </Group>
  );
}

interface QuickActionCardProps extends StackProps {
  Icon: React.FC<any>;
  text: string;
}
function QuickActionCard({ Icon, text, ...props }: QuickActionCardProps) {
  const theme = useMantineTheme();
  const primaryColor = theme.colors[theme.primaryColor][6];

  return (
    <Stack
      className={styles["card-container"]}
      align={"center"}
      p={"lg"}
      style={{
        cursor: "pointer",
        flex: 1,
      }}
      {...props}
    >
      <Icon size={32} />
      <Group
        style={{
          color: primaryColor,
        }}
      >
        <Text>{text}</Text>
        <IconChevronRight />
      </Group>
    </Stack>
  );
}

function LoyaltyCampaignInsights({ campaignId }) {
  const { data: insights } = useLoyaltyCampaignInsights(campaignId);

  if (!insights) return;

  return (
    <Stack className={styles["card-container"]}>
      <SimpleGrid cols={2}>
        <InsightsCard value={insights.totalCustomers} text={`Customers`} />
        <InsightsCard
          value={insights.totalTransactions}
          text={`Total Transactions`}
        />
        <InsightsCard
          value={insights.totalPointsRewarded}
          text={`Rewarded Points`}
        />
        <InsightsCard
          value={insights.totalTransactionAmount}
          text={`Total Transaction Amount`}
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
