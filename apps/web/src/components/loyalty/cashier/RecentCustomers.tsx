import { IconClock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";

import type { RecentCustomer } from "./recentCustomers.ts";

/** Most counter traffic is regulars, so the fastest path is a tap, not typing. */
export function RecentCustomers({
  recent,
  pointsName,
  onPick,
}: Readonly<{
  recent: RecentCustomer[];
  pointsName: string;
  onPick: (customer: RecentCustomer) => void;
}>) {
  const { t } = useTranslation();
  if (recent.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <IconClock size={14} />
        {t("Recent")}
      </p>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {recent.map((customer) => (
          <li key={customer.id}>
            <button
              type="button"
              onClick={() => onPick(customer)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {customer.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {customer.tierName ? `${customer.tierName} · ` : ""}
                  {customer.points.toLocaleString()} {pointsName}
                </span>
              </span>
              {customer.pendingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
                >
                  {t("{count} waiting", { count: customer.pendingCount })}
                </Badge>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t("Tap a name to serve them again.")}</p>
    </div>
  );
}
