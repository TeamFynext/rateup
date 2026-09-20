import {
  IconBadge,
  IconChecks,
  IconChevronLeft,
  IconDotsVertical,
  IconExternalLink,
  IconPhoto,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { WaTemplateFetchBody } from "@/types/global";

/** The body text with `{n}` swapped for what each variable resolves to. */
function fillPlaceholders(text: string, sample: Record<string, string>): string {
  return text.replace(/{{(\d+)}}/g, (match, index: string) => sample[index] ?? match);
}

function componentOfType(template: WaTemplateFetchBody, type: string) {
  return template.components?.find((c) => c.type?.toUpperCase() === type);
}

/**
 * A template rendered inside a phone, as the recipient will see it.
 *
 * Send-agnostic, unlike `WaInboxTemplatePreviewNew`, which takes a send mutation
 * and reads the selected phone id from a store — neither of which exists while a
 * campaign is being composed. Campaign creation has never had a preview at all;
 * a template was picked from a dropdown by name, and whether the header was an
 * image or the buttons were right was discovered after sending.
 *
 * The chat chrome uses WhatsApp's own colours rather than the app palette, and
 * is fixed in both themes: this is a picture of another product, and it does not
 * change when the dashboard around it does.
 */
export function CampaignTemplatePreview({
  template,
  businessName,
  contactName,
  sampleValues = {},
}: Readonly<{
  template: WaTemplateFetchBody | null | undefined;
  businessName?: string;
  contactName?: string;
  /** Resolved variable values, keyed by placeholder number. */
  sampleValues?: Record<string, string>;
}>) {
  const { t } = useTranslation("campaign.wizard");

  if (!template) {
    return (
      <div className="bg-muted ring-foreground/10 flex flex-col items-center gap-2.5 rounded-xl p-4 ring-1">
        <span className="text-muted-foreground w-full text-xs font-medium">
          {t("Live preview")}
        </span>
        <div className="border-border text-muted-foreground flex h-140 w-75 items-center justify-center rounded-[22px] border border-dashed px-8 text-center text-[13px]">
          {t("Pick a template to see how it will look.")}
        </div>
      </div>
    );
  }

  const header = componentOfType(template, "HEADER");
  const body = componentOfType(template, "BODY");
  const footer = componentOfType(template, "FOOTER");
  const buttons = componentOfType(template, "BUTTONS")?.buttons ?? [];
  const initials = (businessName ?? "RU").slice(0, 2).toUpperCase();

  return (
    <div className="bg-muted ring-foreground/10 flex flex-col items-center gap-2.5 rounded-xl p-4 ring-1">
      <span className="text-muted-foreground w-full text-xs font-medium">
        {contactName
          ? t("Live preview · as {name} will see it", { name: contactName })
          : t("Live preview")}
      </span>

      {/* The handset. A fixed 300×560 frame, because the point of the preview is
          that it is the shape the message actually arrives in. */}
      <div className="flex h-140 w-75 flex-col rounded-[22px] bg-[#1B2027] p-2 shadow-md">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-[#F7F8FA]">
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

          <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2.5 py-3">
            <span className="self-center rounded-md bg-white px-2 py-0.5 text-[10px] text-[#6B7480] shadow-sm">
              {t("Today")}
            </span>

            <div className="flex w-62.5 flex-col overflow-hidden rounded-[10px] bg-white shadow-sm">
              {header?.format && header.format !== "TEXT" ? (
                <span className="m-1 flex h-26 flex-col items-center justify-center gap-1 rounded-lg bg-[#FEECCB] text-[#AE5D07]">
                  <IconPhoto className="size-5" aria-hidden />
                  <span className="text-[10px] font-medium">{header.format}</span>
                </span>
              ) : null}

              {header?.format === "TEXT" && header.text ? (
                <div className="px-2.5 pt-1.5 text-[12.5px] font-semibold text-[#1B2027]">
                  {fillPlaceholders(header.text, sampleValues)}
                </div>
              ) : null}

              {body?.text ? (
                <div className="px-2.5 pt-1.5 pb-1 text-[12.5px] leading-snug whitespace-pre-line text-[#1B2027]">
                  {fillPlaceholders(body.text, sampleValues)}
                </div>
              ) : null}

              {footer?.text ? (
                <div className="px-2.5 pb-1 text-[11px] text-[#6B7480]">{footer.text}</div>
              ) : null}

              <div className="flex items-center justify-end gap-1 px-2 pb-1.5">
                <span className="text-[10px] text-[#6B7480]">
                  {new Date().toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <IconChecks className="size-3.5 text-[#53BDEB]" aria-hidden />
              </div>

              {buttons.map((button, index) => (
                <div
                  key={`${button.type}-${index}`}
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 border-t border-[#E4E7EC] text-[13px] font-medium text-[#027EB5]",
                  )}
                >
                  <IconExternalLink className="size-3.5" aria-hidden />
                  {button.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
