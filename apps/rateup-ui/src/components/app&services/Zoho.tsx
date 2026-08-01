import { useTranslation } from "react-i18next";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { BiginLogo, ZohoLogo } from "@/components/integrations/logos";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { IntegratedApps } from "@/types/enums";

import { ZohoAuthentication } from "./zoho/ZohoAuthentication.tsx";
import { ZohoContactsTable, ZohoLeadsTable, BiginContactsTable } from "./zoho/ZohoTables.tsx";
import { ZohoTriggerList } from "./zoho/ZohoTriggerList.tsx";

export function Zoho() {
  const { t } = useTranslation();
  const {
    data: integration,
    isLoading,
    refetch,
    isRefetching,
  } = useIntegrationByType(IntegratedApps.zoho);

  if (isLoading) return <RateupLoader />;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-4">
        <div className="relative flex h-12 w-16 items-center">
          <div className="absolute left-0 z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm border">
            <ZohoLogo className="h-7 w-7" />
          </div>

          <div className="absolute left-7 flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm border">
            <BiginLogo className="h-7 w-7" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("Zoho CRM/Bigin")}</h1>

          <p className="text-sm text-muted-foreground">
            {t("Manage your Zoho CRM/Bigin integration and trigger subscriptions")}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6">
        <ZohoAuthentication integration={integration} />
        <ZohoTriggerList integration={integration} refetch={refetch} isLoading={isRefetching} />
        {integration?.credential?.supportedProducts?.crm && (
          <ZohoLeadsTable integration={integration} />
        )}
        {integration?.credential?.supportedProducts?.crm && (
          <ZohoContactsTable integration={integration} />
        )}
        {integration?.credential?.supportedProducts?.bigin && (
          <BiginContactsTable integration={integration} />
        )}
      </div>
    </div>
  );
}
