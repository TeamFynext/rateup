import { IconCheck, IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";

/**
 * Where a message stands, in the merchant's words rather than Meta's enum — the one
 * badge every loyalty surface (Messages, the template library, the Program page) uses,
 * so "Awaiting Meta" means the same thing everywhere.
 */
export type TemplateStatusTone = "live" | "pending" | "rejected" | "draft" | "missing" | "off";

export interface TemplateStatusInput {
  /** Meta's `data.status` on the template, when there is one. */
  status?: string | null;
  hasTemplate: boolean;
  /** The trigger's switch; `undefined` where there is no switch (the library). */
  enabled?: boolean;
}

export function templateStatusTone({
  status,
  hasTemplate,
  enabled,
}: TemplateStatusInput): TemplateStatusTone {
  if (!hasTemplate) return "missing";
  if (enabled === false) return "off";
  switch (status) {
    case "APPROVED":
      return "live";
    case "REJECTED":
      return "rejected";
    case "DRAFT":
      return "draft";
    default:
      return "pending";
  }
}

export function LoyaltyTemplateStatusBadge({
  status,
  hasTemplate = true,
  enabled,
  /** When the template was submitted; adds "· N days" to a pending badge. */
  pendingSince,
}: Readonly<Partial<TemplateStatusInput> & { pendingSince?: string | Date | null }>) {
  const { t } = useTranslation();
  const tone = templateStatusTone({ status, hasTemplate, enabled });

  switch (tone) {
    case "live":
      return (
        <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
          <IconCheck size={12} /> {t("Approved")}
        </Badge>
      );
    case "rejected":
      return <Badge variant="destructive">{t("Rejected by Meta")}</Badge>;
    case "draft":
      return <Badge variant="outline">{t("Draft — not submitted")}</Badge>;
    case "missing":
      return <Badge variant="outline">{t("Not written")}</Badge>;
    case "off":
      return <Badge variant="outline">{t("Off")}</Badge>;
    default: {
      const days = pendingSince ? dayjs().diff(dayjs(pendingSince), "day") : 0;
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
        >
          <IconClock size={12} />
          {""}
          {days > 0 ? t("Awaiting Meta · {days} days", { days }) : t("Awaiting Meta")}
        </Badge>
      );
    }
  }
}
