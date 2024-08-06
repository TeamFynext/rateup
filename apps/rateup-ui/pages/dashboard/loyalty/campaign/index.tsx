import Link from "next/link";

import { Box, Group, Stack, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { useCampaigns } from "@/backend/loyalty/campaign/loyaltyCampaign.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { LoyaltyCardListSkeleton } from "@/components/animation/skeleton/loyalty/LoyaltyCardList.skeleton";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { LCampaignCard } from "@/components/loyalty/campaign/LCampaignCard";
import NothingFound from "@/components/NothingFound/NothingFound";

export default function LoyaltyCampaignsPage() {
  return (
    <Stack h={"100%"}>
      <Group>
        <Title order={2}>Loyalty Campaigns</Title>
        <Link href={"campaign/create"}>
          <RateupButtonPrimary
            title="Create Campaign"
            leftIcon={<IconPlus />}
          />
        </Link>
      </Group>
      <LCardList />
    </Stack>
  );
}

const LCardList = () => {
  const { data: campaigns, isPending, isError, refetch } = useCampaigns(true);

  if (isPending) return <LoyaltyCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={refetch} />;
  if (!campaigns || !Array.isArray(campaigns) || campaigns?.length === 0)
    return <NothingFound text="Nothing found" />;

  return (
    <Box className="cards-grid-global-class">
      {campaigns.map((campaign) => (
        <LCampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </Box>
  );
};
