import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";

import type { ProgramState } from "./programState.ts";

export function ProgramStatusBadge({ state }: Readonly<{ state: ProgramState }>) {
  const { t } = useTranslation();
  if (state === "live") {
    return (
      <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
        {t("Live")}
      </Badge>
    );
  }
  if (state === "paused") {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
      >
        {t("Paused")}
      </Badge>
    );
  }
  return <Badge variant="secondary">{t("Draft")}</Badge>;
}
