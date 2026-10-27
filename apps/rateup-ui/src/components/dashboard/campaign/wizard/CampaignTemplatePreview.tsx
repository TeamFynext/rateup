import { IconBadge, IconChevronLeft, IconDotsVertical } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PhonePreviewButton, usePhonePreview } from "@/components/ui/phone-preview.tsx";
import { WaTemplateMessage } from "@/components/whatsapp/wa-template-bubble.tsx";
import type { WaTemplateFetchBody } from "@/types/global";

import { CampaignWizardHeaderAction } from "./CampaignWizardShell.tsx";

function componentOfType(template: WaTemplateFetchBody, type: string) {
  return template.components?.find((c) => c.type?.toUpperCase() === type);
}

/**
 * The Template step's Preview button: opens the template in the device preview panel, and
 * opens it on arrival. The panel belongs to the step, so it closes when the step is left —
 * otherwise it would keep showing the template over the Audience or Schedule step.
 */
export function CampaignPreviewButton(props: Readonly<CampaignPreviewScreenProps>) {
  const { closePreview } = usePhonePreview();
  useEffect(() => closePreview, [closePreview]);

  return (
    <CampaignWizardHeaderAction>
      <PhonePreviewButton platform="whatsapp" defaultOpen>
        <CampaignPreviewScreen {...props} />
      </PhonePreviewButton>
    </CampaignWizardHeaderAction>
  );
}

interface CampaignPreviewScreenProps {
  template: WaTemplateFetchBody | null | undefined;
  businessName?: string;
  /** Resolved variable values, keyed by placeholder number. */
  sampleValues?: Record<string, string>;
}

/**
 * A template as the recipient will see it: WhatsApp's chat screen, drawn inside the device
 * preview's phone.
 *
 * Send-agnostic, unlike `WaInboxTemplatePreviewNew`, which takes a send mutation
 * and reads the selected phone id from a store — neither of which exists while a
 * campaign is being composed.
 *
 * The chat chrome uses WhatsApp's own colours rather than the app palette, and
 * is fixed in both themes: this is a picture of another product, and it does not
 * change when the dashboard around it does.
 */
function CampaignPreviewScreen({
  template,
  businessName,
  sampleValues = {},
}: Readonly<CampaignPreviewScreenProps>) {
  const { t } = useTranslation("campaign.wizard");
  const initials = (businessName ?? "RU").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#efeae2]">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[#E4E7EC] bg-white px-3">
        <IconChevronLeft className="size-4.5 text-[#1B2027]" aria-hidden />
        <span className="font-display flex size-8 items-center justify-center rounded-full bg-[#25D366] text-xs font-bold text-white">
          {initials}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1 text-[13px] font-semibold text-[#1B2027]">
            <span className="truncate">{businessName ?? t("Your business")}</span>
            <IconBadge className="size-3.5 shrink-0 text-[#25D366]" aria-hidden />
          </span>
          <span className="text-[10.5px] text-[#6B7480]">{t("Business account")}</span>
        </div>
        <IconDotsVertical className="size-4 text-[#434A55]" aria-hidden />
      </div>

      {template ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2.5 py-3">
          <span className="self-center rounded-md bg-white px-2 py-0.5 text-[11px] text-[#54656f] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
            {t("Today")}
          </span>
          <WaTemplateBubble template={template} sampleValues={sampleValues} />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-8 text-center text-[13px] text-[#6B7480]">
          {t("Pick a template to see how it will look.")}
        </div>
      )}
    </div>
  );
}

/** One template message as WhatsApp draws it, variables filled from `sampleValues`. */
export function WaTemplateBubble({
  template,
  sampleValues = {},
}: Readonly<{
  template: WaTemplateFetchBody;
  sampleValues?: Record<string, string>;
}>) {
  const header = componentOfType(template, "HEADER");
  const body = componentOfType(template, "BODY");
  const footer = componentOfType(template, "FOOTER");
  const buttons = componentOfType(template, "BUTTONS")?.buttons ?? [];

  return (
    <WaTemplateMessage
      // A fixed width: callers place it in a shrink-wrapped column.
      className="w-64"
      header={
        header?.format
          ? {
              format: header.format,
              text: header.text,
              media: header.example?.header_handle?.[0] ?? null,
            }
          : null
      }
      body={body?.text}
      footer={footer?.text}
      buttons={buttons}
      samples={sampleValues}
    />
  );
}
