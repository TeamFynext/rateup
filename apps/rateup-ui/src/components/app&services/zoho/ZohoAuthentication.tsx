// Extracted verbatim from `Zoho.tsx`. Behaviour is unchanged.

import { IconPlugConnected, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api";
import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { useUnsubscribeZoho } from "@/backend/appsIntegration/zoho/zoho.query";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
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
    <Card className="w-full rounded-2xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>{t("Zoho Connection")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
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
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("Connection Mode")}</p>

              <p className="text-xs text-muted-foreground">
                {t("Choose which Zoho products to connect")}
              </p>
            </div>

            <Select
              value={connectionMode || ""}
              onValueChange={(value) => setConnectionMode(value as "crm" | "bigin" | "both" | null)}
              items={[
                { value: "crm", label: "Zoho CRM Only" },
                { value: "bigin", label: "Zoho Bigin Only" },
                { value: "both", label: "Zoho CRM + Bigin" },
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("Select integration")} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="crm">Zoho CRM Only</SelectItem>

                <SelectItem value="bigin">Zoho Bigin Only</SelectItem>

                <SelectItem value="both">Zoho CRM + Bigin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {integration ? (
          <Button variant="destructive" onClick={handleDelete} className="w-full gap-2 rounded-xl">
            <IconTrash className="h-4 w-4" />

            {t("Disconnect Zoho")}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            className="w-full gap-2 rounded-xl"
            disabled={!connectionMode}
          >
            <IconPlugConnected className="h-4 w-4" />

            {t("Connect Zoho")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
