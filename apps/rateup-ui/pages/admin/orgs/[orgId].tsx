import { Button, Group, Stack, Title } from "@mantine/core";
import { useRouter } from "next/router";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil } from "@tabler/icons-react";
import { useOrgStats } from "../../../backend/org/org.query";
import { SubscriptionEditorModal } from "../../../components/adminPanel/Subscription/SubscriptionEditorModal";
import { useSubscriptionByOrgId } from "../../../backend/subscription/subscription.query";
import {
  CountSectionContainer,
  CountCard,
} from "../../../components/adminPanel/stats/Count";
import RateupLoader from "../../../components/Loaders/RateupLoader";

export default function OrgById() {
  const [opened, { close, open }] = useDisclosure(false); // subscription editor
  const router = useRouter();
  const { orgId } = router.query as { orgId: string };
  const {
    data: subscription,
    isLoading: isSubLoading,
    isError: isSubErr,
  } = useSubscriptionByOrgId(orgId);

  const { data: stats, isLoading, isError } = useOrgStats(orgId);
  if (isError || isSubErr) return <div>error occured</div>;
  if (isLoading || !stats || isSubLoading) return <RateupLoader h={"100dvh"} />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{stats.name}</Title>
        <Button
          style={{ fontSize: "1.2rem", height: "unset" }}
          rightSection={<IconPencil />}
          variant="outline"
          onClick={open}
          styles={{
            inner: {
              height: "40px",
            },
          }}
        >
          Manage Subscription
        </Button>
      </Group>
      <Group>
        <CountSectionContainer label="Org">
          <CountCard count={stats.members} label={["Member", "Members"]} />
          <CountCard
            count={stats.invitations}
            label={["Invitation", "Invitations"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label="Teams">
          <CountCard count={stats.teams.total} label={["Team", "Teams"]} />
          <CountCard
            count={stats.teams.members}
            label={["Member", "Members"]}
          />
          <CountCard
            count={stats.teams.invitations}
            label={["Invitation", "Invitations"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label={"Web Surveys"}>
          <CountCard count={stats.web.surveys} label={["Survey", "Surveys"]} />
          <CountCard
            count={stats.web.responses}
            label={["Response", "Responses"]}
          />
          <CountCard count={stats.web.visited} label={["Visited", "Visited"]} />
        </CountSectionContainer>
        <CountSectionContainer label={"WhatsApp Surveys"}>
          <CountCard
            count={stats.whatsapp.surveys}
            label={["Survey", "Surveys"]}
          />
          <CountCard
            count={stats.whatsapp.responses}
            label={["Response", "Responses"]}
          />
          <CountCard
            count={stats.whatsapp.templates}
            label={["Template", "Templates"]}
          />
          <CountCard
            count={stats.whatsapp.visited}
            label={["Visited", "Visited"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label={"Reputation Mangement"}>
          <CountCard count={stats.rm.reviews} label={["Review", "Reviews"]} />
          <CountCard
            count={stats.rm.analyzedReviews}
            label={["Analyzed Review", "Analyzed Reviews"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label={"Campaigns"}>
          <CountCard
            count={stats.campaigns.campaigns}
            label={["Campaign", "Campaigns"]}
          />
          <CountCard
            count={stats.campaigns.participants}
            label={["Participant", "Participants"]}
          />
        </CountSectionContainer>
      </Group>

      <Group justify="center"></Group>

      {subscription && (
        <SubscriptionEditorModal
          subscription={subscription}
          opened={opened}
          onClose={close}
        />
      )}
    </Stack>
  );
}
