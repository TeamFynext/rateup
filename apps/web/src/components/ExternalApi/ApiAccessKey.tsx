import { buttonVariants } from "@rateup/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@rateup/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@rateup/ui/components/input-group";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useApiKeys } from "@/backend/apiKeys/apiKeys.query.ts";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { docsPath } from "@/utils/constants.ts";

import { ApiCopyButton } from "./ApiCopyButton.tsx";
import { externalApiBaseUrl } from "./apiKeyFormat.ts";
import { ApiKeysCard } from "./ApiKeysCard.tsx";
import { ApiUsagePanel } from "./ApiUsagePanel.tsx";

/** Settings › Integrations › API Service: the org's partner API keys, their usage and the base URL. */
export default function ApiAccessKeyPage() {
  const { user } = useUser();
  const { t } = useTranslation();
  const canRead = useCan("api_tokens.read");
  // Shared with the keys card through the query cache; the usage panel names keys from it.
  const keys = useApiKeys(canRead);

  const v2Endpoint = externalApiBaseUrl(import.meta.env.VITE_API_URL, "v2");
  const v1Endpoint = externalApiBaseUrl(import.meta.env.VITE_API_URL, "v1", user?.orgId);
  const config = INTEGRATIONS_CONFIG.apiservice;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      own
      action={
        <a
          href={docsPath}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("API documentation")}
          <IconExternalLink data-icon="inline-end" />
        </a>
      }
    >
      <ApiKeysCard />

      {canRead && keys.data && <ApiUsagePanel keys={keys.data} />}

      <IntegrationFormCard
        title={t("Base URL")}
        description={t(
          "Each key calls the base URL of its own API version. Send the key as a Bearer token in the Authorization header; the API documentation lists every endpoint and the permission it needs.",
        )}
      >
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="api-base-url-v2">{t("v2 endpoint")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="api-base-url-v2"
                readOnly
                value={v2Endpoint}
                className="font-mono"
              />
              <InputGroupAddon align="inline-end">
                <ApiCopyButton value={v2Endpoint} />
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              {t("For v2 keys. The key names your organisation, so the URL doesn't.")}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="api-base-url-v1">{t("v1 endpoint (legacy)")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="api-base-url-v1"
                readOnly
                value={v1Endpoint}
                className="font-mono"
              />
              <InputGroupAddon align="inline-end">
                <ApiCopyButton value={v1Endpoint} />
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              {t(
                "For v1 keys, with your organisation ID in the path and the original response shapes.",
              )}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </IntegrationFormCard>
    </IntegrationShell>
  );
}
