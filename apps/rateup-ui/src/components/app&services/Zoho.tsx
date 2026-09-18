import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { IntegratedApps } from "@/types/enums";

import { ZohoAuthentication } from "./zoho/ZohoAuthentication.tsx";
import { ZohoContactsTable, ZohoLeadsTable, BiginContactsTable } from "./zoho/ZohoTables.tsx";
import { ZohoTriggerList } from "./zoho/ZohoTriggerList.tsx";

export function Zoho() {
  const {
    data: integration,
    isLoading,
    refetch,
    isRefetching,
  } = useIntegrationByType(IntegratedApps.zoho);

  if (isLoading) return <RateupLoader />;

  const config = INTEGRATIONS_CONFIG.zoho;
  const products = integration?.credential?.supportedProducts;
  // Which Zoho product the org actually authorised is the fact worth stating — the two
  // behave differently and the tables below change with it.
  const connectedTo = [products?.crm ? "Zoho CRM" : null, products?.bigin ? "Bigin" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={Boolean(integration?.credential)}
      detail={connectedTo || undefined}
    >
      <ZohoAuthentication integration={integration} />
      <ZohoTriggerList integration={integration} refetch={refetch} isLoading={isRefetching} />
      {products?.crm && <ZohoLeadsTable integration={integration} />}
      {products?.crm && <ZohoContactsTable integration={integration} />}
      {products?.bigin && <BiginContactsTable integration={integration} />}
    </IntegrationShell>
  );
}
