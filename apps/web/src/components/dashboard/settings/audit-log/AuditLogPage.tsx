import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeading } from "@/components/common/page-heading.tsx";
import { AuditLogs } from "@/components/dashboard/analytics/logs/audit-log/AuditLogs.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { presetRange } from "@/components/whatsapp/inbox/analytics/dateRangePresets.ts";
import DateRangeSelector from "@/components/whatsapp/inbox/analytics/DateRangeSelector.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import type { AnalyticsDateRange } from "@/types/api.ts";

/** Settings → Audit log: what your team created, changed or deleted. Moved here from Analytics. */
export function AuditLogPage() {
  const { t } = useTranslation();
  const canRead = useCan("org.audit.read");
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(() => ({
    key: "last7days",
    range: presetRange("last7days"),
  }));

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <PageHeading
        title={t("Audit log")}
        description={t("Who on your team created, changed or deleted what, and when.")}
        actions={canRead ? <DateRangeSelector value={dateRange} onChange={setDateRange} /> : null}
      />
      {canRead ? (
        <AuditLogs dateRange={dateRange} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("You can't see the audit log")}</EmptyTitle>
            <EmptyDescription>
              {t("Ask an admin to give your role access to the audit log.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
