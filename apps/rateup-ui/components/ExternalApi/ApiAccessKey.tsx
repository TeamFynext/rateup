"use client";

import React, { useState } from "react";

import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconReload,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useCreateLoyaltyApiKey,
  useDeleteLoyaltyApiKey,
  useLoyaltyApiKey,
  useRegenerateLoyaltyApiKey,
} from "../../backend/loyalty/apiKey/loyaltyApiKey.query";
import { useUser } from "../../context/UserContext";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import PaperLayout from "../styled/Layouts/PaperLayout";

export default function ApiAccessKeyPage() {
  const { data } = useLoyaltyApiKey();
  const generateMutation = useCreateLoyaltyApiKey();

  const [apiKey, setApiKey] = useState("");

  function handleGenerateApiKey() {
    generateMutation.mutate(undefined, {
      onSuccess: (data) => {
        setApiKey(data.apiKey);
      },
    });
  }

  const { user } = useUser();
  const translations = useTranslations();
  const apiEndpoint =
    process.env.NEXT_PUBLIC_API_URL +
    "/api/external/" +
    "v1/" +
    user?.orgId +
    "/";

  if (!data) return;

  return (
    <Stack mt="xl">
      <Title order={3}> API Config </Title>
      <PaperLayout>
        <Stack>
          <Title order={4}>Api Access Key</Title>
          {data.createdAt ? (
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
                      <ApiRegenerateButton onRegenerate={setApiKey} />
                    )}
                    <ApiDeleteButton onDelete={() => setApiKey("")} />
                  </Group>
                }
              />
            </Tooltip>
          ) : (
            <>
              <Text>
                {translations(
                  "You have not generated an API Access Key yet API Access Key is required to access the all API endpoints",
                )}
              </Text>
              <Button
                onClick={handleGenerateApiKey}
                loading={generateMutation.isPending}
              >
                {translations("Generate Api Key")}
              </Button>
            </>
          )}
        </Stack>
      </PaperLayout>

      <PaperLayout>
        <Stack>
          <Title order={4}>{translations("API Base URL")}</Title>
          <ContainedTextField
            value={apiEndpoint}
            styles={{
              section: {
                width: "fit-content",
              },
              input: {
                paddingRight: "46px",
              },
              root: {
                borderRadius: "12px",
                overflow: "hidden",
              },
            }}
            rightSection={<ApiCopyButton value={apiEndpoint} />}
          />
        </Stack>
      </PaperLayout>
    </Stack>
  );
}

export function ApiCopyButton({ value }) {
  const translations = useTranslations();
  return (
    <CopyButton value={value}>
      {({ copy, copied }) => (
        <Tooltip label={translations("Copy")} position="top" withArrow>
          <ActionIcon
            onClick={copy}
            variant={"subtle"}
            h={"100%"}
            w={"46px"}
            px={8}
            radius={0}
          >
            {copied ? <IconCheck /> : <IconCopy />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}

interface ApiRegenerateButtonProps {
  onRegenerate: (apiKey: string) => void;
}
function ApiRegenerateButton({ onRegenerate }: ApiRegenerateButtonProps) {
  const regenerateMutation = useRegenerateLoyaltyApiKey();
  const translations = useTranslations();
  function handleRegenerate() {
    regenerateMutation.mutate(undefined, {
      onSuccess: (data) => {
        onRegenerate(data.apiKey);
      },
    });
  }
  return (
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
  );
}

interface ApiDeleteButtonProps {
  onDelete: () => void;
}
function ApiDeleteButton({ onDelete }: ApiDeleteButtonProps) {
  const deleteMutation = useDeleteLoyaltyApiKey();
  const translations = useTranslations();
  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        onDelete();
      },
    });
  }
  return (
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
  );
}
