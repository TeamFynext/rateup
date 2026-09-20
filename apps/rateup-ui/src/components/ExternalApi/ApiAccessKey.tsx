import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconKey,
  IconReload,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateLoyaltyApiKey,
  useDeleteLoyaltyApiKey,
  useLoyaltyApiKey,
  useRegenerateLoyaltyApiKey,
} from "@/backend/loyalty/apiKey/loyaltyApiKey.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";

export default function ApiAccessKeyPage() {
  const { data } = useLoyaltyApiKey();
  const generateMutation = useCreateLoyaltyApiKey();
  const [apiKey, setApiKey] = useState("");
  const { user } = useUser();
  const { t: translations } = useTranslation();

  const apiEndpoint = import.meta.env.VITE_API_URL + "/api/external/" + "v1/" + user?.orgId + "/";

  function handleGenerateApiKey() {
    generateMutation.mutate(undefined, {
      onSuccess: (data) => {
        setApiKey(data.apiKey);
      },
    });
  }

  if (!data) return null;

  const config = INTEGRATIONS_CONFIG.apiservice;

  return (
    <IntegrationShell icon={config.icon} name={config.name} own>
      <IntegrationFormCard
        title={translations("Access key")}
        description={translations("The key your server sends with every RateUp API request.")}
      >
        {data.createdAt ? (
          <>
            <Field>
              <FieldLabel htmlFor="api-access-key">{translations("Key")}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="api-access-key"
                  readOnly
                  value={apiKey || "•".repeat(48)}
                  className="font-mono"
                />
                <InputGroupAddon align="inline-end">
                  {apiKey ? (
                    <ApiCopyButton value={apiKey} />
                  ) : (
                    <ApiRegenerateButton onRegenerate={setApiKey} />
                  )}
                  <ApiDeleteButton onDelete={() => setApiKey("")} />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            {!apiKey && (
              <Alert>
                <IconAlertCircle />
                <AlertDescription>
                  {translations(
                    "You can only view access key at the time of creation. If you lost the key, you can regenerate it.",
                  )}
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Field>
            <FieldLabel htmlFor="api-generate-key">{translations("Key")}</FieldLabel>
            <FieldDescription>
              {translations(
                "You have not generated an API Access Key yet. API Access Key is required to access the all API endpoints.",
              )}
            </FieldDescription>
            <Button
              id="api-generate-key"
              type="button"
              className="w-fit"
              onClick={handleGenerateApiKey}
              loading={generateMutation.isPending}
              aria-busy={generateMutation.isPending}
            >
              <IconKey data-icon="inline-start" />
              {translations("Generate API key")}
            </Button>
            <span role="status" aria-live="polite" className="sr-only">
              {generateMutation.isPending ? translations("Generating API key…") : ""}
            </span>
          </Field>
        )}
      </IntegrationFormCard>

      <IntegrationFormCard
        title={translations("Base URL")}
        description={translations("Use this base URL for all your API requests.")}
      >
        <Field>
          <FieldLabel htmlFor="api-base-url">{translations("Endpoint")}</FieldLabel>
          <InputGroup>
            <InputGroupInput id="api-base-url" readOnly value={apiEndpoint} className="font-mono" />
            <InputGroupAddon align="inline-end">
              <ApiCopyButton value={apiEndpoint} />
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </IntegrationFormCard>
    </IntegrationShell>
  );
}

export function ApiCopyButton({ value }: Readonly<{ value: string }>) {
  const [copied, setCopied] = useState(false);
  const { t: translations } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleCopy}
        aria-label={copied ? translations("Copied") : translations("Copy")}
        title={translations("Copy")}
      >
        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      </Button>
      {/* The copied state is otherwise icon-only, so announce it. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? translations("Copied") : ""}
      </span>
    </>
  );
}

interface ApiRegenerateButtonProps {
  onRegenerate: (apiKey: string) => void;
}

function ApiRegenerateButton({ onRegenerate }: Readonly<ApiRegenerateButtonProps>) {
  const regenerateMutation = useRegenerateLoyaltyApiKey();
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  async function handleRegenerate() {
    const shouldRegenerate = await confirm({
      title: translations("Confirm API Key Regeneration"),
      description: translations(
        "Are you sure you want to regenerate the API key? The old key will be immediately invalidated and all applications using it will stop working.",
      ),
      confirmText: translations("Regenerate"),
      cancelText: translations("Cancel"),
    });

    if (!shouldRegenerate) return;

    regenerateMutation.mutate(undefined, {
      onSuccess: (data) => {
        onRegenerate(data.apiKey);
      },
    });
  }

  return (
    <Button
      aria-label={translations("Refresh")}
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleRegenerate}
      title={translations("Regenerate")}
    >
      <IconReload size={16} />
    </Button>
  );
}

interface ApiDeleteButtonProps {
  onDelete: () => void;
}

function ApiDeleteButton({ onDelete }: Readonly<ApiDeleteButtonProps>) {
  const deleteMutation = useDeleteLoyaltyApiKey();
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  async function handleDelete() {
    const shouldDelete = await confirm({
      title: translations("Confirm API Key Deletion"),
      description: translations(
        "Are you sure you want to delete the API key? All applications using this key will immediately stop working.",
      ),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        onDelete();
      },
    });
  }

  return (
    <Button
      aria-label={translations("Delete")}
      variant="ghost"
      size="icon"
      className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleDelete}
      title={translations("Delete")}
    >
      <IconTrash size={16} />
    </Button>
  );
}
