import { ActionIcon, Avatar, Flex, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconKey, IconReload, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useDeleteZapierTriggerHook,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { ActiveStatusBadge } from "@/components/app&services/Shopify.tsx";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { IntegratedApps, ZapierTriggers } from "@/types/enums.ts";
import type { ZapierIntegration } from "@/types/global";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

export function Zapier() {
  const {
    data: integration,
    isLoading,
    refetch,
    isRefetching,
  } = useIntegrationByType(IntegratedApps.zapier);

  if (isLoading) return <RateupLoader />;
  return (
    <Stack p={"sm"}>
      <Group>
        <Avatar src={"/images/zapier.png"} />
        <Title>Zapier</Title>
      </Group>
      <Flex gap={"sm"} className="flex-col items-start">
        <APIKeyGenerate integration={integration} />
        <div className="flex flex-col justify-center items-center w-full">
          <ZapierTriggerList integration={integration} refetch={refetch} isLoading={isRefetching} />
        </div>
      </Flex>
    </Stack>
  );
}

function APIKeyGenerate({ integration }) {
  const [apiKey, setApiKey] = useState(undefined);
  const { t: translations } = useTranslation();
  const user = useUser();
  const updateKey = useUpdateIntegrationMutation(IntegratedApps.zapier);
  const deleteMut = useDeleteIntegrationMutation(IntegratedApps.zapier);
  const createMut = useCreateIntegrationMutation(IntegratedApps.zapier);
  function handleRegenerate() {
    updateKey.mutate(
      { credential: integration.credential, updateKey: true },
      {
        onSuccess: (data) => {
          setApiKey(data?.apikey);
        },
      },
    );
  }
  function handleDelete() {
    deleteMut.mutate();
  }
  function handleCreate() {
    createMut.mutate(
      { credential: {} },
      {
        onSuccess: (data) => {
          setApiKey(data?.apikey);
        },
      },
    );
  }
  return (
    <PaperLayout w="50%" p="xl">
      <Stack>
        <ContainedTextField
          label={"Organization ID"}
          value={user.user.orgId}
          readOnly
          rightSection={<ApiCopyButton value={user.user.orgId} />}
        />
        {integration && integration?.credential?.accessToken ? (
          <Tooltip
            openDelay={150}
            label={
              apiKey
                ? translations("Api Access Key")
                : translations(
                    "You can only view access key at the time of creation. If you lost the key, you can regenerate it.",
                  )
            }
          >
            <ContainedTextField
              value={apiKey || "*".repeat(128)}
              disabled={!apiKey}
              styles={{
                section: {
                  width: "fit-content",
                },
                input: {
                  paddingRight: "92px", // 46px * 2 (copy/regen and delete button)
                },
              }}
              label={translations("Api Key")}
              description={translations("Use this key to set up your Zapier connection")}
              readOnly
              rightSection={
                <Group
                  gap={0}
                  bg={"white"}
                  h={"100%"}
                  style={{
                    borderRadius: "0 12px 12px 0",
                    overflow: "hidden",
                  }}
                >
                  {apiKey ? (
                    <ApiCopyButton value={apiKey} />
                  ) : (
                    <Tooltip label={translations("Regenerate")} position="top" withArrow>
                      <ActionIcon
                        onClick={handleRegenerate}
                        variant={"subtle"}
                        h={"100%"}
                        w={"46px"}
                        px={8}
                        radius={0}
                      >
                        <IconReload />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label={translations("Delete")} position="top" withArrow>
                    <ActionIcon
                      onClick={handleDelete}
                      variant={"subtle"}
                      h={"100%"}
                      w={"46px"}
                      px={8}
                      color={"red"}
                      radius={0}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              }
            />
          </Tooltip>
        ) : (
          <Stack gap={2}>
            <Text size="sm">Api Key</Text>
            <Text size="sm" c={"dimmed"} mb="xs">
              Use this key to set up your Zapier connection
            </Text>
            <RateupButtonBlue
              leftIcon={<IconKey />}
              radius={"md"}
              title={translations("Generate Api Key")}
              onClick={handleCreate}
              loading={createMut.isPending}
            />
          </Stack>
        )}
      </Stack>
    </PaperLayout>
  );
}

function ZapierTriggerList({
  integration,
  refetch,
  isLoading,
}: {
  integration: ZapierIntegration;
  refetch: () => void;
  isLoading: boolean;
}) {
  const triggers = integration ? (integration.credential?.triggerSubscriptions ?? []) : [];
  const [opened, { open, close }] = useDisclosure(false);
  const [trigger, setTrigger] = useState(null);
  const deleteMut = useDeleteZapierTriggerHook();
  const groupedTrigger = useMemo(
    () =>
      Object.values(ZapierTriggers).map((t) => ({
        key: t,
        triggers: triggers.filter((tr) => tr.subscribed_field === t),
      })),
    [integration],
  );
  function handleDelete() {
    deleteMut.mutate(trigger, {
      onSettled: () => {
        setTrigger(null);
      },
    });
  }
  if (!integration) return null;
  return (
    <PaperLayout w="70%" p={"lg"}>
      <Group>
        <Title order={4}>Trigger Subscriptions</Title>
        <RefreshButton onClick={refetch} isLoading={isLoading} />
      </Group>
      <Stack py={"lg"}>
        {groupedTrigger.map((t) => (
          <Stack key={t.key} className="rounded-xl bg-gray-100" p={"xl"}>
            <Text size="sm" fw={500}>
              Trigger : {getTriggerLabel(t.key)}
            </Text>
            {t.triggers.length > 0 ? (
              t.triggers.map((tr, index) => (
                <Stack gap={"sm"} key={tr.hookUrl} className="rounded-sm bg-gray-200" p={"sm"}>
                  <Group px={"sm"} gap={"xs"} justify="end">
                    <ActiveStatusBadge active={tr.active} />
                    <Tooltip label={"Delete"}>
                      <ActionIcon
                        loading={deleteMut.isPending}
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          setTrigger(tr);
                          open();
                        }}
                      >
                        {<IconTrash size={"1.2rem"} />}
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <ContainedTextField label={"Zap ID"} value={tr.zapId || ""} readOnly />
                  <ContainedTextField
                    value={tr.hookUrl}
                    label={`Target Url ${index + 1}`}
                    readOnly
                  />
                  <Group justify="end">
                    <Text size="sm" fw={500}>
                      Subscribed At:{" "}
                    </Text>
                    <Text size="sm" c={"dimmed"}>
                      {formatIsoDateStringWithTime(tr.createdAt)}
                    </Text>
                  </Group>
                </Stack>
              ))
            ) : (
              <Text size="sm" c={"dimmed"}>
                No trigger subscriptions found
              </Text>
            )}
          </Stack>
        ))}
      </Stack>
      <ConfirmationModal
        headerLabel="Are you sure you want to delete this subscription?"
        deleteQuotion={trigger?.active ? "The zap with this subscription will get paused" : ""}
        confirmLabel="Delete"
        headerTitle="Delete trigger subscription"
        onClose={() => {
          setTrigger(null);
          close();
        }}
        onConfirm={handleDelete}
        opened={opened}
        forDeleteFunctionality
      />
    </PaperLayout>
  );
}

function getTriggerLabel(triggerKey: ZapierTriggers) {
  switch (triggerKey) {
    case ZapierTriggers.CONTACT_ASSIGN:
      return "New user assigned to contact";
    case ZapierTriggers.CONTACT_CREATE:
      return "New Contact created";
    case ZapierTriggers.CONTACT_DELETED:
      return "Contact Deleted";
    case ZapierTriggers.CONVERSATION_CLOSED:
      return "Conversation closed";
    case ZapierTriggers.CONTACT_LIFECYCLE_UPDATED:
      return "Contact life cycle updated";
    case ZapierTriggers.CONTACT_UPDATED:
      return "Contact updated";
    case ZapierTriggers.NEW_MESSAGE:
      return "New Message received";
    case ZapierTriggers.NEW_TEAM_MEMBER_CREATED:
      return "Staff joined to a team";
    case ZapierTriggers.RESPONSE_SUBMITTED:
      return "Response submitted";
    case ZapierTriggers.TICKET_ASSIGNEE_UPDATED:
      return "Ticket Assignee updated";
    case ZapierTriggers.TICKET_CREATED:
      return "Ticket created";
    case ZapierTriggers.TICKET_CARD_MOVED:
      return "Ticket card moved to another column";
    case ZapierTriggers.CONTACT_ADDED_TO_GROUP:
      return "Contact added to group";
    default:
      return "not supported";
  }
}
