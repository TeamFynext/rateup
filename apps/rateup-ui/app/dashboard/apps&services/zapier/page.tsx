"use client";

import { useMemo, useState } from "react";

import {
  ActionIcon,
  Avatar,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconKey,
  IconReload,
  IconTrash,
  IconTrashFilled,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { IntegratedApps, ZapierTriggers } from "@/types/enums";
import { ZapierIntegration } from "@/types/global";
import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useDeleteZapierTriggerHook,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import RefreshButton from "@/components/Button/RefreshButton";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import {
  formatDateWithTime,
  formatIsoDateStringWithTime,
} from "@/utils/dateTime";

import { ActiveStatusBadge } from "../shopify/page";

const Zapier = () => {
  let {
    data: integration,
    isLoading,
    refetch,
    isRefetching,
  } = useIntegrationByType(IntegratedApps.zapier);

  if (isLoading) return <RateupLoader />;
  return (
    <Stack p={"xl"}>
      <Group>
        <Avatar src={"/images/zapier.png"} />
        <Title>Zapier</Title>
      </Group>
      <Flex gap={"sm"} className="items-start">
        <APIKeyGenerate integration={integration} />
        <ZapierTriggerList
          integration={integration}
          refetch={refetch}
          isLoading={isRefetching}
        />
      </Flex>
    </Stack>
  );
};

const APIKeyGenerate = ({ integration }) => {
  const [apiKey, setApiKey] = useState(undefined);
  const translations = useTranslations();
  const updateKey = useUpdateIntegrationMutation(IntegratedApps.zapier);
  const deleteMut = useDeleteIntegrationMutation(IntegratedApps.zapier);
  const createMut = useCreateIntegrationMutation(IntegratedApps.zapier);
  function handleRegenerate() {
    updateKey.mutate(
      { credential: integration.credential, updateKey: true },
      {
        onSuccess: (data) => {
          setApiKey(data?.apiKey);
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
          setApiKey(data?.apiKey);
        },
      },
    );
  }
  return (
    <PaperLayout w={"40%"} p="xl">
      <Stack>
        <Title order={3}>Api Key</Title>
        <Text size="sm">Use this key to set up your Zapier connection</Text>
        {integration && integration?.credential?.accessToken ? (
          <Tooltip
            openDelay={150}
            label={
              apiKey
                ? translations("Api Access Key")
                : translations(
                    "You can only view access key at the time of creation If you lost the key, you can regenerate it",
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
                    <Tooltip
                      label={translations("Regenerate")}
                      position="top"
                      withArrow
                    >
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
                  <Tooltip
                    label={translations("Delete")}
                    position="top"
                    withArrow
                  >
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
          <RateupButtonBlue
            leftIcon={<IconKey />}
            radius={"md"}
            title={translations("Generate Api Key")}
            onClick={handleCreate}
            loading={createMut.isPending}
          />
        )}
      </Stack>
    </PaperLayout>
  );
};

const ZapierTriggerList = ({
  integration,
  refetch,
  isLoading,
}: {
  integration: ZapierIntegration;
  refetch: () => void;
  isLoading: boolean;
}) => {
  const triggers = integration
    ? (integration.credential?.triggerSubscriptions ?? [])
    : [];
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
  return (
    <PaperLayout p={"lg"}>
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
                <Stack
                  gap={"sm"}
                  key={tr.hookUrl}
                  className="rounded-sm bg-gray-200"
                  p={"sm"}
                >
                  <ContainedTextField
                    label={"Zap ID"}
                    value={tr.zapId || ""}
                    readOnly
                  />
                  <ContainedTextField
                    value={tr.hookUrl}
                    label={`Target Url ${index + 1}`}
                    readOnly
                    rightSection={
                      <Group px={"sm"}>
                        <ActiveStatusBadge active={tr.active} />
                        <Divider orientation="vertical" />
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
                    }
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
        deleteQuotion={
          trigger?.active
            ? "The zap with this subscription will get paused"
            : ""
        }
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
};
function getTriggerLabel(triggerKey: ZapierTriggers) {
  switch (triggerKey) {
    case ZapierTriggers.CONTACT_ASSIGN:
      return "New user assigned to contact";
    case ZapierTriggers.CONTACT_CREATE:
      return "New Contact created";
  }
}
export default Zapier;
