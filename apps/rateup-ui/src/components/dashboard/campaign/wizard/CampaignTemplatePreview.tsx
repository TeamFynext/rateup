import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PhonePreviewButton, usePhonePreview } from "@/components/ui/phone-preview.tsx";
import { WaTemplateMessage } from "@/components/whatsapp/wa-template-bubble.tsx";
import { WaDateChip, WhatsAppChatShell } from "@/components/whatsapp/whatsapp-preview-shell.tsx";
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

  return (
    <WhatsAppChatShell contactName={businessName} subtitle={t("Business account")}>
      {template ? (
        <>
          <WaDateChip>{t("Today")}</WaDateChip>
          {/* Fits the phone screen, less the bubble's own left margin for its tail. */}
          <WaTemplateBubble
            template={template}
            sampleValues={sampleValues}
            className="mt-1 w-[calc(100%-0.5rem)] max-w-64"
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-8 text-center text-[13px] text-[#667781] dark:text-[#8696a0]">
          {t("Pick a template to see how it will look.")}
        </div>
      )}
    </WhatsAppChatShell>
  );
}

/** One template message as WhatsApp draws it, variables filled from `sampleValues`. */
export function WaTemplateBubble({
  template,
  sampleValues = {},
  className = "w-64",
}: Readonly<{
  template: WaTemplateFetchBody;
  sampleValues?: Record<string, string>;
  className?: string;
}>) {
  const header = componentOfType(template, "HEADER");
  const body = componentOfType(template, "BODY");
  const footer = componentOfType(template, "FOOTER");
  const buttons = componentOfType(template, "BUTTONS")?.buttons ?? [];

  return (
    <WaTemplateMessage
      // A fixed width by default: callers place it in a shrink-wrapped column.
      className={className}
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
