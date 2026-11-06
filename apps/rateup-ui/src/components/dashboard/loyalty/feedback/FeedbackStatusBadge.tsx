import { IconCheck, IconClock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";

import type { FeedbackTone } from "./feedbackStatus.ts";

/**
 * The feedback flow's standing, in the same vocabulary as the loyalty template badge so
 * "Awaiting Meta" reads the same on every loyalty screen.
 */
export function FeedbackStatusBadge({ tone }: Readonly<{ tone: FeedbackTone }>) {
  const { t } = useTranslation();

  switch (tone) {
    case "live":
      return (
        <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
          <IconCheck size={12} /> {t("Live")}
        </Badge>
      );
    case "off":
      return <Badge variant="outline">{t("Off")}</Badge>;
    case "draft":
      return <Badge variant="outline">{t("Draft — not submitted")}</Badge>;
    case "rejected":
      return <Badge variant="destructive">{t("Rejected by Meta")}</Badge>;
    case "blocked":
      return <Badge variant="destructive">{t("Blocked by Meta")}</Badge>;
    case "missing":
      return <Badge variant="outline">{t("Not set up")}</Badge>;
    default:
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
        >
          <IconClock size={12} /> {t("Awaiting Meta")}
        </Badge>
      );
  }
}
