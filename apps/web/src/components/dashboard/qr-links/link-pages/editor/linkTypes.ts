import { IconBrandWhatsapp, IconClipboardList, IconWorld } from "@tabler/icons-react";
import type { TFunction } from "i18next";

import type { LinktreeSurveyOption } from "@/backend/linktree/linktree.api.ts";

/** The `linkType` path segment rateup-api's linkTypeDropdownOptions endpoint takes. */
export type SurveyLinkType = "web-survey" | "whatsapp-survey";
export type LinkKind = SurveyLinkType | "custom-link";

export function linkKinds(t: TFunction) {
  return [
    {
      kind: "web-survey",
      icon: IconClipboardList,
      label: t("Web survey"),
      hint: t("Opens one of your web surveys."),
    },
    {
      kind: "whatsapp-survey",
      icon: IconBrandWhatsapp,
      label: t("WhatsApp survey"),
      hint: t("Starts one of your WhatsApp surveys in a chat."),
    },
    {
      kind: "custom-link",
      icon: IconWorld,
      label: t("Any web address"),
      hint: t("Your menu, website, booking page or social profile."),
    },
  ] as const;
}

/**
 * A team's copy of a survey has a short id, served under /ws or /was. An older copy only has
 * its row id, and those are served by the public survey route.
 */
export function surveyLinkUrl(kind: SurveyLinkType, team: LinktreeSurveyOption["teams"][number]) {
  const base = import.meta.env.VITE_FRONTEND_URL;
  if (!team.shortUrlId) return `${base}/public/survey/${team.id}`;
  return `${base}/${kind === "web-survey" ? "ws" : "was"}/${team.shortUrlId}`;
}
