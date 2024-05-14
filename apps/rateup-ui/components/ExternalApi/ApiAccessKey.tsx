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
import { IconCopy, IconReload, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import {
  useLoyaltyApiKey,
  useCreateLoyaltyApiKey,
  useRegenerateLoyaltyApiKey,
  useDeleteLoyaltyApiKey,
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
  const apiEndpoint =
    process.env.NEXT_PUBLIC_API_URL +
    "/api/external/" +
    "v1/" +
    user?.orgId +
    "/";

  if (!data) return;

  return (
    <Stack>
      <Title order={3}> API Config </Title>
      <PaperLayout>
        <Stack>
          <Title order={4}>Api Access Key</Title>
          {data.createdAt ? (
            <Tooltip
              openDelay={150}
              label={
                apiKey
                  ? "Api Access Key"
                  : `You can only view access key at the time of creation. If you lost the key, you can regenerate it.`
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
                You have not generated an API Access Key yet. API Access Key is
                required to access the all API endpoints.
              </Text>
              <Button
                onClick={handleGenerateApiKey}
                loading={generateMutation.isPending}
              >
                Generate Api Key
              </Button>
            </>
          )}
        </Stack>
      </PaperLayout>

      <PaperLayout>
        <Stack>
          <Title order={4}>API Base URL</Title>
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

function ApiCopyButton({ value }) {
  return (
    <CopyButton value={value}>
      {({ copy, copied }) => (
        <ActionIcon
          onClick={copy}
          variant={"subtle"}
          h={"100%"}
          w={"46px"}
          px={8}
          radius={0}
        >
          <IconCopy />
        </ActionIcon>
      )}
    </CopyButton>
  );
}

interface ApiRegenerateButtonProps {
  onRegenerate: (apiKey: string) => void;
}
function ApiRegenerateButton({ onRegenerate }: ApiRegenerateButtonProps) {
  const regenerateMutation = useRegenerateLoyaltyApiKey();

  function handleRegenerate() {
    regenerateMutation.mutate(undefined, {
      onSuccess: (data) => {
        onRegenerate(data.apiKey);
      },
    });
  }
  return (
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
  );
}

interface ApiDeleteButtonProps {
  onDelete: () => void;
}
function ApiDeleteButton({ onDelete }: ApiDeleteButtonProps) {
  const deleteMutation = useDeleteLoyaltyApiKey();
  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        onDelete();
      },
    });
  }
  return (
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
  );
}
