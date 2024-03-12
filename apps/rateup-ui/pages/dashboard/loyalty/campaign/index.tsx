import { Button, Flex, Group, Stack, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useCampaigns } from "../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { LCampaignCard } from "../../../../components/loyalty/campaign/LCampaignCard";
import RateupLoader from "../../../../components/Loaders/RateupLoader";

export default function LoyaltyCampaignsPage() {
  const router = useRouter();
  const { data: campaigns, isLoading } = useCampaigns(true);
  function handleCreateClick() {
    router.push("/dashboard/loyalty/campaign/create");
  }

  if (isLoading || !campaigns || !Array.isArray(campaigns)) {
    console.log("campaignsError", campaigns);
    return <RateupLoader />;
  }

  return (
    <Stack>
      <Group>
        <Title order={2}>Loyalty Campaigns</Title>
        <Button onClick={handleCreateClick} leftSection={<IconPlus />}>
          Create Campaign
        </Button>
      </Group>
      <Flex wrap={"wrap"} mt="sm" gap={"md"}>
        {campaigns.map((campaign) => (
          <LCampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </Flex>
    </Stack>
  );
}
