import { IconPlugConnected, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api";
import {
  useDeleteIntegrationMutation,
  useStartOAuthConnect,
} from "@/backend/appsIntegration/integration.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useUser } from "@/context/UserContext";
import { IntegratedApps } from "@/types/enums";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

/** The `products` the connect asks Zoho for, per choice — the scopes follow from it. */
const PRODUCTS = { crm: "crm", bigin: "bigin", both: "crm,bigin" } as const;

export const ZohoAuthentication = ({ integration }: { integration: AppIntegration }) => {
  const { t } = useTranslation();
  const user = useUser();
  const [connectionMode, setConnectionMode] = useState<keyof typeof PRODUCTS | null>(null);
  // Disconnecting through the generic delete also unsubscribes Zoho's webhooks and revokes
  // the grant: the API asks the Zoho provider to clean up before the row goes.
  const deleteMut = useDeleteIntegrationMutation(IntegratedApps.zoho);
  // The shared OAuth connect: the API builds the consent URL with a signed state, and Zoho
  // returns to the shared callback page.
  const start = useStartOAuthConnect(IntegratedApps.zoho);

  function handleConnect() {
    if (!connectionMode) return;
    start.mutate({ products: PRODUCTS[connectionMode] });
  }

  return (
    <IntegrationFormCard
      title={t("Connection")}
      description={t("The Zoho products RateUp may read and write, and the org they belong to.")}
      actions={
        integration ? (
          <Button
            variant="outline"
            onClick={() => deleteMut.mutate()}
            loading={deleteMut.isPending}
          >
            <IconTrash data-icon="inline-start" />
            {t("Disconnect")}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={!connectionMode}
            // Stays loading once the URL arrives: the page is about to leave.
            loading={start.isPending || start.isSuccess}
          >
            <IconPlugConnected data-icon="inline-start" />
            {t("Connect Zoho")}
          </Button>
        )
      }
    >
      <Field>
        <FieldLabel htmlFor="zoho-org-id">{t("Organization ID")}</FieldLabel>
        <InputGroup>
          <InputGroupInput id="zoho-org-id" value={user.user?.orgId} readOnly />
          <InputGroupAddon align="inline-end">
            <ApiCopyButton value={user.user?.orgId ?? ""} />
          </InputGroupAddon>
        </InputGroup>
      </Field>

      {!integration && (
        <Field>
          <FieldLabel htmlFor="zoho-connection-mode">{t("Products")}</FieldLabel>
          <Select
            value={connectionMode || ""}
            onValueChange={(value) => setConnectionMode(value as keyof typeof PRODUCTS | null)}
            items={[
              { value: "crm", label: t("Zoho CRM only") },
              { value: "bigin", label: t("Zoho Bigin only") },
              { value: "both", label: t("Zoho CRM and Bigin") },
            ]}
          >
            <SelectTrigger id="zoho-connection-mode" className="w-full">
              <SelectValue placeholder={t("Choose what to connect")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="crm">{t("Zoho CRM only")}</SelectItem>
              <SelectItem value="bigin">{t("Zoho Bigin only")}</SelectItem>
              <SelectItem value="both">{t("Zoho CRM and Bigin")}</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>
            {t(
              "This decides the permissions RateUp asks Zoho for, so it cannot be changed later without reconnecting.",
            )}
          </FieldDescription>
        </Field>
      )}
    </IntegrationFormCard>
  );
};
