import { IconCloudDownload, IconCloudUpload } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type {
  PipedriveBulkKind,
  PipedriveBulkRun,
} from "@/backend/appsIntegration/pipedrive/pipedrive.api";
import { useStartPipedriveBulk } from "@/backend/appsIntegration/pipedrive/pipedrive.query";
import { BulkSyncRow } from "@/components/dashboard/settings/integrations/BulkSyncRow.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";

/**
 * The first-time sync: pulling Pipedrive's persons in, and sending RateUp's existing
 * contacts (and, with deals on, Leads board leads) out. Both run in the background
 * and only add and link; each shows how its latest run went.
 */
export function PipedriveBulkSync({
  runs,
}: Readonly<{ runs: Record<PipedriveBulkKind, PipedriveBulkRun | null> }>) {
  const { t } = useTranslation();
  const startImport = useStartPipedriveBulk("import");
  const startExport = useStartPipedriveBulk("export");

  return (
    <IntegrationFormCard
      title={t("First-time sync")}
      description={t(
        "For records from before Pipedrive was connected. Nothing already linked is changed, so running either again is safe.",
      )}
    >
      <div className="flex flex-col gap-3">
        <BulkSyncRow
          run={runs.import}
          start={startImport}
          icon={<IconCloudDownload data-icon="inline-start" />}
          title={t("Import persons from Pipedrive")}
          description={t(
            "Persons created in Pipedrive with a phone number, including its country code, become RateUp contacts. A number or email RateUp already has is linked, not duplicated.",
          )}
          action={t("Import")}
        />
        <BulkSyncRow
          run={runs.export}
          start={startExport}
          icon={<IconCloudUpload data-icon="inline-start" />}
          title={t("Send existing contacts to Pipedrive")}
          description={t(
            "RateUp contacts with an email or phone number are linked to the Pipedrive person they match, or created there. With deals on, leads in mapped, Won and Lost columns are sent as deals.",
          )}
          action={t("Send")}
        />
      </div>
    </IntegrationFormCard>
  );
}
