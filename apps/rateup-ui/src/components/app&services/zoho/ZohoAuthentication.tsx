import { IconPlugConnected, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api";
import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { useUnsubscribeZoho } from "@/backend/appsIntegration/zoho/zoho.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useUser } from "@/context/UserContext";
import { IntegratedApps } from "@/types/enums";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";

export const ZohoAuthentication = ({ integration }: { integration: AppIntegration }) => {
  const { t } = useTranslation();
  const user = useUser();
  const [connectionMode, setConnectionMode] = useState<"crm" | "bigin" | "both" | null>(null);
  const deleteMut = useDeleteIntegrationMutation(IntegratedApps.zoho);
  const disconnectMut = useUnsubscribeZoho();

  function handleConnect() {
    if (!connectionMode) return;
    const clientId = import.meta.env.VITE_ZOHO_CLIENT_ID;
    const redirectUri = `${import.meta.env.VITE_FRONTEND_URL}/dashboard/settings/integrations/zoho/callback`;

    const scopes: string[] = [];

    if (connectionMode === "crm" || connectionMode === "both") {
      scopes.push(
        "ZohoCRM.modules.ALL",
        "ZohoCRM.settings.ALL",
        "ZohoCRM.users.ALL",
        "ZohoCRM.notifications.ALL",
      );
    }

    if (connectionMode === "bigin" || connectionMode === "both") {
      scopes.push(
        "ZohoBigin.modules.ALL",
        "ZohoBigin.settings.ALL",
        "ZohoBigin.users.ALL",
        "ZohoBigin.notifications.ALL",
      );
    }

    scopes.push("offline_access");

    const scope = scopes.join(" ");

    const authUrl =
      `https://accounts.zoho.in/oauth/v2/auth` +
      `?scope=${encodeURIComponent(scope)}` +
      `&client_id=${clientId}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${user.user?.orgId}`;

    window.location.href = authUrl;
  }

  async function handleDelete() {
    await disconnectMut.mutate(user.user?.orgId ?? "");
    await deleteMut.mutate();
  }

  return (
    <IntegrationFormCard
      title={t("Connection")}
      description={t("The Zoho products RateUp may read and write, and the org they belong to.")}
      actions={
        integration ? (
          <Button variant="outline" onClick={handleDelete}>
            <IconTrash data-icon="inline-start" />
            {t("Disconnect")}
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={!connectionMode}>
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
            onValueChange={(value) => setConnectionMode(value as "crm" | "bigin" | "both" | null)}
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
