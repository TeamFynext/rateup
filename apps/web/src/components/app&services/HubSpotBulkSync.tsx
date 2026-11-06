import { IconCloudDownload, IconCloudUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type {
  HubSpotBulkKind,
  HubSpotBulkRun,
} from "@/backend/appsIntegration/hubspot/hubspot.api";
import { useStartHubSpotBulk } from "@/backend/appsIntegration/hubspot/hubspot.query";
import { BulkSyncRow } from "@/components/dashboard/settings/integrations/BulkSyncRow.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";

/**
 * The first-time sync: pulling HubSpot's contacts in, and sending RateUp's existing
 * contacts (and, with deals on, Leads board leads) out. Both run in the background
 * and only add and link; each shows how its latest run went.
 */
export function HubSpotBulkSync({
  runs,
}: Readonly<{ runs: Record<HubSpotBulkKind, HubSpotBulkRun | null> }>) {
  const { t } = useTranslation();
  const startImport = useStartHubSpotBulk("import");
  const startExport = useStartHubSpotBulk("export");

  return (
    <IntegrationFormCard
      title={t("First-time sync")}
      description={t(
        "For records from before HubSpot was connected. Nothing already linked is changed, so running either again is safe.",
      )}
    >
      <div className="flex flex-col gap-3">
        <BulkSyncRow
          run={runs.import}
          start={startImport}
          icon={<IconCloudDownload data-icon="inline-start" />}
          title={t("Import contacts from HubSpot")}
          description={t(
            "HubSpot contacts with a phone number, including its country code, become RateUp contacts. A number or email RateUp already has is linked, not duplicated.",
          )}
          action={t("Import")}
        />
        <BulkSyncRow
          run={runs.export}
          start={startExport}
          icon={<IconCloudUpload data-icon="inline-start" />}
          title={t("Send existing contacts to HubSpot")}
          description={t(
            "RateUp contacts with an email or phone number are linked to the HubSpot contact they match, or created there. With deals on, leads in mapped columns are sent as deals.",
          )}
          action={t("Send")}
        />
      </div>
    </IntegrationFormCard>
  );
}
