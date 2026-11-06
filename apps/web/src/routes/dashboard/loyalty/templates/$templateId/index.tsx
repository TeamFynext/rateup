import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
  loyaltyMessageCatalog,
  loyaltyStarterValues,
  starterByTemplateName,
} from "@/components/dashboard/loyalty/messages/loyaltyMessageCatalog.ts";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { WhatsappTemplateById } from "@/components/whatsapp/templates/WhatsappTemplateById.tsx";
import { TemplateType } from "@/types/enums.ts";
import { optionalString } from "@/utils/search.ts";

// `?starter=loyalty_points_issued` on `/create` opens the editor already filled in with
// that message's starter. It carries the catalog's template name rather than the message
// itself, so the link stays short and the words stay in one place.
export const Route = createFileRoute("/dashboard/loyalty/templates/$templateId/")({
  validateSearch: (search: Record<string, unknown>): { starter?: string } => ({
    starter: optionalString(search.starter),
  }),
  component: LoyaltyTemplateEditPage,
});

function LoyaltyTemplateEditPage() {
  const { t } = useTranslation();
  const { starter } = Route.useSearch();
  // A name the catalog no longer has just opens a blank editor — an old link is not worth
  // an error page here.
  const definition = starterByTemplateName(loyaltyMessageCatalog(t), starter);

  // Always a LOYALTY template here, and saving lands back on Messages › Templates — the
  // library this editor belongs to, whether the reader arrived from there or from a card.
  return (
    <WhatsappTemplateById
      forceTemplateType={TemplateType.LOYALTY}
      backTo={{ to: LOYALTY_PATHS.messages, search: { tab: "templates" } }}
      initialValues={definition ? loyaltyStarterValues(definition) : undefined}
    />
  );
}
