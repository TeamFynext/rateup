import { IconBrandGoogleDrive } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useStartOAuthConnect,
} from "@/backend/appsIntegration/integration.query";
import { IntegrationEmptyState } from "@/components/dashboard/settings/integrations/IntegrationEmptyState.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { IntegratedApps } from "@/types/enums.ts";

import { Button } from "../ui/button";
import { Field, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

export function GoogleSheet() {
  const uid = useId();
  const confirm = useConfirm();

  const { data: googleAccessToken } = useIntegrationByType(IntegratedApps.googlesheet);

  const deleteAccount = useDeleteIntegrationMutation(IntegratedApps.googlesheet);
  const { t: translations } = useTranslation();
  // The shared OAuth connect; Google returns to `/auth/oauth2callback`, which finishes it.
  const startConnect = useStartOAuthConnect(IntegratedApps.googlesheet);

  const handleSignOutGoogleSync = async () => {
    const shouldSignOut = await confirm({
      title: translations("Sign out"),
      description: translations("Are you sure you want to sign out from the synced account?"),
      confirmText: translations("Yes"),
    });

    if (!shouldSignOut) return;

    toast.loading(translations("Hold on, Signing out from google sheet.."), {
      id: "integration-delete",
    });
    deleteAccount.mutate();
  };
  const config = INTEGRATIONS_CONFIG.googlesheet;
  const syncedEmail = googleAccessToken?.credential?.userEmail;

  if (!googleAccessToken)
    return (
      <IntegrationShell icon={config.icon} name={config.name}>
        <IntegrationEmptyState
          icon={config.icon}
          title={translations("Connect a Google account")}
          description={translations(
            "RateUp writes responses and contacts straight into your spreadsheets, so your team can work where it already works.",
          )}
          action={
            <Button
              onClick={() => startConnect.mutate(undefined)}
              loading={startConnect.isPending || startConnect.isSuccess}
              size="lg"
            >
              <IconBrandGoogleDrive data-icon="inline-start" />
              {translations("Connect Google account")}
            </Button>
          }
        />
      </IntegrationShell>
    );

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected
      detail={syncedEmail}
      action={
        <Button onClick={handleSignOutGoogleSync} variant="outline">
          {translations("Disconnect")}
        </Button>
      }
    >
      <IntegrationFormCard
        title={translations("Synced account")}
        description={translations("The Google account RateUp writes your sheets with.")}
      >
        <Field>
          <FieldLabel htmlFor={`${uid}-field`}>{translations("Email address")}</FieldLabel>
          <Input id={`${uid}-field`} value={syncedEmail ?? ""} disabled />
        </Field>
      </IntegrationFormCard>
    </IntegrationShell>
  );
}
