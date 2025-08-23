import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button, Group, Stack, Switch, Title, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconInfoCircle,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useAllOrgs,
  useOrgStats,
  useUpdateOrgPause,
} from "../../../backend/org/org.query";
import {
  useSubscriptionByOrgId,
  useUpdateSubscriptionMutation,
} from "../../../backend/subscription/subscription.query";
import {
  CountCard,
  CountSectionContainer,
} from "../../../components/adminPanel/stats/Count";
import { SubscriptionEditorModal } from "../../../components/adminPanel/Subscription/SubscriptionEditorModal";
import RefreshButton from "../../../components/Button/RefreshButton";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";

export default function OrgById() {
  const [opened, { close, open }] = useDisclosure(false); // subscription editor
  const [isAnnualMessageLimit, setIsAnnualMessageLimit] = useState(false);
  const [
    openedConfirmModal,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);
  const router = useRouter();
  const { orgId } = router.query as { orgId: string };
  const {
    data: subscription,
    isLoading: isSubLoading,
    isError: isSubErr,
  } = useSubscriptionByOrgId(orgId);
  const { data: orgs, isLoading: isOrgsLoading } = useAllOrgs();
  const { data: stats, isLoading, isError } = useOrgStats(orgId);
  const [orgDetails, setOrgDetails] = useState<Org>(null);
  const updatePauseStatus = useUpdateOrgPause();
  const translations = useTranslations();
  const updateSubscription = useUpdateSubscriptionMutation();
  useEffect(() => {
    if (orgs) {
      setOrgDetails(orgs.find((org) => org.id === orgId));
    }
  }, [orgs]);

  const handleOrgPauseStatus = () => {
    updatePauseStatus.mutate({
      orgId,
      data: { isPaused: !orgDetails?.isPaused },
    });
  };

  const handleAnnualMessageLimit = (checked) => {
    updateSubscription.mutate(
      { orgId, updatedData: { isAnnualMessageLimit: checked } },
      {
        onSuccess: () => {
          setIsAnnualMessageLimit(checked);
        },
      },
    );
  };

  useEffect(() => {
    if (subscription)
      setIsAnnualMessageLimit(subscription.isAnnualMessageLimit);
  }, [subscription]);

  if (isError || isSubErr) return <div>error occured</div>;
  if (isLoading || isOrgsLoading || !stats || isSubLoading)
    return <RateupLoader h={"100dvh"} />;

  return (
    <Stack>
      <Group justify="space-between">
        <Group flex={1}>
          <Title order={2}>{stats.name}</Title>
          <RefreshButton queryKeys={["org", "stats"]} />
        </Group>
        {orgDetails?.id !== process.env.NEXT_PUBLIC_ROOT_ORG && (
          <Button
            style={{ fontSize: "1.2rem", height: "unset" }}
            leftSection={
              orgDetails?.isPaused ? (
                <IconPlayerPause size={"1rem"} />
              ) : (
                <IconPlayerPlay size={"1rem"} />
              )
            }
            variant="outline"
            onClick={openConfirmModal}
            styles={{
              inner: {
                height: "40px",
              },
            }}
          >
            {orgDetails?.isPaused
              ? translations("Resume Organization")
              : translations("Pause Organization")}
          </Button>
        )}
        <Group>
          {(!subscription?.basePlan?.paymentPlan ||
            subscription?.basePlan?.paymentPlan?.period === "yearly") && (
            <Group gap={1}>
              <Switch
                label={"Annual Message limit"}
                checked={isAnnualMessageLimit}
                onChange={(e) =>
                  handleAnnualMessageLimit(e.currentTarget.checked)
                }
              />
              {subscription?.basePlan?.paymentPlan && (
                <Tooltip label="Updation will affect only in current subscription year">
                  <IconInfoCircle size={"1rem"} color="grey" />
                </Tooltip>
              )}
            </Group>
          )}
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
            {translations("Manage Subscription")}
          </Button>
        </Group>
      </Group>
      <Group>
        <CountSectionContainer label="Org">
          <CountCard count={stats.members} label={["Staff", "Staff"]} />
          <CountCard
            count={stats.invitations}
            label={["Invitation", "Invitations"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label={translations("Teams")}>
          <CountCard count={stats.teams.total} label={["Team", "Teams"]} />
          <CountCard count={stats.teams.members} label={["Staff", "Staff"]} />
          <CountCard
            count={stats.teams.invitations}
            label={["Invitation", "Invitations"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label={translations("Web Surveys")}>
          <CountCard count={stats.web.surveys} label={["Survey", "Surveys"]} />
          <CountCard
            count={stats.web.responses}
            label={["Response", "Responses"]}
          />
          <CountCard count={stats.web.visited} label={["Visited", "Visited"]} />
        </CountSectionContainer>
        <CountSectionContainer label={translations("WhatsApp Surveys")}>
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
        <CountSectionContainer label={translations("Reputation Mangement")}>
          <CountCard count={stats.rm.reviews} label={["Review", "Reviews"]} />
          <CountCard
            count={stats.rm.analyzedReviews}
            label={["Analyzed Review", "Analyzed Reviews"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label={translations("Campaigns")}>
          <CountCard
            count={stats.campaigns.campaigns}
            label={["Campaign", "Campaigns"]}
          />
          <CountCard
            count={stats.campaigns.participants}
            label={["Participant", "Participants"]}
          />
        </CountSectionContainer>
        <CountSectionContainer label={translations("Digitl Menu")}>
          <CountCard count={stats.menu.total} label={["Menu", "Menu"]} />
          <CountCard count={stats.menu.banners} label={["Banner", "Banners"]} />
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
      <ConfirmationModal
        opened={openedConfirmModal}
        onClose={closeConfirmModal}
        confirmLabel={translations("Yes")}
        headerTitle={
          orgDetails?.isPaused
            ? translations("Resume Organization")
            : translations("Pause Organization")
        }
        onConfirm={() => {
          handleOrgPauseStatus();
        }}
        headerLabel={`Are you sure to ${orgDetails?.isPaused ? "resume" : "pause"} this organization?`}
        closeLabel={translations("cancel")}
      />
    </Stack>
  );
}
